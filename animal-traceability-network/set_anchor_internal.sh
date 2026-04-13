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
