-- Seed Tenant Roles for Dapoer Roema
-- This script creates the default roles for the tenant

-- Get the tenant ID for dapoer-roema
DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_role_id uuid;
  v_admin_user_id uuid;
BEGIN
  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM erp.tenants WHERE slug = 'dapoer-roema';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant dapoer-roema not found';
  END IF;

  -- Create Admin role
  INSERT INTO erp.roles (tenant_id, name, slug, description, is_system_role, is_active)
  VALUES (v_tenant_id, 'Administrator', 'admin', 'Full access to all tenant features', false, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_admin_role_id;

  -- If role already exists, get its ID
  IF v_admin_role_id IS NULL THEN
    SELECT id INTO v_admin_role_id FROM erp.roles
    WHERE tenant_id = v_tenant_id AND slug = 'admin';
  END IF;

  -- Assign all non-system permissions to admin role
  INSERT INTO erp.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, p.id
  FROM erp.permissions p
  WHERE p.resource != 'tenant' -- Exclude tenant management (super user only)
  ON CONFLICT DO NOTHING;

  -- Assign admin role to ariefandw@gmail.com for this tenant
  SELECT id INTO v_admin_user_id FROM erp.users
  WHERE email = 'ariefandw@gmail.com' AND tenant_id = v_tenant_id;

  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO erp.user_roles (user_id, role_id)
    VALUES (v_admin_user_id, v_admin_role_id)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Assigned admin role to ariefandw@gmail.com for tenant dapoer-roema';
  END IF;

  RAISE NOTICE 'Tenant roles seeded successfully for dapoer-roema';
END $$;

SELECT 'Tenant role seeding completed!' as message;
