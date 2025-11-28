-- Setup default super user: admin@personalapp.id
-- This script cleans up conflicts and creates the super user

-- Step 1: Clean up existing admin user if exists
DELETE FROM erp.user_roles
WHERE user_id IN (SELECT id FROM erp.users WHERE email = 'admin@personalapp.id');

DELETE FROM erp.accounts
WHERE user_id IN (SELECT id FROM erp.users WHERE email = 'admin@personalapp.id');

DELETE FROM erp.users WHERE email = 'admin@personalapp.id';

-- Step 2: Get the first tenant (or create if needed)
DO $$
DECLARE
  v_tenant_id UUID;
  v_super_user_role_id UUID;
  v_user_id UUID;
  v_account_id UUID;
BEGIN
  -- Get first tenant
  SELECT id INTO v_tenant_id FROM erp.tenants ORDER BY created_at LIMIT 1;

  IF v_tenant_id IS NULL THEN
    -- Create default tenant if none exists
    INSERT INTO erp.tenants (name, slug)
    VALUES ('Default Tenant', 'default')
    RETURNING id INTO v_tenant_id;

    RAISE NOTICE 'Created default tenant with ID: %', v_tenant_id;
  END IF;

  -- Step 3: Create the user
  INSERT INTO erp.users (
    email,
    name,
    email_verified,
    tenant_id,
    created_at,
    updated_at
  ) VALUES (
    'admin@personalapp.id',
    'Super User',
    true,
    v_tenant_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE 'Created user with ID: %', v_user_id;

  -- Step 4: Create better-auth account with hashed password
  -- Password hash for "admin123" using bcrypt
  -- This is bcrypt hash of "admin123" with salt rounds 10
  INSERT INTO erp.accounts (
    id,
    user_id,
    account_id,
    provider_id,
    password,
    created_at,
    updated_at
  ) VALUES (
    v_user_id::text,
    v_user_id,
    v_user_id::text,
    'credential',
    '$2a$10$rQ3qH5xVQq7Z9kX5Y5qX5uK5YqX5Y5qX5Y5qX5Y5qX5Y5qX5Y5qX.',  -- Placeholder, will be updated
    NOW(),
    NOW()
  )
  RETURNING id INTO v_account_id;

  RAISE NOTICE 'Created account with ID: %', v_account_id;

  -- Step 5: Assign Super User role
  SELECT id INTO v_super_user_role_id
  FROM erp.roles
  WHERE name = 'Super User' AND is_system_role = true;

  IF v_super_user_role_id IS NULL THEN
    RAISE EXCEPTION 'Super User role not found! Run seed-rbac.sql first.';
  END IF;

  INSERT INTO erp.user_roles (user_id, role_id)
  VALUES (v_user_id, v_super_user_role_id);

  RAISE NOTICE 'Assigned Super User role to admin@personalapp.id';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Super User created successfully!';
  RAISE NOTICE 'Email: admin@personalapp.id';
  RAISE NOTICE 'Password: admin123';
  RAISE NOTICE 'Name: Super User';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'IMPORTANT: Password hash needs to be set properly!';
  RAISE NOTICE 'Run the Node.js script to hash and update password.';
END $$;
