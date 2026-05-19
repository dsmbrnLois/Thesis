#!/bin/bash
# ==============================================================================
# MASTER SETUP SCRIPT: Animal Disease Traceability Network (3 Orgs)
# Usage: ./start_network.sh
# ==============================================================================

export CHANNEL_NAME="traceability-channel"
export VERBOSE=false

# --- Helper Function: Print formatted messages ---
function infoln() {
  echo -e "\033[1;32m[INFO] $1\033[0m"
}
function errorln() {
  echo -e "\033[1;31m[ERROR] $1\033[0m"
}

# --- Check Prerequisites ---
if ! [ -x "$(command -v docker)" ]; then
  errorln "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check for Fabric Tools (configtxgen)
if ! [ -x "$(command -v configtxgen)" ]; then
  errorln "Hyperledger Fabric tools (configtxgen) not found in PATH."
  errorln "Teammates: Make sure you downloaded the binaries and added them to your PATH."
  exit 1
fi

# ==============================================================================
# STEP 1: TEAR DOWN PREVIOUS NETWORK
# ==============================================================================
infoln "Step 1: Cleaning up previous network state..."
docker-compose down -v
rm -rf channel-artifacts/*.block channel-artifacts/*.tx
rm -rf system-genesis-block/*.block
# the 'organizations' folder was not removed here to preserve keys for teammates.

# ==============================================================================
# STEP 2: GENERATE CRYPTO & ARTIFACTS
# ==============================================================================
infoln "Step 2: Generating Crypto Material and Genesis Block..."

# Only generate crypto if the folder doesn't exist.
# This ensures teammates use the keys committed to the repo.
if [ -d "organizations/peerOrganizations" ]; then
    infoln "Crypto material already exists. Skipping generation."
else
    infoln "Generating crypto material..."
    if [ -f "crypto-config.yaml" ]; then
        cryptogen generate --config=./crypto-config.yaml --output="organizations"
    else
        errorln "crypto-config.yaml not found!"
        exit 1
    fi
fi

# Generate Genesis Block
mkdir -p system-genesis-block
configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# Generate Channel Transaction
mkdir -p channel-artifacts
configtxgen -profile ThreeOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME

# ==============================================================================
# STEP 3: START DOCKER
# ==============================================================================
infoln "Step 3: Starting Docker Containers..."
docker-compose up -d

infoln "Sleeping 15s to allow Orderer/Peers to stabilize..."
sleep 15

# ==============================================================================
# STEP 4: PREPARE CLI ENVIRONMENT
# ==============================================================================
# Create the internal helper script for the CLI container
# We use 'EOF' (quoted) to prevent $ variables from expanding on the HOST.
# They will be expanded inside the container when the script runs.

cat > set_anchor_internal.sh << 'EOF'
#!/bin/bash
# Internal script to run inside CLI container
ORG_MSP=$1
HOST=$2
PORT=$3
CHANNEL=$4
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/traceability.com/orderers/orderer.traceability.com/msp/tlscacerts/tlsca.traceability.com-cert.pem

echo "Fetching config for $ORG_MSP..."
peer channel fetch config config_block.pb -o orderer.traceability.com:7050 -c $CHANNEL --tls --cafile $ORDERER_CA
configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json

echo "Modifying config JSON..."
# Safety Check: explicit mod_policy setting
jq ".channel_group.groups.Application.groups.${ORG_MSP}.mod_policy |= \"Admins\" | .channel_group.groups.Application.groups.${ORG_MSP}.values.AnchorPeers = {\"mod_policy\": \"Admins\",\"value\":{\"anchor_peers\": [{\"host\": \"${HOST}\",\"port\": ${PORT}}]},\"version\": \"0\"}" config.json > modified_config.json

echo "Calculating Delta..."
configtxlator proto_encode --input config.json --type common.Config > original_config.pb
configtxlator proto_encode --input modified_config.json --type common.Config > modified_config.pb
configtxlator compute_update --channel_id $CHANNEL --original original_config.pb --updated modified_config.pb > config_update.pb
configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate > config_update.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope > anchor_update_in_envelope.pb
EOF

# Copy the helper script into the CLI container
chmod +x set_anchor_internal.sh
docker cp set_anchor_internal.sh cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/
# rm set_anchor_internal.sh # Clean up host file

# ==============================================================================
# STEP 5: CREATE CHANNEL & JOIN PEERS
# ==============================================================================
ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/traceability.com/orderers/orderer.traceability.com/msp/tlscacerts/tlsca.traceability.com-cert.pem"

infoln "Step 5: Creating Channel '$CHANNEL_NAME'..."

# Create Channel (Acting as Farmer)
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && \
export CORE_PEER_LOCALMSPID=FarmerMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/users/Admin@farmer.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/peers/peer0.farmer.traceability.com/tls/ca.crt && \
peer channel create -o orderer.traceability.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx --outputBlock ./channel-artifacts/$CHANNEL_NAME.block --tls --cafile $ORDERER_CA"

infoln "Joining Peers to Channel..."

# Join Farmer
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && \
export CORE_PEER_LOCALMSPID=FarmerMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/users/Admin@farmer.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/peers/peer0.farmer.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.farmer.traceability.com:7051 && \
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block --tls --cafile $ORDERER_CA"

# Join Vet
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && \
export CORE_PEER_LOCALMSPID=VetMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/vet.traceability.com/users/Admin@vet.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/vet.traceability.com/peers/peer0.vet.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.vet.traceability.com:9051 && \
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block --tls --cafile $ORDERER_CA"

# Join Regulator
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && \
export CORE_PEER_LOCALMSPID=RegulatorMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.traceability.com/users/Admin@regulator.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.traceability.com/peers/peer0.regulator.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.regulator.traceability.com:11051 && \
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block --tls --cafile $ORDERER_CA"

# ==============================================================================
# STEP 6: UPDATE ANCHOR PEERS (MULTI-SIG)
# ==============================================================================
infoln "Step 6: Updating Anchor Peers (This involves multi-signature signing)..."

# --- 6A. FARMER ANCHOR ---
infoln "Updating Farmer Anchor Peer..."
# 1. Generate & Sign as Farmer
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=FarmerMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/users/Admin@farmer.traceability.com/msp && \
./set_anchor_internal.sh FarmerOrg peer0.farmer.traceability.com 7051 $CHANNEL_NAME && \
peer channel signconfigtx -f anchor_update_in_envelope.pb"
# 2. Submit as Vet
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=VetMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/vet.traceability.com/users/Admin@vet.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/vet.traceability.com/peers/peer0.vet.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.vet.traceability.com:9051 && \
peer channel update -f anchor_update_in_envelope.pb -c $CHANNEL_NAME -o orderer.traceability.com:7050 --tls --cafile $ORDERER_CA"

# --- 6B. VET ANCHOR ---
infoln "Updating Vet Anchor Peer..."
# 1. Generate & Sign as Vet
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=VetMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/vet.traceability.com/users/Admin@vet.traceability.com/msp && \
./set_anchor_internal.sh VetOrg peer0.vet.traceability.com 9051 $CHANNEL_NAME && \
peer channel signconfigtx -f anchor_update_in_envelope.pb"
# 2. Submit as Regulator
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=RegulatorMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.traceability.com/users/Admin@regulator.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.traceability.com/peers/peer0.regulator.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.regulator.traceability.com:11051 && \
peer channel update -f anchor_update_in_envelope.pb -c $CHANNEL_NAME -o orderer.traceability.com:7050 --tls --cafile $ORDERER_CA"

# --- 6C. REGULATOR ANCHOR ---
infoln "Updating Regulator Anchor Peer..."
# 1. Generate & Sign as Regulator
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=RegulatorMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.traceability.com/users/Admin@regulator.traceability.com/msp && \
./set_anchor_internal.sh RegulatorOrg peer0.regulator.traceability.com 11051 $CHANNEL_NAME && \
peer channel signconfigtx -f anchor_update_in_envelope.pb"
# 2. Submit as Farmer
docker exec cli sh -c "export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID=FarmerMSP && \
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/users/Admin@farmer.traceability.com/msp && \
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/farmer.traceability.com/peers/peer0.farmer.traceability.com/tls/ca.crt && \
export CORE_PEER_ADDRESS=peer0.farmer.traceability.com:7051 && \
peer channel update -f anchor_update_in_envelope.pb -c $CHANNEL_NAME -o orderer.traceability.com:7050 --tls --cafile $ORDERER_CA"

infoln "========================================================="
infoln " NETWORK SETUP COMPLETE "
infoln "========================================================="