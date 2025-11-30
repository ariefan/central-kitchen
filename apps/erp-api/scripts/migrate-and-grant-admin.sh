#!/bin/bash

echo "🔧 Running migration and granting admin access..."

# Find postgres container
POSTGRES_CONTAINER=$(docker ps --format "table {{.Names}}" | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ PostgreSQL container not found"
    exit 1
fi

echo "📦 Found PostgreSQL container: $POSTGRES_CONTAINER"

# Copy migration file to container
docker cp apps/erp-api/drizzle/0004_migrate_super_user_to_admin.sql $POSTGRES_CONTAINER:/tmp/migration.sql

# Run migration
echo "🔄 Running migration..."
docker exec $POSTGRES_CONTAINER psql -U postgres -d centralkitchen_erp -f /tmp/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Grant admin role to all users with username 'admin'
echo "👤 Granting admin role to all admin users..."

docker exec $POSTGRES_CONTAINER psql -U postgres -d centralkitchen_erp -c "
UPDATE user_roles 
SET role_id = (
    SELECT r.id FROM roles r 
    INNER JOIN users u ON r.tenant_id = u.tenant_id 
    WHERE r.slug = 'admin' AND u.email ILIKE '%admin%'
    LIMIT 1
)
WHERE user_id IN (
    SELECT u.id FROM users u 
    WHERE u.email ILIKE '%admin%'
) AND role_id NOT IN (
    SELECT r.id FROM roles r 
    INNER JOIN users u ON r.tenant_id = u.tenant_id 
    WHERE r.slug = 'admin' AND u.email ILIKE '%admin%'
);
"

if [ $? -eq 0 ]; then
    echo "✅ Admin role granted to all admin users"
else
    echo "❌ Failed to grant admin role"
    exit 1
fi

# Clean up
docker exec $POSTGRES_CONTAINER rm /tmp/migration.sql

echo "🎉 Migration and admin access setup completed!"