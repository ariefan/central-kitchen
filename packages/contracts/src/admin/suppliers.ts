/**
 * Supplier Management contracts for admin module
 *
 * Manages supplier master data, contact information, payment terms,
 * and supplier product catalogs with pricing.
 *
 * CRITICAL: Supplier selection impacts:
 * - Purchase order creation
 * - Lead time calculation
 * - Payment terms application
 * - Product pricing
 *
 * Covers:
 * 1. Supplier registration and management (PROC-006)
 * 2. Supplier product catalog management
 * 3. Primary supplier designation
 *
 * @module @contracts/erp/admin/suppliers
 * @see FEATURES.md Section 2.6 - Supplier Management (PROC-006)
 * @see USER_STORIES.md Epic 2 - Procurement
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
  emailSchema,
  phoneSchema,
  moneyAmountSchema,
  entityCodeSchema,
  booleanQueryParamSchema,
} from '../primitives.js';

// ============================================================================
// SUPPLIER CREATION SCHEMAS
// ============================================================================

/**
 * Supplier creation
 *
 * Business Rules (from FEATURES.md PROC-006):
 * - Supplier code is unique per tenant
 * - Email required for PO sending
 * - Payment terms default to 30 days
 * - Lead time used for expected delivery calculation
 *
 * @see FEATURES.md PROC-006 - "Supplier creation with code and name"
 * @see FEATURES.md PROC-006 - "Payment terms configuration"
 * @see FEATURES.md PROC-006 - "Lead time tracking"
 *
 * @example
 * ```typescript
 * {
 *   code: "SUP-001",
 *   name: "ABC Supplies Co.",
 *   email: "orders@abcsupplies.com",
 *   phone: "+1234567890",
 *   address: "123 Main St, City, Country",
 *   paymentTerms: 30,
 *   leadTimeDays: 5,
 *   taxId: "TAX123456"
 * }
 * ```
 */
export const supplierCreateSchema = z.object({
  code: entityCodeSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(200),
  email: emailSchema, // Required for PO sending
  phone: phoneSchema.optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default('Singapore'),

  // Payment & Delivery
  paymentTerms: z.number().int().nonnegative().default(30), // Days (e.g., 30 for Net 30)
  leadTimeDays: z.number().int().nonnegative().default(7), // Default 7 days

  // Registration
  taxId: z.string().max(50).optional(), // Tax identification number
  businessLicense: z.string().max(50).optional(),
  primaryContactName: z.string().max(100).optional(),
  primaryContactPhone: phoneSchema.optional(),

  // Rating & Notes
  rating: z.number().min(0).max(5).optional(), // 0-5 star rating
  notes: z.string().max(1000).optional(),

  isActive: z.boolean().default(true),
});

/**
 * Update supplier
 */
export const supplierUpdateSchema = supplierCreateSchema.partial().omit({ code: true });

export type SupplierCreate = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;

// ============================================================================
// SUPPLIER PRODUCT CATALOG SCHEMAS
// ============================================================================

/**
 * Add product to supplier catalog
 *
 * Business Rules (from FEATURES.md PROC-006):
 * - Only one primary supplier per product
 * - Supplier SKU is supplier's product code
 * - Lead time can override supplier default
 * - Used for PO creation and pricing
 *
 * @see FEATURES.md PROC-006 - "Supplier product catalog"
 * @see FEATURES.md PROC-006 - "Product pricing per supplier"
 * @see FEATURES.md PROC-006 - "Primary supplier designation"
 *
 * @example
 * ```typescript
 * {
 *   productId: "prod-123",
 *   supplierSku: "ABC-FLOUR-001",
 *   unitPrice: 45.00,
 *   uomId: "uom-kg",
 *   leadTimeDays: 3,
 *   isPrimary: true,
 *   minimumOrderQty: 10
 * }
 * ```
 */
