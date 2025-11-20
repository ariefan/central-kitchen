-- Update UOM schema for ADM-003 implementation
-- Add tenant isolation and additional fields to uoms table

--> statement-breakpoint
-- Add new columns to uoms table (nullable first, then update and make NOT NULL)
ALTER TABLE "erp"."uoms" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD COLUMN "uom_type" varchar(20);
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD COLUMN "description" varchar(500);
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD COLUMN "is_active" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD COLUMN "updated_at" timestamp DEFAULT now();
--> statement-breakpoint
-- Migrate kind column data to uom_type
UPDATE "erp"."uoms" SET "uom_type" = COALESCE("kind", 'count');
--> statement-breakpoint
-- Set tenant_id to first available tenant for existing rows
UPDATE "erp"."uoms" SET "tenant_id" = (SELECT id FROM "erp"."tenants" LIMIT 1) WHERE "tenant_id" IS NULL;
--> statement-breakpoint
-- Set is_active to true for existing rows
UPDATE "erp"."uoms" SET "is_active" = true WHERE "is_active" IS NULL;
--> statement-breakpoint
-- Now make columns NOT NULL
ALTER TABLE "erp"."uoms" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ALTER COLUMN "uom_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ALTER COLUMN "is_active" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
-- Extend name column length
ALTER TABLE "erp"."uoms" ALTER COLUMN "name" TYPE varchar(100);
--> statement-breakpoint
-- Extend symbol column length
ALTER TABLE "erp"."uoms" ALTER COLUMN "symbol" TYPE varchar(20);
--> statement-breakpoint
-- Add tenantId to uom_conversions table
ALTER TABLE "erp"."uom_conversions" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD COLUMN "updated_at" timestamp DEFAULT now();
--> statement-breakpoint
-- Set tenant_id for existing conversions
UPDATE "erp"."uom_conversions" SET "tenant_id" = (SELECT id FROM "erp"."tenants" LIMIT 1) WHERE "tenant_id" IS NULL;
--> statement-breakpoint
-- Set updated_at for existing conversions
UPDATE "erp"."uom_conversions" SET "updated_at" = now() WHERE "updated_at" IS NULL;
--> statement-breakpoint
-- Make NOT NULL
ALTER TABLE "erp"."uom_conversions" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "erp"."uoms" ADD CONSTRAINT "uoms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD CONSTRAINT "uom_conversions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Drop old unique constraint and create new one with tenantId
ALTER TABLE "erp"."uoms" DROP CONSTRAINT IF EXISTS "uq_uom_code";
--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD CONSTRAINT "uq_uom_tenant_code" UNIQUE("tenant_id", "code");
--> statement-breakpoint
-- Drop old unique constraint on uom_conversions and create new one with tenantId
ALTER TABLE "erp"."uom_conversions" DROP CONSTRAINT IF EXISTS "uq_conv_pair";
--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD CONSTRAINT "uq_conv_tenant_pair" UNIQUE("tenant_id", "from_uom_id", "to_uom_id");
--> statement-breakpoint
-- Drop old kind column
ALTER TABLE "erp"."uoms" DROP COLUMN IF EXISTS "kind";
