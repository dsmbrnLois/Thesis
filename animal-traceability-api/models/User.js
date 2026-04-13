const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // 1. Blockchain Identity (Links to the Wallet)
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    contactNumber: { 
    type: String, 
    required: true 
  },
    
    // 2. Personal Information (From React)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    // 3. Role & Location
    role: { 
        type: String, 
        enum: ['Farmer', 'Veterinarian', 'Regulator'], 
        required: true 
    },
    barangay: { type: String, required: true },
    
    // 4. Farmer Specifics (Optional for others)
    farmName: { type: String },
    
    // 5. Security
    password: { type: String, required: true }, // Will be stored as a hash
    mspId: { type: String, required: true }, // e.g., 'FarmerMSP'

    resetOTP: { type: String },
    otpExpires: { type: Date },
    
    // --- NEW FIELD ---
    createdBy: { 
        type: String, 
        default: "Self-Registered" 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
