#!/bin/bash

# Script to run migration on server
echo "Running migration to add is_system_role column..."

# Connect to database and run migration
docker exec -i $(docker ps -q --filter "name=postgres") psql -U postgres -d erp -c "
ALTER TABLE erp.roles 
ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT FALSE;

UPDATE erp.roles 
SET is_system_role = TRUE 
WHERE slug = 'super_user';

UPDATE erp.roles 
SET is_system_role = TRUE 
WHERE slug = 'admin' AND tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_role_is_system_role ON erp.roles(is_system_role);
"

echo "Migration completed!"