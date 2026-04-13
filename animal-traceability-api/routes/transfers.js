const express = require("express");
const router = express.Router();
const multer = require("multer");
const TransferRequest = require("../models/TransferRequest");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");

// ==========================================
// MULTER CONFIGURATION FOR TRANSFER PROOFS
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), "uploads", "transfer-proofs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "transfer-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

async function getContract(username, mspId) {
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const orgRole = mspId.toLowerCase().replace("msp", "");
    const ccpPath = path.resolve(__dirname, "..", "config", `connection-${orgRole}.json`);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });
    const network = await gateway.getNetwork("traceability-channel");
    const contract = network.getContract("animal-traceability");
    return { contract, gateway };
}

// =========================================================
// 1. GET PENDING REQUESTS (Internal/Movement)
// =========================================================
router.get("/pending", async (req, res) => {
    try {
        const requests = await TransferRequest.find({ status: "Pending Vet Review" }).sort({ createdAt: 1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 7. GET PENDING EXIT REQUESTS
// =========================================================
router.get("/pending-exit", async (req, res) => {
    try {
        const requests = await TransferRequest.find({ 
            status: "Pending Regulator Verification" 
        }).sort({ updatedAt: 1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 3. GET REQUESTS BY USER
// =========================================================
router.get("/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const requests = await TransferRequest.find({
            $or: [{ farmerUsername: username }, { receiverUsername: username }, { vetUsername: username }]
        }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 2. CREATE TRANSFER REQUEST (Farmer)
// =========================================================
router.post("/request", async (req, res) => {
  try {
    const { batchId, farmerUsername, destinationType, receiverUsername, receiverDetails, purpose, transportDate, transferQuantity } = req.body;

    const animal = await Transaction.findOne({ batchId });
    if (!animal) return res.status(404).json({ error: "Animal not found" });
    
    // --- BYPASS HEALTH CHECK IF CULLING ---
    if (destinationType !== 'Cull' && animal.severity !== 'safe') {
        return res.status(400).json({ error: "Cannot transport! Animal is not verified 'Safe'." });
    }

    const qtyToTransfer = parseInt(transferQuantity);
    if (qtyToTransfer <= 0 || qtyToTransfer > animal.quantity) {
        return res.status(400).json({ error: `Invalid quantity. Must be between 1 and ${animal.quantity}.` });
    }

    const existingRequest = await TransferRequest.findOne({ 
        batchId: batchId,
        status: { $in: ["Pending Vet Review", "Approved (VHC Issued)", "In Transit", "Pending Regulator Verification"] } 
    });

    if (existingRequest) return res.status(400).json({ error: "This animal already has an active transport request!" });

    if (destinationType === "Internal") {
        const validReceiver = await User.findOne({ username: receiverUsername });
        if (!validReceiver) return res.status(400).json({ error: "Receiver Username does not exist in our system." });
        if (validReceiver.username === farmerUsername) return res.status(400).json({ error: "You cannot transfer assets to yourself." });
    }

    const newRequest = new TransferRequest({
        batchId, 
        farmerUsername, 
        destinationType, 
        receiverUsername, 
        receiverDetails, 
        purpose, 
        transportDate, 
        transferQuantity: qtyToTransfer, 
        status: destinationType === "Cull" ? "Pending Regulator Verification" : "Pending Vet Review" // Culls skip vet review since vet ordered it
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// 2B. NEW: FAST-TRACK CULL UPLOAD (Farmer)
// =========================================================
router.post("/submit-cull", upload.single("proofFile"), async (req, res) => {
    try {
        const { batchId, farmerUsername, transferQuantity, disposalDate, disposalMethod } = req.body;

        const animal = await Transaction.findOne({ batchId });
        if (!animal) return res.status(404).json({ error: "Animal not found" });

        if (!req.file) return res.status(400).json({ error: "Proof of disposal file is required." });

        const backendUrl = `${req.protocol}://${req.get("host")}`;
        const finalProofUrl = `${backendUrl}/uploads/transfer-proofs/${req.file.filename}`;

        // Create the request and jump straight to Regulator Verification
        const newRequest = new TransferRequest({
            batchId, 
            farmerUsername, 
            destinationType: "Cull", 
            purpose: "Disposal", 
            transportDate: disposalDate, 
            transferQuantity: parseInt(transferQuantity),
            receiverDetails: { name: "Farm On-Site", address: disposalMethod }, // E.g., "Deep Burial"
            status: "Pending Regulator Verification",
            proofDocumentUrl: finalProofUrl
        });

        await newRequest.save();

        // Lock the animal in DB so it can't be touched until Regulator verifies
        animal.status = "Pending Cull Verification";
        await animal.save();

        res.status(201).json({ success: true, message: "Proof submitted. Pending Regulator Verification." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 4. VET APPROVE
// =========================================================
router.post("/vet-approve", async (req, res) => {
    try {
        const { requestId, userMsp, vetUsername, finalTransportDate } = req.body;
        const request = await TransferRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        request.status = "Approved (VHC Issued)";
        request.vetUsername = vetUsername;
        request.vhcToken = "VHC-" + Math.floor(100000 + Math.random() * 900000); 
        
        if (finalTransportDate) {
            request.transportDate = finalTransportDate;
        }
        
        await request.save();

        const animal = await Transaction.findOne({ batchId: request.batchId });
        if (animal) { animal.status = "Pending Transfer"; await animal.save(); }

        const { contract, gateway } = await getContract(vetUsername, "VetMSP");
        await contract.submitTransaction(
            "UpdateDiagnosis",
            request.batchId, "Pending Transfer", "", "safe",            
            request.receiverUsername || "External" 
        );
        await gateway.disconnect();

        res.json({ success: true, message: "VHC Issued & Transfer Authorized on Ledger." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================
// 5. RECEIVER CONFIRM (Handles Full & Fractional Transfers)
// =========================================================
router.post("/receiver-confirm", async (req, res) => {
    try {
        const { requestId, userMsp } = req.body; 
        const request = await TransferRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (request.status !== "Approved (VHC Issued)") return res.status(400).json({ error: "Transfer is not ready." });

        const animal = await Transaction.findOne({ batchId: request.batchId });
        if (!animal) return res.status(404).json({ error: "Original animal batch not found in DB" });

        let newOwnerUsername = request.receiverUsername;
        let newLocation = "";
        let newOwnerFullName = "Local Buyer";
        let newContactNumber = animal.contactNumber;

        const receiverUser = await User.findOne({ username: request.receiverUsername });
        if (receiverUser) {
            newOwnerFullName = `${receiverUser.firstName} ${receiverUser.lastName}`;
            newLocation = receiverUser.barangay || "Santa Rosa";
            newContactNumber = receiverUser.contactNumber;
            if (!newLocation.toLowerCase().startsWith("brgy") && !newLocation.toLowerCase().includes("city")) {
                newLocation = `Brgy ${newLocation}`;
            }
        } else { newLocation = "Santa Rosa (Internal)"; }

        const { contract, gateway } = await getContract(request.receiverUsername, "FarmerMSP"); 

        const isSplit = request.transferQuantity < animal.quantity;

        if (isSplit) {
            const childBatchId = `${request.batchId}-C${Date.now().toString().slice(-4)}`;

            await contract.submitTransaction(
                "SplitAndTransferAsset", 
                request.batchId, 
                childBatchId, 
                request.transferQuantity.toString(), 
                newOwnerUsername, 
                newLocation, 
                request.destinationType
            );

            animal.quantity = animal.quantity - request.transferQuantity;
            animal.status = "In Stock";
            await animal.save();

            const childAnimal = new Transaction({
                batchId: childBatchId,
                parentBatchId: request.batchId,
                username: newOwnerUsername,
                fullName: newOwnerFullName,
                contactNumber: newContactNumber,
                species: animal.species,
                quantity: request.transferQuantity,
                location: newLocation,
                healthStatus: animal.healthStatus,
                timestamp: new Date(),
                status: "In Stock",
                diagnosedDisease: animal.diagnosedDisease,
                severity: animal.severity,
                proofDocumentUrl: request.proofDocumentUrl
            });
            await childAnimal.save();

        } else {
            await contract.submitTransaction("TransferAsset", request.batchId, newOwnerUsername, newLocation, request.destinationType);
            
            animal.username = newOwnerUsername;
            animal.fullName = newOwnerFullName; 
            animal.location = newLocation;      
            animal.status = "In Stock";
            animal.proofDocumentUrl = request.proofDocumentUrl; 
            await animal.save();
        }

        await gateway.disconnect();

        request.status = "Completed";
        await request.save();

        res.json({ success: true, message: isSplit ? "Partial Batch Claimed Successfully!" : "Full Asset Claimed Successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 8. UPLOAD PROOF 
// =========================================================
router.post("/upload-proof", upload.single("proofFile"), async (req, res) => {
    try {
        const { requestId } = req.body; 
        const request = await TransferRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });
        if (!req.file) return res.status(400).json({ error: "No proof file uploaded." });

        const backendUrl = `${req.protocol}://${req.get("host")}`;
        const finalProofUrl = `${backendUrl}/uploads/transfer-proofs/${req.file.filename}`;

        request.proofDocumentUrl = finalProofUrl; 

        if (request.destinationType !== "Internal") {
            request.status = "Pending Regulator Verification";
            await request.save();
            return res.json({ success: true, message: "Proof uploaded. Sent to Regulator for verification." });
        } 
        
        await request.save();
        res.json({ success: true, message: "Proof of Delivery uploaded successfully! Awaiting receiver confirmation." });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 9. REGULATOR VERIFY EXIT (Handles Splits, Cull & Regulator Identity)
// =========================================================
router.post("/regulator-verify", async (req, res) => {
    try {
        const { requestId, regulatorUsername, decision, rejectionReason } = req.body;
        
        const request = await TransferRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (decision === "REJECT") {
            request.status = "Proof Rejected"; 
            request.rejectionReason = rejectionReason;
            await request.save();
            return res.json({ success: true, message: "Proof rejected. Farmer notified." });
        }

        const animal = await Transaction.findOne({ batchId: request.batchId });
        if (!animal) return res.status(404).json({ error: "Original animal batch not found in DB" });

        const { contract, gateway } = await getContract(regulatorUsername, "RegulatorMSP"); 

        console.log(`Regulator ${regulatorUsername} verifying exit for ${request.batchId}...`);
        
        // --- DYNAMIC EXIT MAPPING ---
        let finalStatus = 'Exported';
        let formattedLocation = `Exported to: ${request.receiverDetails?.address || 'Unknown'}`;
        let rawLocation = request.receiverDetails?.address || 'Unknown';

        if (request.destinationType === 'Slaughter') {
            finalStatus = 'Slaughtered';
            rawLocation = request.receiverDetails?.name || 'Unknown';
            formattedLocation = `Slaughterhouse: ${rawLocation}`;
        } else if (request.destinationType === 'Cull') {
            finalStatus = 'Culled';
            rawLocation = "Farm Disposal";
            formattedLocation = `Disposed: ${request.receiverDetails?.address || 'Farm'}`;
        }

        const isSplit = request.transferQuantity < animal.quantity;

        if (isSplit) {
            const childBatchId = `${request.batchId}-E${Date.now().toString().slice(-4)}`;

            await contract.submitTransaction(
                "SplitAndTransferAsset", 
                request.batchId, 
                childBatchId, 
                request.transferQuantity.toString(), 
                "EXIT", 
                rawLocation, 
                request.destinationType
            );

            animal.quantity = animal.quantity - request.transferQuantity;
            
            // Ensure the parent stays locked under the cull order if not fully disposed
            if (request.destinationType === 'Cull') {
                animal.status = "Cull Ordered";
            } else {
                animal.status = "In Stock";
            }
            await animal.save();

            const childAnimal = new Transaction({
                batchId: childBatchId,
                parentBatchId: request.batchId, 
                username: "EXIT",
                fullName: animal.fullName, 
                contactNumber: animal.contactNumber, 
                species: animal.species,
                quantity: request.transferQuantity,
                location: formattedLocation,
                healthStatus: animal.healthStatus,
                timestamp: new Date(),
                status: finalStatus,
                diagnosedDisease: animal.diagnosedDisease,
                severity: animal.severity,
                proofDocumentUrl: request.proofDocumentUrl
            });
            await childAnimal.save();

        } else {
            await contract.submitTransaction(
                "TransferAsset",
                request.batchId,
                "EXIT", 
                rawLocation,
                request.destinationType 
            );

            animal.status = finalStatus;
            animal.location = formattedLocation; 
            animal.username = "EXIT"; 
            animal.timestamp = new Date().toISOString();
            animal.proofDocumentUrl = request.proofDocumentUrl;
            await animal.save();
        }

        await gateway.disconnect();

        request.status = `Completed (${finalStatus})`;
        await request.save();

        res.json({ success: true, message: isSplit ? `Partial Exit Verified (${request.transferQuantity} heads).` : "Full Exit Verified." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 6. REJECT (Generic)
// =========================================================
router.post("/reject", async (req, res) => {
    try {
        const { requestId, reason } = req.body;
        const request = await TransferRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });
        
        request.status = "Rejected";
        request.rejectionReason = reason;
        await request.save();

        const animal = await Transaction.findOne({ batchId: request.batchId });
        if (animal) { animal.status = "Submitted to Vet"; await animal.save(); }

        res.json({ success: true, message: "Request Rejected" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;