// seed.js
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Helper to pause execution so we don't overwhelm Hyperledger
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSeed() {
    console.log("STARTING GENESIS-AI WORLD BUILDER...");
    
    const users = [];

    // ==========================================
    // 1. REGISTER USERS WITH VARIATIONS
    // ==========================================
    console.log("1️⃣ REGISTERING DEMO USERS...");
    const demoUsers = [
        {
            firstName: "Doc", lastName: "Reyes", email: "vet@santarosa.gov.ph", contactNumber: "09123456789",
            password: "password123", role: "Veterinarian", barangay: "Market Area", org: "VetOrg"
        },
        {
            firstName: "Mario", lastName: "Cruz", email: "mario@gmail.com", contactNumber: "09111111111",
            password: "password123", role: "Farmer", barangay: "Sinalhan", farmName: "Piggeries", org: "FarmerOrg"
        },
        {
            firstName: "Luigi", lastName: "Santos", email: "luigi@gmail.com", contactNumber: "09222222222",
            password: "password123", role: "Farmer", barangay: "Aplaya", farmName: "Poultry farm", org: "FarmerOrg"
        },
        {
            firstName: "Juan", lastName: "Dela Cruz", email: "juan@gmail.com", contactNumber: "09333333333",
            password: "password123", role: "Farmer", barangay: "Macabling", farmName: "Beef cattle farm", org: "FarmerOrg"
        },
        {
            firstName: "Pedro", lastName: "Penduko", email: "pedro@gmail.com", contactNumber: "09444444444",
            password: "password123", role: "Farmer", barangay: "Dila", farmName: "Piggeries", org: "FarmerOrg"
        }
    ];

    for (const user of demoUsers) {
        try {
            await axios.post(`${API_URL}/register`, { ...user, username: user.email });
            console.log(`   Registered ${user.role}: ${user.email} (${user.farmName || 'City Vet'})`);
            users.push(user);
            await sleep(2500); 
        } catch (err) {
            console.log(`   Skipped ${user.email} (Likely already exists)`);
            users.push(user); 
        }
    }

    // ==========================================
    // 2. GENERATE LIVESTOCK WITH SMART VARIATIONS
    // ==========================================
    console.log("\n2: POPULATING FARMS WITH LIVESTOCK...");
    const farmers = users.filter(u => u.role === "Farmer");
    
    // Logic to assign correct species based on farm type
    const getSpeciesForFarm = (farmName) => {
        if (farmName === "Piggeries") return "Hog";
        if (farmName === "Poultry farm") return Math.random() > 0.5 ? "Chicken" : "Duck";
        if (farmName === "Beef cattle farm") return "Cow";
        if (farmName === "Sheep farm") return "Sheep";
        if (farmName === "Goat farm") return "Goat";
        return "Hog"; // Default
    };
    
    for (const farmer of farmers) {
        // Generate 4 batches per farmer
        for (let i = 1; i <= 4; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 20)); // Randomize over last 20 days

            const txPayload = {
                username: farmer.email,
                fullName: `${farmer.firstName} ${farmer.lastName}`,
                contactNumber: farmer.contactNumber,
                species: getSpeciesForFarm(farmer.farmName),
                quantity: Math.floor(Math.random() * 80) + 20, // 20 to 100 heads
                location: farmer.barangay,
                healthStatus: "Appears Healthy",
                timestamp: pastDate,
                mspId: "FarmerMSP"
            };

            try {
                await axios.post(`${API_URL}/transactions`, txPayload);
                console.log(`   Added ${txPayload.species} Batch for ${farmer.email} (${txPayload.quantity} heads)`);
                await sleep(3000); 
            } catch (err) {
                console.error(`   Failed to add batch:`, err.response?.data || err.message);
            }
        }
    }

    console.log("\n WORLD BUILDING COMPLETE!");
    console.log("The ledger is populated and sorted.");
}

runSeed();