export const supplierProductCreateSchema = z.object({
  supplierId: uuidSchema,
  productId: uuidSchema,
  supplierSku: z.string().max(100).optional(), // Supplier's product code
  unitPrice: moneyAmountSchema, // Price per UOM
  uomId: uuidSchema, // Unit of measure for pricing
  leadTimeDays: z.number().int().nonnegative().optional(), // Override supplier default
  minimumOrderQty: z.number().nonnegative().optional(), // MOQ
  isPrimary: z.boolean().default(false), // Primary supplier for this product
  isActive: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

/**
 * Update supplier product
 */
export const supplierProductUpdateSchema = supplierProductCreateSchema
  .partial()
  .omit({ supplierId: true, productId: true });

/**
 * Set primary supplier for product
 *
 * Business Rule: Only one primary supplier per product
 */
export const setPrimarySupplierSchema = z.object({
  productId: uuidSchema,
  supplierId: uuidSchema,
});

export type SupplierProductCreate = z.infer<typeof supplierProductCreateSchema>;
export type SupplierProductUpdate = z.infer<typeof supplierProductUpdateSchema>;
export type SetPrimarySupplier = z.infer<typeof setPrimarySupplierSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Supplier query filters
 */
export const supplierFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    code: z.string().optional(), // Search by code
    email: z.string().optional(), // Search by email
    isActive: booleanQueryParamSchema.optional(), // Boolean from string query param
    minRating: z.coerce.number().min(0).max(5).optional(), // Filter by minimum rating (coerce from string)
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Supplier query schema
 */
export const supplierQuerySchema = baseQuerySchema.merge(supplierFiltersSchema);

/**
 * Supplier product query filters
 */
export const supplierProductFiltersSchema = z.object({
  supplierId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Supplier product query schema
 */
export const supplierProductQuerySchema = baseQuerySchema.merge(supplierProductFiltersSchema);

export type SupplierFilters = z.infer<typeof supplierFiltersSchema>;
export type SupplierQuery = z.infer<typeof supplierQuerySchema>;
export type SupplierProductFilters = z.infer<typeof supplierProductFiltersSchema>;
export type SupplierProductQuery = z.infer<typeof supplierProductQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Supplier product detail schema
 */
export const supplierProductDetailSchema = z.object({
  id: uuidSchema,
  supplierId: uuidSchema,
  productId: uuidSchema,
  supplierSku: z.string().nullable(),
  unitPrice: z.string(), // Money amount
  uomId: uuidSchema,
  leadTimeDays: z.number().nullable(),
  minimumOrderQty: z.string().nullable(), // Quantity
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  notes: z.string().nullable(),

  // Product relation (minimal)
  product: z.object({
    id: uuidSchema,
    sku: z.string(),
    name: z.string(),
  }),

  // UOM relation
  uom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),

  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Supplier detail schema
 *
 * @see FEATURES.md PROC-006 - Supplier structure
 */
export const supplierDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique supplier code
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string(),

  // Payment & Delivery
  paymentTerms: z.number(), // Days
  leadTimeDays: z.number(), // Days

  // Registration
  taxId: z.string().nullable(),
  businessLicense: z.string().nullable(),
  primaryContactName: z.string().nullable(),
  primaryContactPhone: z.string().nullable(),

  // Rating & Status
  rating: z.number().nullable(), // 0-5
  isActive: z.boolean(),
  notes: z.string().nullable(),

  // Statistics
  totalPurchaseOrders: z.number().int(),
  totalSpent: z.string(), // Money amount
  lastPurchaseOrderDate: z.date().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations (optional)
  products: z.array(supplierProductDetailSchema).optional(),
});

/**
 * Supplier list item schema (without products)
 */
export const supplierListItemSchema = supplierDetailSchema.omit({
  products: true,
  notes: true,
});

/**
 * Supplier response
 */
export const supplierResponseSchema = successResponseSchema(supplierDetailSchema);

/**
 * Suppliers paginated response
 */
export const suppliersResponseSchema = paginatedResponseSchema(supplierListItemSchema);

/**
 * Supplier product response
 */
export const supplierProductResponseSchema = successResponseSchema(supplierProductDetailSchema);

/**
 * Supplier products response
 */
export const supplierProductsResponseSchema = successResponseSchema(
  z.object({
    supplierId: uuidSchema,
    products: z.array(supplierProductDetailSchema),
  })
);

export type SupplierProductDetail = z.infer<typeof supplierProductDetailSchema>;
export type SupplierDetail = z.infer<typeof supplierDetailSchema>;
export type SupplierListItem = z.infer<typeof supplierListItemSchema>;
export type SupplierResponse = z.infer<typeof supplierResponseSchema>;
export type SuppliersResponse = z.infer<typeof suppliersResponseSchema>;
export type SupplierProductResponse = z.infer<typeof supplierProductResponseSchema>;
export type SupplierProductsResponse = z.infer<typeof supplierProductsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate supplier code
 *
 * Business Rule (from FEATURES.md PROC-006):
 * Auto-generated format: SUP-00001
 *
 * @param lastCode - Last used supplier code (e.g., "SUP-00050")
 * @returns Next supplier code (e.g., "SUP-00051")
 */
export function generateNextSupplierCode(lastCode: string): string {
  const match = lastCode.match(/^SUP-(\\d+)$/);
  if (!match) return 'SUP-00001';

  const nextNumber = parseInt(match[1], 10) + 1;
  return `SUP-${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Calculate expected delivery date
 *
 * Business Rule (from FEATURES.md PROC-006):
 * Expected delivery = order date + lead time days
 *
 * @param orderDate - Order date
 * @param leadTimeDays - Lead time in days
 * @returns Expected delivery date
 */
export function calculateExpectedDelivery(
  orderDate: Date,
  leadTimeDays: number
): Date {
  const delivery = new Date(orderDate);
  delivery.setDate(delivery.getDate() + leadTimeDays);
  return delivery;
}

/**
 * Validate unique supplier code
 *
 * Business Rule (from FEATURES.md PROC-006):
 * Supplier code is unique per tenant
 *
 * @param code - Supplier code
 * @param existingCodes - List of existing codes in tenant
 * @returns Validation result
 */
export function validateUniqueSupplierCode(
  code: string,
  existingCodes: string[]
): { valid: boolean; error?: string } {
  if (existingCodes.includes(code.toUpperCase())) {
    return {
      valid: false,
      error: 'Supplier code already exists',
    };
  }
  return { valid: true };
}

/**
 * Validate only one primary supplier per product
 *
 * Business Rule (from FEATURES.md PROC-006):
 * Only one primary supplier per product
 *
 * @param productId - Product ID
 * @param supplierId - Supplier ID to set as primary
 * @param currentPrimarySuppliers - Current primary supplier assignments
 * @returns Validation result
 */
export function validatePrimarySupplier(
  productId: string,
  supplierId: string,
  currentPrimarySuppliers: Array<{ productId: string; supplierId: string }>
): { valid: boolean; conflictingSupplierId?: string } {
  const existing = currentPrimarySuppliers.find((sp) => sp.productId === productId);

  if (existing && existing.supplierId !== supplierId) {
    return {
      valid: false,
      conflictingSupplierId: existing.supplierId,
    };
  }

  return { valid: true };
}

/**
 * Calculate supplier performance score
 *
 * Business Rule: Score based on on-time delivery, quality, and cost
 *
 * @param metrics - Supplier performance metrics
 * @returns Performance score (0-100)
 */
export function calculateSupplierPerformance(metrics: {
  onTimeDeliveryRate: number; // Percentage (0-100)
  qualityAcceptanceRate: number; // Percentage (0-100)
  priceCompetitiveness: number; // Percentage (0-100)
}): number {
  const weights = {
    onTime: 0.4,
    quality: 0.4,
    price: 0.2,
  };

  const score =
    metrics.onTimeDeliveryRate * weights.onTime +
    metrics.qualityAcceptanceRate * weights.quality +
    metrics.priceCompetitiveness * weights.price;

  return Math.round(score);
}

/**
 * Convert performance score to star rating
 *
 * @param score - Performance score (0-100)
 * @returns Star rating (0-5)
 */
export function scoreToStarRating(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

/**
 * Get supplier tier based on total spent
 *
 * Business Rule: Categorize suppliers by spend volume
 *
 * @param totalSpent - Total amount spent with supplier
 * @returns Supplier tier
 */
export function getSupplierTier(
  totalSpent: number
): 'strategic' | 'preferred' | 'approved' | 'new' {
  if (totalSpent >= 100000) return 'strategic'; // >$100k
  if (totalSpent >= 50000) return 'preferred'; // $50k-$100k
  if (totalSpent >= 10000) return 'approved'; // $10k-$50k
  return 'new'; // <$10k
}

/**
 * Check if supplier can receive new POs
 *
 * Business Rule (from FEATURES.md PROC-006):
 * Inactive suppliers cannot receive new POs
 *
 * @param isActive - Supplier active status
 * @returns True if can receive POs
 */
export function canReceivePurchaseOrders(isActive: boolean): boolean {
  return isActive;
}

/**
 * Format payment terms display
 *
 * Helper for UI display.
 *
 * @param paymentTerms - Payment terms in days
 * @returns Formatted display string
 */
export function formatPaymentTerms(paymentTerms: number): string {
  if (paymentTerms === 0) return 'Cash on Delivery';
  if (paymentTerms === 7) return 'Net 7';
  if (paymentTerms === 15) return 'Net 15';
  if (paymentTerms === 30) return 'Net 30';
  if (paymentTerms === 60) return 'Net 60';
  if (paymentTerms === 90) return 'Net 90';
  return `Net ${paymentTerms}`;
}

/**
 * Calculate payment due date
 *
 * Business Rule: Due date = invoice date + payment terms
 *
 * @param invoiceDate - Invoice date
 * @param paymentTerms - Payment terms in days
 * @returns Payment due date
 */
export function calculatePaymentDueDate(
  invoiceDate: Date,
  paymentTerms: number
): Date {
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  return dueDate;
}

/**
 * Get supplier status indicator
 *
 * Helper for UI display.
 *
 * @param isActive - Supplier active status
 * @param rating - Supplier rating (0-5)
 * @returns Status indicator
 */
export function getSupplierStatus(
  isActive: boolean,
  rating: number | null
): 'active_high' | 'active_medium' | 'active_low' | 'inactive' {
  if (!isActive) return 'inactive';
  if (rating === null) return 'active_medium';
  if (rating >= 4) return 'active_high';
  if (rating >= 2) return 'active_medium';
  return 'active_low';
}
