/**
 * routes/passport.js
 * 
 * PUBLIC READ-ONLY ENDPOINT — Digital Animal Passport
 * 
 * Security Model:
 * - Uses a pre-enrolled admin-regulator identity from the wallet (RegulatorMSP)
 * - Only performs evaluateTransaction (read-only queries, no writes)
 * - Single-asset scoped — returns data for one batchId at a time
 * - Private key never leaves the server
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");

const Transaction = require("../models/Transaction");
const HealthRecord = require("../models/HealthRecord");

// --- SERVICE IDENTITY CONFIG ---
// This identity is used for read-only blockchain queries on behalf of public users.
// It uses the pre-enrolled admin-regulator wallet (RegulatorMSP).
const SERVICE_IDENTITY = "admin-regulator";
const SERVICE_MSP = "RegulatorMSP";

/**
 * Helper: Connect to Fabric using the service identity
 * Returns ONLY a read-only contract (evaluateTransaction only)
 */
async function getReadOnlyContract() {
  const gateway = new Gateway();
  const walletPath = path.join(process.cwd(), "wallet");
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // Verify the service identity exists
  const identity = await wallet.get(SERVICE_IDENTITY);
  if (!identity) {
    throw new Error(
      `Service identity "${SERVICE_IDENTITY}" not found in wallet. ` +
      `Please ensure admin-regulator is enrolled.`
    );
  }

  // Map MSP to connection profile
  const orgRole = SERVICE_MSP.toLowerCase().replace("msp", "");
  const connectionProfilePath = path.resolve(
    __dirname, "..", "config", `connection-${orgRole}.json`
  );

  if (!fs.existsSync(connectionProfilePath)) {
    throw new Error(`Connection profile not found at ${connectionProfilePath}`);
  }

  const connectionProfile = JSON.parse(
    fs.readFileSync(connectionProfilePath, "utf8")
  );

  await gateway.connect(connectionProfile, {
    wallet,
    identity: SERVICE_IDENTITY,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork("traceability-channel");
  const contract = network.getContract("animal-traceability");

  return { contract, gateway };
}

/**
 * GET /api/passport/:batchId
 * 
 * Returns a consolidated JSON with:
 *   - animal: The MongoDB transaction record
 *   - healthRecords: Medical logs (with parent-batch inheritance)
 *   - auditTrail: Full blockchain history (with parent lineage)
 */
router.get("/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    // ========================================
    // 1. FETCH ANIMAL RECORD FROM MONGODB
    // ========================================
    let query = mongoose.Types.ObjectId.isValid(batchId)
      ? { $or: [{ batchId }, { _id: batchId }] }
      : { batchId };

    const animal = await Transaction.findOne(query).lean();

    if (!animal) {
      return res.status(404).json({ 
        error: "Animal not found",
        message: `No animal record found for ID: ${batchId}` 
      });
    }

    const resolvedBatchId = animal.batchId || animal._id.toString();

    // ========================================
    // 2. FETCH HEALTH RECORDS FROM MONGODB
    //    (With parent-batch inheritance logic)
    // ========================================
    let searchBatches = [resolvedBatchId];
    if (animal.parentBatchId && animal.parentBatchId !== "NONE") {
      searchBatches.push(animal.parentBatchId);
    }

    const allHealthRecords = await HealthRecord.find({
      batchId: { $in: searchBatches },
    })
      .sort({ date: -1 })
      .lean();

    // Filter inherited records by split time
    const splitTime = new Date(animal.timestamp).getTime();
    const healthRecords = allHealthRecords
      .filter((record) => {
        if (record.batchId === animal.parentBatchId) {
          const recordTime = new Date(record.date).getTime();
          return recordTime <= splitTime;
        }
        return true;
      })
      .map((record) => ({
        ...record,
        isInherited: record.batchId !== resolvedBatchId,
      }));

    // ========================================
    // 3. FETCH BLOCKCHAIN AUDIT TRAIL
    //    (With parent lineage stitching)
    // ========================================
    let auditTrail = [];

    try {
      const { contract, gateway } = await getReadOnlyContract();

      try {
        // Get child history
        const childHistoryBytes = await contract.evaluateTransaction(
          "GetHistory", resolvedBatchId
        );
        let fullHistory = JSON.parse(childHistoryBytes.toString());

        // Check for parent lineage
        if (fullHistory.length > 0) {
          const oldestChildRecord = fullHistory[fullHistory.length - 1];
          const parentId =
            oldestChildRecord.data.parentBatchId ||
            fullHistory[0].data.parentBatchId;

          if (parentId && parentId !== "NONE") {
            const parentHistoryBytes = await contract.evaluateTransaction(
              "GetHistory", parentId
            );
            const parentHistory = JSON.parse(parentHistoryBytes.toString());

            const splitTimestamp = new Date(
              oldestChildRecord.data.timestamp
            ).getTime();
            const childTxIds = new Set(fullHistory.map((tx) => tx.txId));

            const relevantParentHistory = parentHistory
              .filter((item) => {
                const itemTime = new Date(item.data.timestamp).getTime();
                const isBeforeOrAtSplit = itemTime <= splitTimestamp;
                const isNotDuplicate = !childTxIds.has(item.txId);
                return isBeforeOrAtSplit && isNotDuplicate;
              })
              .map((item) => ({ ...item, isInherited: true }));

            fullHistory = [...relevantParentHistory, ...fullHistory];
          }
        }

        auditTrail = fullHistory;
      } finally {
        await gateway.disconnect();
      }
    } catch (blockchainError) {
      // If blockchain is down, we still return MongoDB data
      // The passport page will show a graceful "blockchain unavailable" message
      console.error(
        "[Passport] Blockchain read failed (non-fatal):",
        blockchainError.message
      );
      auditTrail = [];
    }

    // ========================================
    // 4. RETURN CONSOLIDATED PASSPORT DATA
    // ========================================
    res.json({
      animal: {
        batchId: resolvedBatchId,
        species: animal.species,
        quantity: animal.quantity,
        location: animal.location,
        healthStatus: animal.healthStatus,
        status: animal.status,
        severity: animal.severity,
        diagnosedDisease: animal.diagnosedDisease,
        fullName: animal.fullName,
        timestamp: animal.timestamp,
        parentBatchId: animal.parentBatchId,
      },
      healthRecords,
      auditTrail,
      meta: {
        generatedAt: new Date().toISOString(),
        source: "Santa Rosa City Laguna — Animal Disease Traceability System",
        blockchainNetwork: "Hyperledger Fabric",
        channel: "traceability-channel",
        chaincode: "animal-traceability",
      },
    });
  } catch (error) {
    console.error("[Passport] Error:", error);
    res.status(500).json({
      error: "Failed to generate passport",
      details: error.message,
    });
  }
});

module.exports = router;
