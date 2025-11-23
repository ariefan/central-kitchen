#!/bin/bash
# Quick fix script for Dokploy deployment
# This will restart containers with correct environment variables

set -e

PROJECT_NAME="centralkitchenerp-compose-gz78mj"

echo "=== Stopping all containers for $PROJECT_NAME ==="
docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml down

echo -e "\n=== Removing old containers ==="
docker ps -a | grep $PROJECT_NAME | awk '{print $1}' | xargs -r docker rm -f

echo -e "\n=== Pulling latest images ==="
docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml pull || true

echo -e "\n=== Rebuilding services ==="
docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml build --no-cache

echo -e "\n=== Starting services ==="
docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml up -d

echo -e "\n=== Waiting for services to be healthy ==="
sleep 10

echo -e "\n=== Checking container status ==="
docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml ps

echo -e "\n=== Testing API endpoints ==="
echo "Testing old endpoint (should fail or return error):"
curl -k -s -o /dev/null -w "api.personalapp.id/health: %{http_code}\n" https://api.personalapp.id/health || true

echo "Testing new endpoint (should return 200):"
curl -k -s -o /dev/null -w "erp.personalapp.id/api/health: %{http_code}\n" https://erp.personalapp.id/api/health || true

echo -e "\n=== Deployment complete! ==="
echo "Check the logs with:"
echo "  docker compose -p $PROJECT_NAME -f docker-compose.dokploy.yml logs -f"
