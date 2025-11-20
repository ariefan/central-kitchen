/**
 * Product Catalog Management contracts for admin module
 *
 * Manages product master data including raw materials, semi-finished goods,
 * finished goods, packaging, and consumables. Includes product variants
 * for size, flavor, and other variations.
 *
 * CRITICAL: Product catalog impacts:
 * - Inventory management
 * - Purchase orders
 * - Production recipes
 * - Sales orders and POS
 * - Pricing and costing
 *
 * Covers:
 * 1. Product catalog management (ADM-001)
 * 2. Product variants (size, flavor) (ADM-002)
 * 3. Barcode management
 * 4. Bulk import/export
 *
 * @module @contracts/erp/admin/products
 * @see FEATURES.md Section 12.1-12.2 - Product Management (ADM-001, ADM-002)
 * @see USER_STORIES.md Epic 12 - System Administration
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
} from '../common.js';
import {
  uuidSchema,
  skuSchema,
  barcodeSchema,
  moneyAmountSchema,
  entityCodeSchema,
  booleanQueryParamSchema,
} from '../primitives.js';
import { productKindSchema } from '../enums.js';

// ============================================================================
// PRODUCT CREATION SCHEMAS
// ============================================================================

/**
 * Product creation
 *
 * Business Rules (from FEATURES.md ADM-001):
 * - SKU is unique per tenant
 * - Base UOM required (e.g., kg, L, pcs)
 * - Shelf life days required for perishable items
 * - Standard cost used for valuation
 * - Default price used if no price book entry
 * - Barcode can be scanned for quick lookup
 *
 * @see FEATURES.md ADM-001 - "Product creation with SKU, name, description"
 * @see FEATURES.md ADM-001 - "Product kinds (raw_material, semi_finished, finished_good, packaging, consumable)"
 * @see FEATURES.md ADM-001 - "Perishable flag with shelf life days"
 *
 * @example
 * ```typescript
 * {
 *   sku: "FLOUR-AP-001",
 *   name: "All-Purpose Flour",
 *   description: "Premium all-purpose flour for baking",
 *   productKind: "raw_material",
 *   baseUomId: "uom-kg",
 *   standardCost: 2.50,
 *   defaultPrice: 5.00,
 *   taxCategoryId: "tax-food",
 *   isPerishable: true,
 *   shelfLifeDays: 180,
 *   barcode: "1234567890123"
 * }
 * ```
 */
export const productCreateSchema = z.object({
  sku: skuSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  productKind: productKindSchema, // raw_material, semi_finished, finished_good, packaging, consumable
  baseUomId: uuidSchema, // Base unit of measure (required)

  // Costing & Pricing
  standardCost: moneyAmountSchema.optional(), // Used for valuation
  defaultPrice: moneyAmountSchema.optional(), // Used if no price book entry
  taxCategoryId: z.string().max(32).optional(), // Tax category code (e.g., "GENERAL", "FOOD", "EXEMPT")

  // Perishability
  isPerishable: z.boolean().default(false),
  shelfLifeDays: z.number().int().positive().optional(), // Required if perishable

  // Identification
  barcode: barcodeSchema.optional(),
  imageUrl: z.string().url().optional(),

  // Categorization
  categoryIds: z.array(uuidSchema).optional(), // Product categories

  // Status
  isActive: z.boolean().default(true),

  // Additional fields
  notes: z.string().max(1000).optional(),
  metadata: z.any().optional(), // JSON metadata
});

/**
 * Update product
 *
 * Business Rules:
 * - Cannot change SKU after creation
 * - Inactive products not available for new transactions
 */
export const productUpdateSchema = productCreateSchema.partial().omit({ sku: true });

/**
 * Bulk import products
 *
 * Business Rule: Import from Excel for bulk creation
 */
export const productBulkImportSchema = z.object({
  products: z.array(productCreateSchema).min(1).max(1000), // Max 1000 per batch
  updateExisting: z.boolean().default(false), // true = update, false = create only
});

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductBulkImport = z.infer<typeof productBulkImportSchema>;

