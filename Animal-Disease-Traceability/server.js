const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const ccpPath = path.resolve(__dirname, 'connection-profile.json'); // Adjust path as needed
const walletPath = path.join(process.cwd(), 'wallet');

// Connect to Fabric Gateway (simplified; assumes wallet and identity are set up)
async function getGateway() {
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const gateway = new Gateway();
  const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  const connectionOptions = { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } };
  await gateway.connect(connectionProfile, connectionOptions);
  return gateway;
}

app.get('/api/transactions', async (req, res) => {
  try {
    const gateway = await getGateway();
    const network = await gateway.getNetwork('mychannel'); // Adjust channel name
    const contract = network.getContract('animal-chaincode'); // Adjust contract name
    const result = await contract.evaluateTransaction('queryAllAnimals'); // Assumes this returns transaction history
    const transactions = JSON.parse(result.toString());
    res.json(transactions);
    await gateway.disconnect();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to query transactions' });
  }
});

app.post('/api/transactions/add', async (req, res) => {
  const { animalID, species, healthStatus } = req.body;
  try {
    const gateway = await getGateway();
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('animal-chaincode');
    const result = await contract.submitTransaction('registerAnimal', animalID, species, healthStatus);
    const transactionId = result.toString(); // Assuming result includes transaction ID
    res.json({ transactionId, status: 'Committed' });
    await gateway.disconnect();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

const PORT = 3001; // Adjust port as needed
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
