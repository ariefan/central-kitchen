-- Fix Super User permissions - Assign ALL permissions to Super User role
-- This ensures the admin user can access all endpoints including tenants

-- First, remove any existing permissions for super_user role to avoid conflicts
DELETE FROM erp.role_permissions 
WHERE role_id = (
  SELECT id FROM erp.roles 
  WHERE slug = 'super_user' AND is_system_role = true
);

-- Then, assign ALL permissions to super_user role
INSERT INTO erp.role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM erp.roles r
CROSS JOIN erp.permissions p
WHERE r.slug = 'super_user' AND r.is_system_role = true
ON CONFLICT DO NOTHING;

-- Verify the permissions were assigned
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM erp.roles r
LEFT JOIN erp.role_permissions rp ON r.id = rp.role_id
WHERE r.slug = 'super_user' AND r.is_system_role = true
GROUP BY r.name, r.id;

SELECT 'Super User permissions updated successfully!' as message;