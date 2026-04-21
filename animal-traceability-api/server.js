/*
 * server.js
 */
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { registerUser } = require("./registerUser");
const { Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");



// Import the User Model
const User = require("./models/User");
const Alert = require("./models/Alert");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// --- MONGODB CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas", mongoose.connection.db.databaseName))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// --- ROUTES ---

// 1. REGISTER USER (Blockchain + MongoDB)
app.post("/api/register", async (req, res) => {
  // Extract all fields from the new payload
  const {
    username,
    org,
    firstName,
    lastName,
    email,
    password,
    role,
    barangay,
    farmName,
    contactNumber,
    createdBy,
  } = req.body;

  if (!username || !org || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // A. CHECK MONGODB FIRST
    // Prevent duplicate emails before we even touch the blockchain
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists in Database" });
    }

    // B. MAP ORG NAME TO MSP ID
    let mspID;
    switch (org) {
      case "VetOrg":
        mspID = "VetMSP";
        break;
      case "RegulatorOrg":
        mspID = "RegulatorMSP";
        break;
      case "FarmerOrg":
      default:
        mspID = "FarmerMSP";
        break;
    }

    // C. REGISTER ON BLOCKCHAIN (Create Identity)
    console.log(`1. Registering on Blockchain: ${username}`);
    const blockchainResult = await registerUser(mspID, username);

    if (!blockchainResult.success) {
      throw new Error(blockchainResult.message);
    }

    // D. SAVE TO MONGODB (Create Profile)
    console.log(`2. Saving to MongoDB...`);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username, // Links to Blockchain ID
      firstName,
      lastName,
      email,
      role,
      barangay,
      farmName: role === "Farmer" ? farmName : undefined, // Only save farmName if Farmer
      password: hashedPassword,
      mspId: mspID,
      contactNumber,
      createdBy: createdBy || "Self-Registered",
    });

    await newUser.save();
    console.log(" User saved to MongoDB");

    res.status(200).json({
      message: "User registered successfully on Blockchain and Database",
    });
  } catch (error) {
    console.error("Registration Failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. LOGIN (Database Check + Wallet Check)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // A. CHECK MONGODB (Verify Password)
    const dbUser = await User.findOne({ username });
    if (!dbUser) {
      return res
        .status(401)
        .json({ success: false, message: "User not found in Database" });
    }

    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password" });
    }

    // B. CHECK BLOCKCHAIN WALLET (Verify Identity exists)
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(username);

    if (identity) {
      res.status(200).json({
        success: true,
        message: "Login successful",
        mspId: dbUser.mspId,
        role: dbUser.role, // Send role back to frontend
        user: {
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          contactNumber: dbUser.contactNumber,
          barangay: dbUser.barangay,
        },
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Blockchain Identity missing" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET ALL USERS (For Admin Dashboard)
app.get("/api/users", async (req, res) => {
  try {
    // Fetch all users but EXCLUDE the password field for security
    // Sort by newest first (-1)
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// --- GET SINGLE USER PROFILE ---
app.get("/api/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user in MongoDB and exclude password
    const user = await User.findOne({ username }, "-password");
    
    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- UPDATE USER PROFILE (MongoDB Only) ---
app.put("/api/profile/update/:username", async (req, res) => {
  try {
    // FIX: You must extract username from params!
    const { username } = req.params; 
    const { contactNumber, farmName } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { username }, // Now 'username' is defined
      { 
        contactNumber, 
        farmName 
      },
      { new: true, runValidators: true } 
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`Profile updated for: ${username}`);

    res.status(200).json({
      message: "Profile updated successfully (Metadata only)",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Failed to update profile info" });
  }
});

// Add this helper to server.js
async function getContract(username, mspId) {
    const gateway = new Gateway();
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const connectionProfilePath = path.resolve(__dirname, 'config', `connection-${mspId.toLowerCase()}.json`);
    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

    await gateway.connect(connectionProfile, {
        wallet,
        identity: username,
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel'); // Ensure this matches your start_network.sh
    return { contract: network.getContract('animal-traceability'), gateway };
}

// Import transactions route
const transactionsRouter = require("./routes/transactions");
app.use("/api/transactions", transactionsRouter);

// Import healthRecords route
const healthRecordsRouter = require("./routes/healthRecords");
app.use("/api/health-records", healthRecordsRouter);


const transfersRouter = require("./routes/transfers");
app.use("/api/transfers", transfersRouter);

const riskRoutes = require('./routes/risk');
app.use('/api', riskRoutes);

// Public Digital Animal Passport (read-only, no auth required)
const passportRouter = require("./routes/passport");
app.use("/api/passport", passportRouter);

// --- 4. BROADCAST EMAIL ALERT ROUTE (UPDATED WITH DB SAVING) ---
app.post("/api/send-alert", async (req, res) => {
  // We extract 'metadata' now because the frontend is sending the structured template fields
  const { message, targetBarangay, metadata } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    // A. SAVE TO MONGODB FIRST (FOR HISTORY)
    const newAlert = new Alert({
      title: metadata.title || "Untitled Alert",
      severity: metadata.severity || "Advisory",
      species: metadata.species || "All Species",
      targetBarangay: targetBarangay,
      description: metadata.description || message,
      instruction: metadata.instruction || "",
    });
    await newAlert.save();

    // B. Build MongoDB Query to find recipients
    let query = {};
    if (targetBarangay && targetBarangay !== "All") {
      query.barangay = targetBarangay;
    }

    const users = await User.find(query, "email");
    const emailList = users.map((u) => u.email).filter(e => e);

    if (emailList.length === 0) {
      return res.status(404).json({ error: `No users found in ${targetBarangay}` });
    }

    // C. Setup Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // D. Email Content (Modern Professional Template)
    const severityColor = metadata.severity === "Critical" ? "#dc2626" : metadata.severity === "Warning" ? "#ea580c" : "#059669";

    const mailOptions = {
      from: `"SR Livestock Office" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, 
      bcc: emailList, 
      subject: `⚠️ VANGUARD ALERT [${metadata.severity.toUpperCase()}]: ${targetBarangay}`,
      html: `
        <div style="background-color: #f1f5f9; padding: 20px; font-family: sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
            <tr><td style="background-color: ${severityColor}; padding: 12px; text-align: center;">
              <span style="color: white; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Official Veterinary Broadcast</span>
            </td></tr>
            <tr><td style="padding: 40px 30px;">
              <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 20px 0;">${metadata.title}</h1>
              <table width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td><p style="color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; margin: 0;">Location</p><p style="font-weight: 700;">${targetBarangay}</p></td>
                  <td><p style="color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; margin: 0;">Species</p><p style="font-weight: 700;">${metadata.species}</p></td>
                </tr>
              </table>
              <div style="background-color: #f8fafc; border-left: 4px solid ${severityColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #334155; line-height: 1.6; margin: 0;">${metadata.description}</p>
              </div>
              ${metadata.instruction ? `
                <div style="background-color: #0f172a; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; font-weight: bold;">ACTION REQUIRED: ${metadata.instruction}</p>
                </div>
              ` : ''}
            </td></tr>
            <tr><td style="padding: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
              Santa Rosa Blockchain Traceability System
            </td></tr>
          </table>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, count: emailList.length, alert: newAlert });
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ error: "Failed to broadcast emails." });
  }
});

// --- 5. GET ALERT HISTORY ---
app.get("/api/alert-history", async (req, res) => {
  try {
    const history = await Alert.find().sort({ date: -1 });
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

// --- 6. DELETE AN ALERT (Updated to DELETE method) ---
app.delete("/api/delete-alert/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ID is a valid MongoDB ObjectId to prevent crash
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const deletedAlert = await Alert.findByIdAndDelete(id);
    
    if (!deletedAlert) {
      return res.status(404).json({ error: "Alert not found in database" });
    }
    
    res.status(200).json({ success: true, message: "Alert removed from logs" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Internal server error during deletion" });
  }
});

//forgot password route
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
