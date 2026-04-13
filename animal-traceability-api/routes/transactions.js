const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const { Gateway, Wallets } = require("fabric-network"); // Added import
const path = require("path");
const fs = require("fs");

router.post("/", async (req, res) => {
  try {
    const { username, mspId } = req.body;

    // 1. GENERATE SMART BATCH ID
    // Format: [USER 3 CHARS]-[DATE YYYYMMDD]-[RANDOM 4 DIGITS]
    // Example: JUA-20260216-4821
    const userTag = (username || "UNK").substring(0, 3).toUpperCase();
    const dateTag = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const randomTag = Math.floor(1000 + Math.random() * 9000);
    const generatedBatchId = `${userTag}-${dateTag}-${randomTag}`;

    // 2. Create the Transaction Object with the new Batch ID
    const txData = {
        ...req.body,
        batchId: generatedBatchId // <--- Injecting the ID here
    };

    const tx = new Transaction(txData);
    const savedTx = await tx.save();

    // 3. Connect to Blockchain
    const { contract, gateway } = await getContract(username, mspId);
    
    console.log(`Submitting RegisterAnimal for ${savedTx.batchId}...`);

    await contract.submitTransaction(
      "RegisterAnimal",
      savedTx.batchId,         // <--- Readable ID on Blockchain
      JSON.stringify(savedTx) 
    );

    await gateway.disconnect();
    res.status(201).json(savedTx);
  } catch (err) {
    console.error("Blockchain Submission Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Add this helper to invoke the chaincode
async function submitToBlockchain(user, mspId, txId, txData) {
    const gateway = new Gateway();
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Map to connection profile
        const ccpPath = path.resolve(__dirname, '..', 'config', `connection-${mspId.toLowerCase()}.json`);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        await gateway.connect(ccp, {
            wallet, identity: user, discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('traceability-channel'); // From start_network.sh
        const contract = network.getContract('animal-traceability');

        await contract.submitTransaction('RegisterAnimal', txId, JSON.stringify(txData));
    } finally {
        gateway.disconnect();
    }
}

async function getContract(username, mspId) {
    const gateway = new Gateway();
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Dynamic pathing: FarmerMSP -> farmer -> connection-farmer.json
    const orgRole = mspId.toLowerCase().replace("msp", "");
    const connectionProfilePath = path.resolve(__dirname, "..", "config", `connection-${orgRole}.json`);

    if (!fs.existsSync(connectionProfilePath)) {
        throw new Error(`Connection profile not found at ${connectionProfilePath}`);
    }

    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, "utf8"));

    // Connect using Discovery
    await gateway.connect(connectionProfile, {
        wallet,
        identity: username,
        discovery: { enabled: true, asLocalhost: true } 
    });

    const network = await gateway.getNetwork("traceability-channel");
    const contract = network.getContract("animal-traceability");

    // CRITICAL: We MUST return these so the route can use them
    return { contract, gateway };
}

// Get transactions for a specific user
router.get("/:username", async (req, res) => {
  const data = await Transaction.find({ username: req.params.username });
  // console.log("Database results for user:", data); // Check your terminal!
  res.json(data);
});

// GET all transactions (ADMIN)
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all animals from blockchain (Regulator Only)
router.get("/ledger/all", async (req, res) => {
  try {
    const { username, mspId } = req.query;

    if (!username || !mspId) {
      return res.status(400).json({ error: "username and mspId are required" });
    }

    // Ensure only RegulatorMSP can access
    if (mspId !== "RegulatorMSP") {
      return res.status(403).json({ 
        error: "Access Denied: Only RegulatorMSP can view the global ledger" 
      });
    }

    const { contract, gateway } = await getContract(username, mspId);
    const result = await contract.evaluateTransaction("GetAllAnimals");
    
    await gateway.disconnect();
    
    const animals = JSON.parse(result.toString());
    res.json(animals);
  } catch (err) {
    console.error("GetAllAnimals Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// animal-traceability-api/routes/transactions.js

// GET /api/transactions/history/:id (The Audit Trail Endpoint with Lineage)
router.get("/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, mspId } = req.query;

    const { contract, gateway } = await getContract(username, mspId);
    
    // 1. Get the history of the requested (Child) batch
    const childHistoryBytes = await contract.evaluateTransaction('GetHistory', id);
    let fullHistory = JSON.parse(childHistoryBytes.toString());

    // 2. Check if this batch has a Parent
    if (fullHistory.length > 0) {
      const oldestChildRecord = fullHistory[fullHistory.length - 1]; // Oldest is at the end
      const parentId = oldestChildRecord.data.parentBatchId || fullHistory[0].data.parentBatchId;

      if (parentId && parentId !== "NONE") {
        // 3. Fetch the Parent's history
        const parentHistoryBytes = await contract.evaluateTransaction('GetHistory', parentId);
        const parentHistory = JSON.parse(parentHistoryBytes.toString());

        // We need the exact millisecond the split happened to establish our boundary
        const splitTimestamp = new Date(oldestChildRecord.data.timestamp).getTime();

        // Create a Set of Child Transaction IDs to prevent exact duplicates
        const childTxIds = new Set(fullHistory.map(tx => tx.txId));

        // 4. Filter the parent history using BOTH Time Boundary and Deduplication
        const relevantParentHistory = parentHistory.filter(item => {
           const itemTime = new Date(item.data.timestamp).getTime();
           
           // CONDITION A: The parent event must have happened BEFORE or AT the split time.
           // (This blocks future parent updates from bleeding into the child's timeline).
           const isBeforeOrAtSplit = itemTime <= splitTimestamp;

           // CONDITION B: Exclude if the child already has this exact transaction (The Split Event).
           const isNotDuplicate = !childTxIds.has(item.txId);

           return isBeforeOrAtSplit && isNotDuplicate;
        }).map(item => {
           return { ...item, isInherited: true };
        });

        // 5. Combine them
        fullHistory = [...relevantParentHistory, ...fullHistory];
      }
    }

    await gateway.disconnect();
    res.json(fullHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update transaction status, diagnosed disease, and severity
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, diagnosedDisease, severity, username, mspId } = req.body;

    // 1. Update MongoDB
    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    // 2. DETERMINE THE BLOCKCHAIN KEY
    const blockchainKey = transaction.batchId || transaction._id.toString();
    console.log(`Submitting Vet Diagnosis for ${blockchainKey}...`);

    if (status) transaction.status = status;
    if (diagnosedDisease) transaction.diagnosedDisease = diagnosedDisease;
    if (severity) transaction.severity = severity;

    // 2. Update Blockchain
    const { contract, gateway } = await getContract(username, mspId);

    if (mspId === 'VetMSP') {
        console.log(`Submitting Vet Diagnosis for ${id}...`);
        await contract.submitTransaction(
            "UpdateDiagnosis",
            blockchainKey,
            status || transaction.status,
            diagnosedDisease || "",
            severity || "Ongoing",
            ""
        );
    } else {
        // Fallback or Error if a non-Vet tries to diagnose
        throw new Error("Only Veterinarians can diagnose animals.");
    }

    await gateway.disconnect();
    
    const updatedTx = await transaction.save();
    // 4. THE ML DATA COLLECTION PIPELINE 
    try {
        // (Safe = 0, Dangerous = 1)
        if (severity === "safe" || severity === "dangerous") {
            const label = severity === "dangerous" ? 1 : 0;

            // Step A: Calculate current farm features (X)
            const farmAnimals = await Transaction.find({ username: transaction.username });
            const totalPop = farmAnimals.reduce((acc, tx) => acc + Number(tx.quantity || 0), 0);
            
            let sCount = 0, mCount = 0, dCount = 0;
            farmAnimals.forEach(tx => {
                if (tx.severity === "safe") sCount++;
                else if (tx.severity === "mild") mCount++;
                else if (tx.severity === "dangerous") dCount++;
            });

            const totalDiagnosed = sCount + mCount + dCount;
            
            if (totalDiagnosed > 0) {
                const sR = sCount / totalDiagnosed;
                const mR = mCount / totalDiagnosed;
                const dR = dCount / totalDiagnosed;
                const pF = Math.min(totalPop / 500, 2);
                
                // Step B: Connect directly to the ML_Training_Data collection
                const mongoose = require("mongoose");
                const mlCollection = mongoose.connection.collection("ML_Training_Data");
                
                // Step C: Save the Training Snapshot
                await mlCollection.insertOne({
                    farmUsername: transaction.username,
                    timestamp: new Date(),
                    features: { safeRatio: sR, mildRatio: mR, dangerousRatio: dR, populationFactor: pF, logsFactor: 1.0 },
                    label: label
                });
                
                console.log(`[ML Pipeline] Captured Training Snapshot. Target Label: ${label}`);

                // Step D: THE AUTOMATED TRAINING TRIGGER
                const recordCount = await mlCollection.countDocuments();
                console.log(`[ML Pipeline] Current Dataset Size: ${recordCount}`);

                // Trigger training at 50 records, and every 10 records after that (60, 70, 80...)
                if (recordCount >= 50 && recordCount % 10 === 0) {
                    console.log(`[ML Pipeline] Threshold met (${recordCount}). Triggering background model retraining...`);
                    
                    const { spawn } = require('child_process');
                    const pythonExecutable = path.join(__dirname, '..', 'venv', 'bin', 'python3');
                    const scriptPath = path.join(__dirname, '..', 'ml_models', 'train_real.py');
                    const mongoURI = process.env.MONGO_URI; // Pass cloud connection to Python
                    
                    // Spawn asynchronously
                    const trainProcess = spawn(pythonExecutable, [scriptPath, mongoURI]);
                    
                    trainProcess.stdout.on('data', (data) => console.log(`[Auto-Train]: ${data.toString().trim()}`));
                    trainProcess.stderr.on('data', (data) => console.error(`[Auto-Train Error]: ${data.toString().trim()}`));
                }
            }
        }
    } catch (mlError) {
        console.error("[ML Pipeline Error] Failed to process pipeline:", mlError.message);
    }
    res.json(updatedTx);

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
