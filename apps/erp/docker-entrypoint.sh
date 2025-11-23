#!/bin/sh
set -e

# Export API_SERVICE_URL if not already set
export API_SERVICE_URL="${API_SERVICE_URL:-http://localhost:8000}"

echo "Starting Next.js server..."
echo "API_SERVICE_URL: $API_SERVICE_URL"

# Start the Next.js server
exec node apps/erp/server.js