// ============================================================================
// PRODUCT VARIANT SCHEMAS
// ============================================================================

/**
 * Product variant creation
 *
 * Business Rules (from FEATURES.md ADM-002):
 * - Variant inherits product properties (tax, category)
 * - Variant price = base price + price_differential
 * - Price differential can be negative (discount)
 * - Inactive variants not available for selection
 * - Used in POS and online ordering
 *
 * @see FEATURES.md ADM-002 - "Variant creation linked to base product"
 * @see FEATURES.md ADM-002 - "Price differential (extra charge)"
 *
 * @example
 * ```typescript
 * {
 *   productId: "prod-123",
 *   variantName: "Large",
 *   priceDifferential: 2.00,
 *   barcode: "1234567890124"
 * }
 * ```
 */
export const productVariantCreateSchema = z.object({
  productId: uuidSchema,
  variantName: z.string().min(1).max(100), // e.g., "Large", "Strawberry"
  priceDifferential: moneyAmountSchema.default('0'), // Extra charge (can be negative)
  barcode: barcodeSchema.optional(), // Variant-specific barcode
  sku: skuSchema.optional(), // Variant-specific SKU
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});

/**
 * Update product variant
 */
export const productVariantUpdateSchema = productVariantCreateSchema
  .partial()
  .omit({ productId: true });

export type ProductVariantCreate = z.infer<typeof productVariantCreateSchema>;
export type ProductVariantUpdate = z.infer<typeof productVariantUpdateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Product query filters
 */
export const productFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    sku: z.string().optional(), // Search by SKU
    barcode: z.string().optional(), // Search by barcode
    productKind: productKindSchema.optional(),
    categoryId: uuidSchema.optional(), // Filter by category
    isPerishable: booleanQueryParamSchema.optional(), // Boolean from string query param
    isActive: booleanQueryParamSchema.optional(), // Boolean from string query param
    supplierId: uuidSchema.optional(), // Products from supplier
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Product query schema
 */
export const productQuerySchema = baseQuerySchema.merge(productFiltersSchema);

/**
 * Product variant query filters
 */
export const productVariantFiltersSchema = z.object({
  productId: uuidSchema.optional(),
  isActive: booleanQueryParamSchema.optional(),
});

/**
 * Product variant query schema
 */
export const productVariantQuerySchema = baseQuerySchema.merge(productVariantFiltersSchema);

export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductVariantFilters = z.infer<typeof productVariantFiltersSchema>;
export type ProductVariantQuery = z.infer<typeof productVariantQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Product variant detail schema
 */
export const productVariantDetailSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  variantName: z.string(),
  priceDifferential: z.string(), // Money amount
  barcode: z.string().nullable(),
  sku: z.string().nullable(),
  isActive: z.boolean(),
  displayOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Product category detail schema
 */
export const productCategoryDetailSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  parentId: uuidSchema.nullable(),
});

/**
 * Product detail schema
 *
 * @see FEATURES.md ADM-001 - Product structure
 */
export const productDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  sku: z.string(), // Unique SKU
  name: z.string(),
  description: z.string().nullable(),
  productKind: z.string(), // raw_material, semi_finished, finished_good, packaging, consumable
  baseUomId: uuidSchema,

  // Costing & Pricing
  standardCost: z.string().nullable(), // Money amount
  defaultPrice: z.string().nullable(), // Money amount
  taxCategoryId: uuidSchema.nullable(),

  // Perishability
  isPerishable: z.boolean(),
  shelfLifeDays: z.number().nullable(),

  // Identification
  barcode: z.string().nullable(),
  imageUrl: z.string().nullable(),

  // Status
  isActive: z.boolean(),

  // Additional
  notes: z.string().nullable(),
  metadata: z.any().nullable(),

  // Relations
  baseUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),

  taxCategory: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    rate: z.string(), // Tax rate (percentage)
  }).nullable(),

  categories: z.array(productCategoryDetailSchema),
  variants: z.array(productVariantDetailSchema),

  // Statistics
  totalOnHand: z.string(), // Quantity across all locations
  totalValue: z.string(), // Money amount
  lastPurchaseDate: z.date().nullable(),
  lastSaleDate: z.date().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Product list item schema (without detailed relations)
 */
