#!/bin/bash
# Diagnostic script for Dokploy deployment
# Run this on your EC2 server to check the deployment status

echo "=== Docker Container Status ==="
docker ps --filter "name=centralkitchenerp" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n=== API Container Environment Variables ==="
API_CONTAINER=$(docker ps --filter "name=centralkitchenerp.*api" --format "{{.Names}}" | head -n 1)
if [ -n "$API_CONTAINER" ]; then
    echo "Container: $API_CONTAINER"
    docker exec $API_CONTAINER printenv | grep -E "BETTER_AUTH_URL|FRONTEND_URL|API_SERVICE_URL"
else
    echo "API container not found!"
fi

echo -e "\n=== Web Container Environment Variables ==="
WEB_CONTAINER=$(docker ps --filter "name=centralkitchenerp.*web" --format "{{.Names}}" | head -n 1)
if [ -n "$WEB_CONTAINER" ]; then
    echo "Container: $WEB_CONTAINER"
    docker exec $WEB_CONTAINER printenv | grep -E "API_SERVICE_URL|NEXT_PUBLIC_API_URL"
else
    echo "Web container not found!"
fi

echo -e "\n=== Testing Internal API Connection from Web Container ==="
if [ -n "$WEB_CONTAINER" ]; then
    echo "Testing: curl -s http://api:8000/health"
    docker exec $WEB_CONTAINER curl -s http://api:8000/health || echo "Failed to connect!"
else
    echo "Web container not found!"
fi

echo -e "\n=== Docker Compose File in Use ==="
COMPOSE_DIR="/path/to/your/dokploy/project"
if [ -f "$COMPOSE_DIR/docker-compose.dokploy.yml" ]; then
    echo "Checking BETTER_AUTH_URL in compose file:"
    grep -A 2 "BETTER_AUTH_URL" "$COMPOSE_DIR/docker-compose.dokploy.yml"
else
    echo "Please update COMPOSE_DIR path in this script"
fi

echo -e "\n=== Traefik Labels on Containers ==="
echo "API container labels:"
docker inspect $API_CONTAINER 2>/dev/null | grep -A 5 "traefik" || echo "No Traefik labels (expected)"

echo -e "\nWeb container labels:"
docker inspect $WEB_CONTAINER 2>/dev/null | grep "traefik.http.routers" | head -n 5

echo -e "\n=== Container Logs (last 20 lines) ==="
echo "API logs:"
docker logs $API_CONTAINER --tail 20 2>&1 | tail -n 10

echo -e "\nWeb logs:"
docker logs $WEB_CONTAINER --tail 20 2>&1 | tail -n 10

echo -e "\n=== Network Connectivity ==="
echo "Containers on dokploy-network:"
docker network inspect dokploy-network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null
