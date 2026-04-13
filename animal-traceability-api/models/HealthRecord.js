const mongoose = require("mongoose");

const HealthRecordSchema = new mongoose.Schema({
  // LINK TO THE ANIMAL
  batchId: { type: String, required: true, index: true }, // Foreign Key

  // RECORD DETAILS
  date: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ["Vaccination", "Deworming", "Lab Test", "Vitamin", "Diagnosis"], 
    required: true 
  },
  name: { type: String, required: true }, // e.g., "Hog Cholera Vaccine" or "ASF Test"
  
  // VET INFO
  vetUsername: { type: String, required: true }, // Who added this?
  vetLicense: { type: String }, 
  
  // METADATA
  notes: { type: String },
  nextDueDate: { type: Date }, // Optional: For recurring vaccines

  proofUrl: { type: String, default: null }, // URL or path to the uploaded file
  
  // VALIDITY (For Movement Rules)
  status: { type: String, enum: ["Valid", "Expired"], default: "Valid" }
});

module.exports = mongoose.model("HealthRecord", HealthRecordSchema);