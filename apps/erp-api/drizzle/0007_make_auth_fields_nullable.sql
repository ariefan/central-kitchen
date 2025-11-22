-- Make auth_user_id and tenant_id nullable for better-auth compatibility
ALTER TABLE "erp"."users" ALTER COLUMN "auth_user_id" DROP NOT NULL;
ALTER TABLE "erp"."users" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- Create default tenant for new signups
INSERT INTO "erp"."tenants" (org_id, name, slug, is_active, created_at, updated_at)
VALUES ('default', 'Default Organization', 'default', true, now(), now())
ON CONFLICT DO NOTHING;
