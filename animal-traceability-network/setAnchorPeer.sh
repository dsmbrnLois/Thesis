#!/bin/bash
# SAFE ANCHOR PEER SCRIPT v3 - NON-DESTRUCTIVE

ORG_MSP=$1
ANCHOR_HOST=$2
ANCHOR_PORT=$3
CHANNEL_NAME="traceability-channel"

# Verify global variables are set
if [ -z "$ORDERER_CA" ]; then
  echo "ERROR: ORDERER_CA variable is not set."
  exit 1
fi

echo "=== 1. Fetching Config for $ORG_MSP ==="
peer channel fetch config config_block.pb -o orderer.traceability.com:7050 -c $CHANNEL_NAME --tls --cafile $ORDERER_CA

echo "=== 2. Decoding Config ==="
configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json

echo "=== 3. Modifying JSON (Surgical Update) ==="

# 3a. Verify MSP exists before touching anything (Safety Check)
MSP_CHECK=$(jq ".channel_group.groups.Application.groups.${ORG_MSP}.values.MSP" config.json)
if [ "$MSP_CHECK" == "null" ]; then
   echo "CRITICAL ERROR: MSP definition not found in config.json. Aborting to prevent corruption."
   exit 1
fi

# 3b. Apply updates safely
# - We set mod_policy to "Admins" (if missing)
# - We ADD the AnchorPeers field without touching the MSP field
jq ".channel_group.groups.Application.groups.${ORG_MSP}.mod_policy |= \"Admins\" | .channel_group.groups.Application.groups.${ORG_MSP}.values.AnchorPeers = {\"mod_policy\": \"Admins\",\"value\":{\"anchor_peers\": [{\"host\": \"${ANCHOR_HOST}\",\"port\": ${ANCHOR_PORT}}]},\"version\": \"0\"}" config.json > modified_config.json

echo "=== 4. Computing Update ==="
configtxlator proto_encode --input config.json --type common.Config > original_config.pb
configtxlator proto_encode --input modified_config.json --type common.Config > modified_config.pb
configtxlator compute_update --channel_id $CHANNEL_NAME --original original_config.pb --updated modified_config.pb > config_update.pb

echo "=== 5. Creating Envelope ==="
configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate > config_update.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope > anchor_update_in_envelope.pb

echo "=== READY: anchor_update_in_envelope.pb created. ==="
echo "You must now SIGN this file with a second organization before submitting."
