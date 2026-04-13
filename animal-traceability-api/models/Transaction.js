const mongoose = require("mongoose");


const transactionSchema = new mongoose.Schema({
  batchId: { 
    type: String, 
    // required: true, 
    unique: true, 
    sparse: true,
    index: true 
  },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  contactNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{11}$/.test(v); // must be exactly 11 digits
      },
      message: (props) => `${props.value} is not a valid 11-digit number!`,
    },
  },
  species: { type: String, required: true },
  quantity: { type: Number, required: true },
  location: { type: String, required: true },
  healthStatus: { type: String, required: true },
  timestamp: { type: Date, required: true },
  status: { 
    type: String, 
    enum: [
      "Submitted to Vet", 
      "Resolved",
      "Submitted to Admin", 
      "Verified by Vet",
      "In Stock",      // For internal transfers
      "Slaughtered",   // End of life
      "Exported",      // External
      "Completed",      // General completion
      "Pending Transfer",
      "Cull Ordered",             
      "Pending Cull Verification", 
      "Culled"                     
    ],
    default: "Submitted to Vet" 
  },
  diagnosedDisease: { type: String, default: "" },
  severity: {
    type: String,
    enum: ["Ongoing", "safe", "mild", "dangerous"], 
    default: "Ongoing",
  },
  blockchainTxId: { type: String, default: null },
  proofDocumentUrl: { type: String, default: null },
  parentBatchId: { type: String, default: null }
  
});

module.exports = mongoose.model("Transaction", transactionSchema, "transactions");