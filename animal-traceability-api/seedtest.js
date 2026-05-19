// seed-test.js
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Helper to pause execution so we don't overwhelm the Hyperledger Docker containers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTestSeed() {
    console.log("🧪 STARTING MODIFIED TEST SEEDER (Using existing users)...");
    
    const transactions = [];

    // Your existing working users
    const farmers = [
        { 
            username: "wow@gmail.com", 
            fullName: "Lois Desembrana", 
            contactNumber: "09123456789", 
            location: "Barangay Sinalhan", 
            mspId: "FarmerMSP" 
        },
        { 
            username: "wow3@gmail.com", 
            fullName: "Emmanuel Ellana", 
            contactNumber: "09987654321", 
            location: "Barangay Aplaya", 
            mspId: "FarmerMSP" 
        }
    ];

    const vet = {
        username: "docvet@gmail.com",
        mspId: "VetMSP"
    };

    // ==========================================
    // 1. GENERATE LIVESTOCK BATCHES
    // ==========================================
    console.log("\n1️⃣ INJECTING LIVESTOCK BATCHES (Skipping Registration)...");
    
    for (const farmer of farmers) {
        for (let i = 1; i <= 5; i++) {
            // Simulate dates over the last 14 days
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 14));

            const txPayload = {
                username: farmer.username,
                fullName: farmer.fullName,
                contactNumber: farmer.contactNumber,
                species: "Swine",
                quantity: Math.floor(Math.random() * 40) + 10,
                location: farmer.location,
                healthStatus: "Appears Healthy",
                timestamp: pastDate,
                mspId: farmer.mspId
            };

            try {
                const res = await axios.post(`${API_URL}/transactions`, txPayload);
                transactions.push(res.data);
                console.log(`   🐖 Added Batch for ${farmer.username} (${txPayload.quantity} heads)`);
                await sleep(3000); // 3-second buffer for Hyperledger Consensus
            } catch (err) {
                console.error(`   ❌ Failed to add batch:`, err.response?.data || err.message);
            }
        }
    }

    // ==========================================
    // 2. THE AI DEMO SCENARIO (ASF OUTBREAK)
    // ==========================================
    console.log("\n2️⃣ SIMULATING ASF OUTBREAK FOR AI DETECTION...");
    
    if (transactions.length >= 6) {
        // Grab one batch from wow@gmail.com (index 0) and one from wow3@gmail.com (index 6)
        const batchToMakeMild = transactions[0]; 
        const batchToMakeDangerous = transactions[6]; 

        // 1. Farmer 1 reports mild illness
        console.log(`   ⚠️  Farmer logging Mild Illness on Batch ${batchToMakeMild.batchId}...`);
        try {
            await axios.patch(`${API_URL}/transactions/${batchToMakeMild._id}`, {
                username: "wow@gmail.com",
                mspId: "FarmerMSP",
                healthStatus: "Loss of appetite, slight fever",
                severity: "mild",
                status: "Submitted to Vet"
            });
            await sleep(3000);
        } catch (err) {
            console.error("   ❌ Failed mild update:", err.response?.data || err.message);
        }

        // 2. Vet Officially Diagnoses ASF on Farmer 2's batch
        console.log(`   🚨 City Vet diagnosing African Swine Fever on Batch ${batchToMakeDangerous.batchId}...`);
        try {
            await axios.patch(`${API_URL}/transactions/${batchToMakeDangerous._id}`, {
                username: vet.username,
                mspId: vet.mspId,
                healthStatus: "Confirmed Positive via Blood Test",
                diagnosedDisease: "African Swine Fever (ASF)",
                severity: "dangerous",
                status: "Pending Cull Verification"
            });
            await sleep(3000);
        } catch (err) {
            console.error("   ❌ Failed dangerous update:", err.response?.data || err.message);
        }
    }

    console.log("\n🎉 TEST SEEDING COMPLETE! Open your dashboard to verify.");
}

runTestSeed();