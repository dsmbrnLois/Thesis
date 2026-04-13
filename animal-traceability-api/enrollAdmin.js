/*
 * enrollAdmin.js
 * Usage: node enrollAdmin.js
 */

const FabricCAServices = require("fabric-ca-client");
const { Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
require('dotenv').config(); // Load variables from .env

async function main() {
  try {
    // 1. Load connection profile
    // Use path.resolve to ensure we find the config regardless of where we run the script
    const ccpPath = path.resolve(__dirname, "config", "connection-farmer.json");
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // 2. Create a new CA client
    const caInfo = ccp.certificateAuthorities["ca.farmer.traceability.com"];
    
    // RESOLUTION FIX: Ensure the TLS cert path is absolute relative to this script
    const tlsCertPath = path.resolve(__dirname, caInfo.tlsCACerts.path);
    const caTLSCACerts = fs.readFileSync(tlsCertPath);
    
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );

    // 3. Create a FileSystemWallet to manage identities
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // 4. Check if Admin already exists
    const identity = await wallet.get("admin");
    if (identity) {
      console.log('An identity for the client user "admin" already exists in the wallet');
      return;
    }

    // 5. Enroll the admin user
    // We use the values from .env if available, otherwise fallback to defaults
    const enrollment = await ca.enroll({
      enrollmentID: process.env.CA_ADMIN || "admin",
      enrollmentSecret: process.env.CA_ADMIN_PW || "adminpw",
    });

    // 6. Import into the wallet
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: process.env.MSP_ID || "FarmerMSP",
      type: "X.509",
    };
    
    await wallet.put("admin", x509Identity);
    console.log('Successfully enrolled admin user "admin" and imported it into the wallet');

  } catch (error) {
    console.error(`Failed to enroll admin user "admin": ${error}`);
    // Check if it's a path error to give you a better hint
    if (error.code === 'ENOENT') {
        console.error("HINT: The script couldn't find your CA certificate file. Check the path in connection-farmer.json");
    }
    process.exit(1);
  }
}

main();