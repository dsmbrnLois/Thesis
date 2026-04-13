// models/TransferRequest.js
const mongoose = require("mongoose");

const TransferRequestSchema = new mongoose.Schema({
  // LINKING
  batchId: { type: String, required: true }, // The Parent Animal Batch
  farmerUsername: { type: String, required: true }, // Sender
  
  // --- How many are moving? ---
  transferQuantity: { type: Number, required: true, min: 1 }, 

  // RECEIVER DETAILS
  destinationType: { 
    type: String, 
    enum: ["Internal", "External", "Slaughter", "Cull"], 
    required: true 
  },
  receiverUsername: { type: String }, // If registered (Internal)
  receiverDetails: { // If unregistered (External/Slaughter)
    name: String,
    address: String,
    contact: String
  },

  // TRANSPORT DETAILS
  purpose: { type: String, enum: ["Breeding", "Slaughter", "Show", "Sales", "Disposal"], required: true },
  transportDate: { type: Date, required: true },
  
  // STATUS FLOW
  status: { 
    type: String, 
    enum: [
      "Pending Vet Review", 
      "Approved (VHC Issued)", 
      "Rejected", 
      "In Transit", 
      "Completed", 
      "Cancelled", 
      "Completed (Slaughtered)",
      "Completed (Exported)", 
      "Completed (Culled)",
      "Pending Regulator Verification", 
      "Proof Rejected"
    ], 
    default: "Pending Vet Review"
  },

  // APPROVALS
  vetUsername: { type: String }, 
  vhcToken: { type: String }, 
  rejectionReason: { type: String },

  // PROOF 
  proofDocumentUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TransferRequest", TransferRequestSchema);