export const productListItemSchema = productDetailSchema.omit({
  categories: true,
  variants: true,
  metadata: true,
  notes: true,
});

/**
 * Product response
 */
export const productResponseSchema = successResponseSchema(productDetailSchema);

/**
 * Products paginated response
 */
export const productsResponseSchema = paginatedResponseSchema(productListItemSchema);

/**
 * Product variant response
 */
export const productVariantResponseSchema = successResponseSchema(productVariantDetailSchema);

/**
 * Product variants paginated response
 */
export const productVariantsResponseSchema = paginatedResponseSchema(productVariantDetailSchema);

/**
 * Bulk import result
 */
export const productBulkImportResponseSchema = successResponseSchema(
  z.object({
    totalProcessed: z.number().int(),
    created: z.number().int(),
    updated: z.number().int(),
    failed: z.number().int(),
    errors: z.array(z.object({
      row: z.number().int(),
      sku: z.string().optional(),
      error: z.string(),
    })),
  })
);

export type ProductVariantDetail = z.infer<typeof productVariantDetailSchema>;
export type ProductCategoryDetail = z.infer<typeof productCategoryDetailSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;
export type ProductVariantResponse = z.infer<typeof productVariantResponseSchema>;
export type ProductVariantsResponse = z.infer<typeof productVariantsResponseSchema>;
export type ProductBulkImportResponse = z.infer<typeof productBulkImportResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate product SKU
 *
 * Business Rule (from FEATURES.md ADM-001):
 * Auto-generated format based on product kind and sequence
 *
 * @param productKind - Product kind
 * @param lastSequence - Last used sequence number
 * @returns Next SKU
 */
export function generateNextProductSKU(
  productKind: string,
  lastSequence: number
): string {
  const prefixes: Record<string, string> = {
    raw_material: 'RM',
    semi_finished: 'SF',
    finished_good: 'FG',
    packaging: 'PK',
    consumable: 'CS',
  };

  const prefix = prefixes[productKind] || 'PRD';
  const sequence = (lastSequence + 1).toString().padStart(5, '0');
  return `${prefix}-${sequence}`;
}

/**
 * Validate unique SKU per tenant
 *
 * Business Rule (from FEATURES.md ADM-001):
 * SKU is unique per tenant
 *
 * @param sku - Product SKU
 * @param existingSkus - List of existing SKUs in tenant
 * @returns Validation result
 */
export function validateUniqueProductSKU(
  sku: string,
  existingSkus: string[]
): { valid: boolean; error?: string } {
  if (existingSkus.includes(sku.toUpperCase())) {
    return {
      valid: false,
      error: 'SKU already exists',
    };
  }
  return { valid: true };
}

/**
 * Validate shelf life for perishable products
 *
 * Business Rule (from FEATURES.md ADM-001):
 * Shelf life days required for perishable items
 *
 * @param isPerishable - Whether product is perishable
 * @param shelfLifeDays - Shelf life in days
 * @returns Validation result
 */
export function validateShelfLife(
  isPerishable: boolean,
  shelfLifeDays: number | undefined
): { valid: boolean; error?: string } {
  if (isPerishable && !shelfLifeDays) {
    return {
      valid: false,
      error: 'Shelf life days required for perishable products',
    };
  }
  if (!isPerishable && shelfLifeDays) {
    return {
      valid: false,
      error: 'Non-perishable products should not have shelf life',
    };
  }
  return { valid: true };
}

