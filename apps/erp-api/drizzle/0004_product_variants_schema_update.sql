/**
 * Migration: Update product_variants table to match contract schema
 *
 * Changes:
 * 1. Merge code + name into variantName
 * 2. Rename extraPrice to priceDifferential (change type to varchar for precision)
 * 3. Add barcode, sku, displayOrder, updatedAt fields
 *
 * @see packages/contracts/src/admin/products.ts - productVariantDetailSchema
 * @see FEATURES.md Section 12.2 - Product Variants (ADM-002)
 */

-- Step 1: Add new columns (nullable first)
ALTER TABLE "erp"."product_variants" ADD COLUMN "variant_name" varchar(128);
ALTER TABLE "erp"."product_variants" ADD COLUMN "price_differential" varchar(32);
ALTER TABLE "erp"."product_variants" ADD COLUMN "barcode" varchar(255);
ALTER TABLE "erp"."product_variants" ADD COLUMN "sku" varchar(100);
ALTER TABLE "erp"."product_variants" ADD COLUMN "display_order" integer DEFAULT 0;
ALTER TABLE "erp"."product_variants" ADD COLUMN "updated_at" timestamp;

-- Step 2: Migrate data from old columns to new columns
-- Combine code and name into variantName (e.g., "L - Large")
UPDATE "erp"."product_variants"
SET "variant_name" = COALESCE("name", "code")
WHERE "variant_name" IS NULL;

-- Convert extraPrice numeric to varchar priceDifferential
UPDATE "erp"."product_variants"
SET "price_differential" = COALESCE("extra_price"::text, '0')
WHERE "price_differential" IS NULL;

-- Set default updated_at to created_at for existing records
UPDATE "erp"."product_variants"
SET "updated_at" = "created_at"
WHERE "updated_at" IS NULL;

-- Step 3: Make new columns NOT NULL (except nullable ones)
ALTER TABLE "erp"."product_variants" ALTER COLUMN "variant_name" SET NOT NULL;
ALTER TABLE "erp"."product_variants" ALTER COLUMN "price_differential" SET NOT NULL;
ALTER TABLE "erp"."product_variants" ALTER COLUMN "display_order" SET NOT NULL;
ALTER TABLE "erp"."product_variants" ALTER COLUMN "updated_at" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "erp"."product_variants" DROP COLUMN "code";
ALTER TABLE "erp"."product_variants" DROP COLUMN "name";
ALTER TABLE "erp"."product_variants" DROP COLUMN "extra_price";

-- Step 5: Drop old unique constraint and create new one
ALTER TABLE "erp"."product_variants" DROP CONSTRAINT IF EXISTS "uq_variant_prod_code";
ALTER TABLE "erp"."product_variants" ADD CONSTRAINT "uq_variant_prod_name" UNIQUE ("product_id", "variant_name");

-- Step 6: Add index on display_order for sorting
CREATE INDEX IF NOT EXISTS "idx_variant_display_order" ON "erp"."product_variants" ("product_id", "display_order");
