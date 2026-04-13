/*
 * enrollAdmin-Regulator.js
 * Usage: node enrollAdmin-Regulator.js
 */

const FabricCAServices = require("fabric-ca-client");
const { Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // 1. Load Regulator Connection Profile
    const ccpPath = path.resolve(__dirname, "config", "connection-regulator.json");
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // 2. Create a new CA client for Regulator CA
    const caInfo = ccp.certificateAuthorities["ca.regulator.traceability.com"];
    const caTLSCACerts = fs.readFileSync(
      path.resolve(__dirname, caInfo.tlsCACerts.path)
    );
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );

    // 3. Open the Wallet
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // 4. Check if Admin already exists
    const adminName = "admin-regulator"; // Unique name for Regulator Admin
    const identity = await wallet.get(adminName);
    if (identity) {
      console.log(
        `An identity for the admin user "${adminName}" already exists in the wallet`
      );
      return;
    }

    // 5. Enroll the admin user
    const enrollment = await ca.enroll({
      enrollmentID: "admin",
      enrollmentSecret: "adminpw",
    });

    // 6. Import into the wallet
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: "RegulatorMSP", // Regulator MSP ID
      type: "X.509",
    };
    await wallet.put(adminName, x509Identity);
    console.log(
      `Successfully enrolled admin user "${adminName}" and imported it into the wallet`
    );
  } catch (error) {
    console.error(`Failed to enroll admin user "admin-regulator": ${error}`);
    process.exit(1);
  }
}

main();