/**
 * Calculate variant price
 *
 * Business Rule (from FEATURES.md ADM-002):
 * Variant price = base price + price_differential
 *
 * @param basePrice - Base product price
 * @param priceDifferential - Variant price differential
 * @returns Final variant price
 */
export function calculateVariantPrice(
  basePrice: number,
  priceDifferential: number
): number {
  return Math.max(0, basePrice + priceDifferential);
}

/**
 * Check if product is in stock
 *
 * @param onHandQuantity - On-hand quantity
 * @returns True if in stock
 */
export function isInStock(onHandQuantity: number): boolean {
  return onHandQuantity > 0;
}

/**
 * Get stock status
 *
 * Business Rule: Categorize based on on-hand quantity
 *
 * @param onHandQuantity - On-hand quantity
 * @param reorderPoint - Reorder point (optional)
 * @returns Stock status
 */
export function getStockStatus(
  onHandQuantity: number,
  reorderPoint?: number
): 'out_of_stock' | 'low_stock' | 'in_stock' | 'overstock' {
  if (onHandQuantity === 0) return 'out_of_stock';
  if (reorderPoint && onHandQuantity <= reorderPoint) return 'low_stock';
  if (reorderPoint && onHandQuantity > reorderPoint * 5) return 'overstock';
  return 'in_stock';
}

/**
 * Calculate inventory value
 *
 * Business Rule: Value = quantity × standard cost
 *
 * @param quantity - On-hand quantity
 * @param standardCost - Standard cost per unit
 * @returns Inventory value
 */
export function calculateInventoryValue(
  quantity: number,
  standardCost: number
): number {
  return quantity * standardCost;
}

/**
 * Get product type display
 *
 * Helper for UI display.
 *
 * @param productKind - Product kind
 * @returns Display name
 */
export function getProductKindDisplay(productKind: string): string {
  const displays: Record<string, string> = {
    raw_material: 'Raw Material',
    semi_finished: 'Semi-Finished Good',
    finished_good: 'Finished Good',
    packaging: 'Packaging',
    consumable: 'Consumable',
  };
  return displays[productKind] || productKind;
}

/**
 * Format product display name
 *
 * Helper for UI display.
 *
 * @param name - Product name
 * @param sku - Product SKU
 * @returns Formatted display name
 */
export function formatProductDisplayName(name: string, sku: string): string {
  return `${name} (${sku})`;
}

/**
 * Format variant display name
 *
 * Helper for UI display.
 *
 * @param productName - Base product name
 * @param variantName - Variant name
 * @returns Formatted display name
 */
export function formatVariantDisplayName(
  productName: string,
  variantName: string
): string {
  return `${productName} - ${variantName}`;
}

/**
 * Determine if product can be sold
 *
 * Business Rule (from FEATURES.md ADM-001):
 * Inactive products not available for new transactions
 *
 * @param isActive - Product active status
 * @param onHandQuantity - On-hand quantity
 * @returns True if can be sold
 */
export function canBeSold(isActive: boolean, onHandQuantity: number): boolean {
  return isActive && onHandQuantity > 0;
}

/**
 * Determine if product can be purchased
 *
 * Business Rule: Active products can be purchased
 *
 * @param isActive - Product active status
 * @returns True if can be purchased
 */
export function canBePurchased(isActive: boolean): boolean {
  return isActive;
}

/**
 * Get perishable products requiring attention
 *
 * Business Rule: Products nearing expiry
 *
 * @param shelfLifeDays - Shelf life in days
 * @param daysSinceReceived - Days since received
 * @returns Alert level
 */
export function getPerishableAlertLevel(
  shelfLifeDays: number,
  daysSinceReceived: number
): 'critical' | 'warning' | 'ok' {
  const remainingDays = shelfLifeDays - daysSinceReceived;
  const percentageRemaining = (remainingDays / shelfLifeDays) * 100;

  if (percentageRemaining <= 10) return 'critical'; // ≤10% shelf life
  if (percentageRemaining <= 25) return 'warning'; // ≤25% shelf life
  return 'ok';
}
