-- Grant admin role to all users with admin username
-- This script ensures all admin users have admin role access

-- First, ensure admin role exists for all tenants
INSERT INTO roles (id, tenant_id, name, slug, description, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  u.tenant_id,
  'Administrator' as name,
  'admin' as slug,
  'Full access to all tenant features' as description,
  TRUE as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT tenant_id FROM users WHERE email ILIKE '%admin%'
) u
LEFT JOIN roles existing_role ON existing_role.tenant_id = u.tenant_id AND existing_role.slug = 'admin'
WHERE existing_role.id IS NULL;

-- Grant admin role to all admin users
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

-- Copy all permissions to admin roles
INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
SELECT 
  gen_random_uuid() as id,
  ar.id as role_id,
  p.id as permission_id,
  NULL as granted_by,
  NOW() as granted_at
FROM roles ar
INNER JOIN (
  SELECT DISTINCT tenant_id FROM users WHERE email ILIKE '%admin%'
) ut ON ar.tenant_id = ut.tenant_id AND ar.slug = 'admin'
CROSS JOIN permissions p ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp_existing 
  WHERE rp_existing.role_id = ar.id AND rp_existing.permission_id = p.id
);