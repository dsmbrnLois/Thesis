#!/bin/bash
# Usage: ./teardown.sh

echo "Stopping containers..."
docker-compose down -v

echo "Removing artifacts..."
rm -rf channel-artifacts/*.block
rm -rf channel-artifacts/*.tx
rm -rf system-genesis-block/*.block
rm -rf organizations/peerOrganizations
rm -rf organizations/ordererOrganizations

echo "Pruning Docker networks/volumes (Optional)..."
docker volume prune -f
docker network prune -f

echo "Done. Network is clean."