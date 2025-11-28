-- Seed RBAC (Roles & Permissions)
-- This script populates the database with initial roles and permissions

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Insert all permissions
INSERT INTO erp.permissions (resource, action, description) VALUES
  -- System-level permissions
  ('tenant', 'manage', 'Full tenant management (create, update, delete tenants)'),
  ('tenant', 'view', 'View tenant information'),

  -- Location permissions
  ('location', 'create', 'Create new locations'),
  ('location', 'read', 'View location details'),
  ('location', 'update', 'Update location information'),
  ('location', 'delete', 'Delete locations'),
  ('location', 'manage', 'Full location management'),

  -- User permissions
  ('user', 'create', 'Create new users'),
  ('user', 'read', 'View user details'),
  ('user', 'update', 'Update user information'),
  ('user', 'delete', 'Delete users'),
  ('user', 'manage', 'Full user management'),

  -- Role permissions
  ('role', 'create', 'Create new roles'),
  ('role', 'read', 'View role details'),
  ('role', 'update', 'Update role information'),
  ('role', 'delete', 'Delete roles'),
  ('role', 'manage_permissions', 'Assign permissions to roles'),
  ('role', 'manage', 'Full role management'),

  -- Product permissions
  ('product', 'create', 'Create new products'),
  ('product', 'read', 'View product details'),
  ('product', 'update', 'Update product information'),
  ('product', 'delete', 'Delete products'),
  ('product', 'manage_prices', 'Manage product pricing'),
  ('product', 'manage', 'Full product management'),

  -- Purchase Order permissions
  ('purchase_order', 'create', 'Create purchase orders'),
  ('purchase_order', 'read', 'View purchase orders'),
  ('purchase_order', 'update', 'Update purchase orders'),
  ('purchase_order', 'delete', 'Delete purchase orders'),
  ('purchase_order', 'approve', 'Approve purchase orders'),
  ('purchase_order', 'reject', 'Reject purchase orders'),

  -- POS permissions
  ('pos', 'operate', 'Operate POS terminal'),
  ('pos', 'view_reports', 'View POS reports'),
  ('pos', 'manage', 'Full POS management including shift operations'),

  -- Inventory permissions
  ('inventory', 'view', 'View inventory levels'),
  ('inventory', 'manage_stock', 'Manage stock levels'),
  ('inventory', 'adjust', 'Create stock adjustments'),
  ('inventory', 'count', 'Perform stock counts')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================================
-- SUPER USER ROLE (System-level, no tenant)
-- ============================================================================

-- Create super_user role
INSERT INTO erp.roles (tenant_id, name, slug, description, is_system_role, is_active)
VALUES (NULL, 'Super User', 'super_user', 'App owner with full system access including tenant management', true, true)
ON CONFLICT DO NOTHING;

-- Assign tenant management permissions to super_user
INSERT INTO erp.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM erp.roles r
CROSS JOIN erp.permissions p
WHERE r.slug = 'super_user'
  AND r.is_system_role = true
  AND p.resource = 'tenant'
ON CONFLICT DO NOTHING;

-- Note: To assign super_user role to a specific user, run:
-- INSERT INTO erp.user_roles (user_id, role_id)
-- SELECT '<user-id>', r.id
-- FROM erp.roles r
-- WHERE r.slug = 'super_user' AND r.is_system_role = true
-- ON CONFLICT DO NOTHING;

SELECT 'RBAC seeding completed!' as message;
