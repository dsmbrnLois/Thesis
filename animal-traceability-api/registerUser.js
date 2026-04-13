/*
 * registerUser.js
 * Registration for All Organizations
 */

const { Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const fs = require("fs");
const path = require("path");

async function registerUser(orgMSP, userId) {
  try {
    let ccpFilename, adminName, caName;

    // 1. DYNAMIC CONFIGURATION
    if (orgMSP === "FarmerMSP") {
      ccpFilename = "connection-farmer.json";
      adminName = "admin"; // Match the name used in enrollAdmin.js
      caName = "ca.farmer.traceability.com";
    } else if (orgMSP === "VetMSP") {
      ccpFilename = "connection-vet.json";
      adminName = "admin-vet"; 
      caName = "ca.vet.traceability.com";
    } else if (orgMSP === "RegulatorMSP") {
      ccpFilename = "connection-regulator.json";
      adminName = "admin-regulator";
      caName = "ca.regulator.traceability.com";
    } else {
      return { success: false, message: `Invalid MSP ID: ${orgMSP}` };
    }

    const ccpPath = path.resolve(__dirname, "config", ccpFilename);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // 2. Setup CA with TLS (Crucial for grpcs/https)
    const caInfo = ccp.certificateAuthorities[caName];

    const networkRoot = path.resolve(__dirname, '..', 'animal-traceability-network');

    let orgDomain = '';
    if (orgMSP === "FarmerMSP") orgDomain = "farmer.traceability.com";
    if (orgMSP === "VetMSP") orgDomain = "vet.traceability.com";
    if (orgMSP === "RegulatorMSP") orgDomain = "regulator.traceability.com";
    const tlsCertPath = path.join(
        networkRoot, 
        'organizations', 
        'peerOrganizations', 
        orgDomain, 
        'ca', 
        `ca.${orgDomain}-cert.pem`
    );
    console.log(`Loading CA Cert from: ${tlsCertPath}`);
    const caTLSCACerts = fs.readFileSync(tlsCertPath);
    
    // Pass the TLS certs to the CA client
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // 3. Check if user already exists
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      return { success: false, message: `User ${userId} already exists in wallet` };
    }

    // 4. Check if the Admin exists
    const adminIdentity = await wallet.get(adminName);
    if (!adminIdentity) {
      return { success: false, message: `Admin identity ${adminName} not found. Enroll it first.` };
    }

    // 5. Build User Context
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminName);

    // 6. Register & Enroll
    const secret = await ca.register(
      {
        affiliation: "", // Leaving this empty often defaults to the CA's root affiliation
        enrollmentID: userId,
        role: "client",
      },
      adminUser
    );

    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });

    // 7. Import into wallet
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMSP,
      type: "X.509",
    };
    await wallet.put(userId, x509Identity);

    console.log(`Successfully registered user ${userId} for ${orgMSP}`);
    return { success: true, message: `User ${userId} registered successfully` };
  } catch (error) {
    console.error(`Failed to register user ${userId}: ${error}`);
    return { success: false, message: error.toString() };
  }
}

// Temporary execution block for Tito Boy
if (require.main === module) {
    registerUser("FarmerMSP", "boy2@email.com")
        .then(() => console.log("Registration process complete."))
        .catch((err) => console.error(err));
}

module.exports = { registerUser };