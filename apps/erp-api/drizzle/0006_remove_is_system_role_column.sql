-- Migration: Remove is_system_role column from roles table
-- This migration removes the is_system_role column as it's no longer needed
-- All roles are now managed through RBAC permissions

-- Drop the index first
DROP INDEX IF EXISTS idx_role_is_system_role ON erp.roles;

-- Drop the column
ALTER TABLE erp.roles 
DROP COLUMN IF EXISTS is_system_role;