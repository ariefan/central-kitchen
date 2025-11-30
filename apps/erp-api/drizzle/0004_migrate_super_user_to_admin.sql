-- Migration: Convert super_user roles to admin roles
-- This migration converts existing system-level super_user roles 
-- to tenant-scoped admin roles for proper UI display

-- Step 1: Update existing super_user roles to be tenant-scoped admin roles
-- For each user with super_user role, create an admin role in their tenant
-- and assign it to them

-- First, find all users with super_user role
CREATE TEMPORARY TABLE super_user_users AS
SELECT DISTINCT 
  u.tenant_id,
  u.email,
  u.id as user_id
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
WHERE r.slug = 'super_user' 
AND u.tenant_id IS NOT NULL;

-- Create admin roles for each tenant that has super_user users
INSERT INTO roles (id, tenant_id, name, slug, description, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  tut.tenant_id,
  'Administrator' as name,
  'admin' as slug,
  'Full access to all tenant features' as description,
  TRUE as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT tenant_id FROM super_user_users
) tut
LEFT JOIN roles existing_role ON existing_role.tenant_id = tut.tenant_id AND existing_role.slug = 'admin'
WHERE existing_role.id IS NULL;

-- Assign admin role to users who had super_user role
INSERT INTO user_roles (id, user_id, role_id, assigned_by, assigned_at)
SELECT 
  gen_random_uuid() as id,
  suu.user_id,
  ar.id as role_id,
  NULL as assigned_by,
  NOW() as assigned_at
FROM super_user_users suu
INNER JOIN roles ar ON ar.tenant_id = suu.tenant_id AND ar.slug = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur_existing 
  WHERE ur_existing.user_id = suu.user_id 
  AND ur_existing.role_id = ar.id
);

-- Copy permissions from super_user role to admin roles
-- Get all permissions from super_user role
INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
SELECT 
  gen_random_uuid() as id,
  ar.id as role_id,
  rp.permission_id,
  NULL as granted_by,
  NOW() as granted_at
FROM roles ar
INNER JOIN (
  SELECT DISTINCT tenant_id FROM super_user_users
) tut ON ar.tenant_id = tut.tenant_id AND ar.slug = 'admin'
CROSS JOIN (
  SELECT DISTINCT permission_id 
  FROM role_permissions 
  WHERE role_id = (SELECT id FROM roles WHERE slug = 'super_user' AND tenant_id IS NULL LIMIT 1)
) rp ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp_existing 
  WHERE rp_existing.role_id = ar.id AND rp_existing.permission_id = rp.permission_id
);

-- Clean up temporary table
DROP TABLE IF EXISTS super_user_users;