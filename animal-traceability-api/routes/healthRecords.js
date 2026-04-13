const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const HealthRecord = require("../models/HealthRecord");
const Transaction = require("../models/Transaction");

// ==========================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define where to store the files
    const dir = path.join(process.cwd(), "uploads", "medical-proofs");
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent overwriting
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "proof-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// 1. GET HEALTH LOGS (For Farmer/Admin/Vet View)
router.get("/:lookupId", async (req, res) => {
  try {
    const { lookupId } = req.params;
    let query = mongoose.Types.ObjectId.isValid(lookupId) 
        ? { $or: [{ batchId: lookupId }, { _id: lookupId }] }
        : { batchId: lookupId };
    
    const animal = await Transaction.findOne(query);

    if (!animal) {
      return res.status(404).json({ error: "Animal record not found" });
    }

    // Array of batch IDs to search
    let searchBatches = [animal.batchId];
    if (animal.parentBatchId && animal.parentBatchId !== "NONE") {
        searchBatches.push(animal.parentBatchId);
    }

    // Fetch records for ALL related batches
    const allRecords = await HealthRecord.find({ batchId: { $in: searchBatches } })
      .sort({ date: -1 })
      .lean(); 

    // The exact millisecond the child was separated from the parent
    const splitTime = new Date(animal.timestamp).getTime();

    // Filter and map the records
    const processedRecords = allRecords.filter(record => {
        // If the record belongs to the PARENT, only allow it if it happened BEFORE the split
        if (record.batchId === animal.parentBatchId) {
            const recordTime = new Date(record.date).getTime();
            return recordTime <= splitTime;
        }
        // If it belongs directly to the CHILD, always allow it
        return true;
    }).map(record => ({
        ...record,
        isInherited: record.batchId !== animal.batchId
    }));

    res.json(processedRecords);
  } catch (err) {
    console.error("Error fetching health records:", err);
    res.status(500).json({ error: "Server error fetching records" });
  }
});

// ==========================================
// 2. ADD HEALTH RECORD 
// ==========================================
router.post("/", upload.single("proofFile"), async (req, res) => {
  try {
    const { batchId, type, name, vetUsername, mspId, notes, nextDueDate, status } = req.body;

    // Security Check: Only Vets can add records
    if (mspId !== 'VetMSP') {
      return res.status(403).json({ error: "Access Denied: Only Veterinarians can add health records." });
    }

    // Process the uploaded file
    let finalProofUrl = null;
    if (req.file) {
      // Construct the public URL to be saved in the database
      // e.g., "http://localhost:3001/uploads/medical-proofs/proof-12345.png"
      const backendUrl = `${req.protocol}://${req.get("host")}`;
      finalProofUrl = `${backendUrl}/uploads/medical-proofs/${req.file.filename}`;
    }

    const newRecord = new HealthRecord({
      batchId,
      type,
      name,
      vetUsername,
      mspId,
      notes,
      nextDueDate: nextDueDate ? nextDueDate : undefined, // Ensure empty strings don't crash date parsing
      status: status || 'Valid',
      proofUrl: finalProofUrl // Save the file URL
    });

    const savedRecord = await newRecord.save();
    
    res.status(201).json(savedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const allRecords = await HealthRecord.find({})
      .sort({ date: -1 })
      .lean();
    res.json(allRecords);
  } catch (err) {
    console.error("Error fetching all health records:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;