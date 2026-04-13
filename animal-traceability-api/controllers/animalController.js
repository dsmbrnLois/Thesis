const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Helper to get connection profile
const getCCP = () => {
    const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-farmer.json');
    return JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
};

exports.recordAnimal = async (req, res) => {
    try {
        const { id, username, species, quantity, location, status } = req.body;

        // 1. Setup Wallet and Gateway
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const gateway = new Gateway();
        const ccp = getCCP();

        // 2. Connect using the 'appUser' identity
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser', 
            discovery: { enabled: true, asLocalhost: true }
        });

        // 3. Access the Smart Contract
        const network = await gateway.getNetwork('traceability-channel');
        const contract = network.getContract('animal-traceability');

        // 4. Prepare the data for the Chaincode
        // Note: Our Go contract expects a JSON string as the second argument
        const animalData = JSON.stringify({
            id,
            username,
            species,
            quantity: parseInt(quantity),
            location,
            status,
            timestamp: new Date().toISOString()
        });

        // 5. Submit the transaction to the Blockchain
        console.log(`Submitting transaction for animal ${id}...`);
        await contract.submitTransaction('RecordTransaction', id, animalData);

        // 6. Disconnect and respond
        await gateway.disconnect();
        
        res.status(200).json({
            success: true,
            message: `Animal ${id} successfully recorded on the blockchain.`
        });

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAnimalHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const gateway = new Gateway();
        await gateway.connect(getCCP(), {
            wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('traceability-channel');
        const contract = network.getContract('animal-traceability');

        // EvaluateTransaction is used for reading (it doesn't create a new block)
        const result = await contract.evaluateTransaction('GetHistory', id);
        
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};