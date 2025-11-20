/**
 * Goods Receipt contracts for procurement module
 *
 * CRITICAL: This module includes LOT TRACKING fields that are REQUIRED for perishable products
 *
 * Covers the complete GR lifecycle:
 * 1. Create GR with lot tracking (PROC-004)
 * 2. Post GR to inventory (PROC-005)
 *
 * @module @contracts/erp/procurement/goods-receipts
 * @see FEATURES.md PROC-004 to PROC-005
 * @see USER_STORIES.md Epic 2 - Goods receipts with lot assignment
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  uomRelationSchema,
  locationRelationSchema,
  supplierRelationSchema,
  lotRelationSchema,
  varianceTrackingSchema,
} from '../common.js';
import {
  quantitySchema,
  quantityNonNegativeSchema,
  moneyAmountSchema,
  uuidSchema,
  dateTimeInputSchema,
  lotNumberSchema,
} from '../primitives.js';
import {
  goodsReceiptStatusSchema,
  qualityStatusSchema,
} from '../enums.js';

// ============================================================================
// LINE ITEM SCHEMAS
// ============================================================================

/**
 * Goods Receipt line item for input
 *
 * ⚠️ CRITICAL BUSINESS RULE (from FEATURES.md PROC-005):
 * If product.isPerishable = true, then lotNumber and expiryDate are REQUIRED.
 * This validation happens at the API layer after product lookup.
 *
 * @see FEATURES.md PROC-005 - "Lot tracking REQUIRED for perishables"
 * @see USER_STORIES.md "Lot number and expiry date capture"
 *
 * @example
 * ```typescript
 * // For perishable product:
 * {
 *   productId: "uuid...",
 *   quantityReceived: 100,
 *   uomId: "uuid...",
 *   unitCost: 5.50,
 *   lotNumber: "LOT-2025-001",        // REQUIRED
 *   expiryDate: "2025-06-01T00:00:00Z", // REQUIRED
 *   manufactureDate: "2025-01-15T00:00:00Z", // Optional
 * }
 * ```
 */
export const goodsReceiptItemInputSchema = z.object({
  // Line reference
  purchaseOrderItemId: uuidSchema.optional(), // Optional for standalone GR
  productId: uuidSchema,

  // Quantities
  quantityOrdered: quantityNonNegativeSchema.optional(), // From PO (if applicable)
  quantityReceived: quantitySchema, // REQUIRED: actual received quantity
  uomId: uuidSchema,
  unitCost: z.number().nonnegative('Unit cost cannot be negative'),

  // ⚠️ CRITICAL: Lot tracking fields (REQUIRED for perishables)
  lotNumber: lotNumberSchema.optional(), // Becomes required for perishables
  expiryDate: dateTimeInputSchema.optional(), // Becomes required for perishables
  manufactureDate: dateTimeInputSchema.optional(),

  // Variance tracking
  varianceNotes: z.string().max(500).optional(),

  // Quality control
  qualityStatus: qualityStatusSchema.optional(),
  qualityNotes: z.string().max(500).optional(),

  // Additional notes
  notes: z.string().max(500).optional(),
});

/**
 * Goods Receipt line item response from database
 *
 * Includes calculated variance and lot assignment.
 */
const goodsReceiptItemResponseSchema = z.object({
  id: uuidSchema,
  goodsReceiptId: uuidSchema,
  purchaseOrderItemId: uuidSchema.nullable(),
  productId: uuidSchema,
  lotId: uuidSchema.nullable(), // Created/assigned on posting

  // Quantities (all stored as string from NUMERIC columns)
  quantityOrdered: z.string().nullable(),
  quantityReceived: z.string(),
  varianceQty: z.string().nullable(), // Calculated: received - ordered
  variancePct: z.string().nullable(), // Calculated percentage

  // Pricing
  uomId: uuidSchema,
  unitCost: moneyAmountSchema,

  // Lot tracking
  lotNumber: z.string().nullable(),
  expiryDate: z.date().nullable(),
  manufactureDate: z.date().nullable(),

  // Quality control
  qualityStatus: z.string().nullable(),
  qualityNotes: z.string().nullable(),

  // Variance tracking
  varianceNotes: z.string().nullable(),

  // Additional notes
  notes: z.string().nullable(),
  createdAt: z.date(),

  // Relations
  product: productRelationSchema.extend({
    isPerishable: z.boolean(), // CRITICAL: determines if lot tracking is required
  }).nullable(),
  uom: uomRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

export type GoodsReceiptItemInput = z.infer<typeof goodsReceiptItemInputSchema>;
export type GoodsReceiptItemResponse = z.infer<typeof goodsReceiptItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Goods Receipt schema
 *
 * Business Rules (from FEATURES.md PROC-004):
 * - GR number auto-generated (not in input)
 * - Status starts as "draft"
 * - Can be created from PO or standalone
 * - If from PO: supplierId comes from PO
 * - If standalone: supplierId required
 * - At least 1 line item required
 * - Lot tracking REQUIRED for perishable products (validated per line)
 *
 * @see FEATURES.md PROC-004 - Goods Receipt Creation
 * @see USER_STORIES.md "Record goods receipts when deliveries arrive"
 */
export const goodsReceiptCreateSchema = z
  .object({
    purchaseOrderId: uuidSchema.optional(), // Null for standalone GR
    supplierId: uuidSchema.optional(), // Required if no PO
    locationId: uuidSchema,
    receiptDate: dateTimeInputSchema.optional(), // Defaults to now
    receivedBy: uuidSchema.optional(), // Defaults to current user
    notes: z.string().max(1000).optional(),
    items: z
      .array(goodsReceiptItemInputSchema)
      .min(1, 'At least one item is required')
      .max(100, 'Maximum 100 items per goods receipt'),
  })
  .refine(
    (data) => {
      // Either PO or supplier must be provided
      return data.purchaseOrderId || data.supplierId;
    },
    {
      message: 'Either purchaseOrderId or supplierId must be provided',
    }
  );

/**
 * Update Goods Receipt schema
 *
 * Business Rules:
 * - Only draft GRs can be updated
 * - Cannot update items through this endpoint
 * - Cannot change PO or supplier once created
 */
export const goodsReceiptUpdateSchema = goodsReceiptCreateSchema
  .omit({ items: true, purchaseOrderId: true, supplierId: true })
  .partial();

export type GoodsReceiptCreate = z.infer<typeof goodsReceiptCreateSchema>;
export type GoodsReceiptUpdate = z.infer<typeof goodsReceiptUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Post Goods Receipt to inventory
 *
 * CRITICAL OPERATION (from FEATURES.md PROC-005):
 * - Creates/assigns lot records for each line
 * - Creates stock ledger entries (movement_type = 'rcv')
 * - Creates cost layers for FIFO costing
 * - Updates PO status (receiving → completed when fully received)
 * - Prevents negative stock (database trigger)
 * - Atomic operation (all-or-nothing)
 * - Idempotent (prevents double-posting)
 *
 * @see FEATURES.md PROC-005 - Post Goods Receipt to Inventory
 * @see USER_STORIES.md "Goods receipts automatically update inventory"
 *
 * Business Rules:
 * 1. For each line with lotNumber + expiryDate: create lot if not exists
 * 2. Create stock_ledger entry: type='rcv', qty=+received
 * 3. Create cost_layer entry for FIFO costing
 * 4. Check negative stock constraint (should never trigger on GR)
 * 5. Update PO status if all items fully received
 * 6. Send email notification to purchasing officer
 * 7. Set GR status to "posted" (immutable after)
 */
export const goodsReceiptPostSchema = z.object({
  confirmed: z.literal(true),
  postingNotes: z.string().max(500).optional(),
});

export type GoodsReceiptPost = z.infer<typeof goodsReceiptPostSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Goods Receipt query filters
 */
export const goodsReceiptFiltersSchema = z
  .object({
    status: goodsReceiptStatusSchema.optional(),
    purchaseOrderId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Goods Receipt query schema
 */
export const goodsReceiptQuerySchema = baseQuerySchema.merge(
  goodsReceiptFiltersSchema
);

export type GoodsReceiptFilters = z.infer<typeof goodsReceiptFiltersSchema>;
export type GoodsReceiptQuery = z.infer<typeof goodsReceiptQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Goods Receipt detail schema (complete document)
 *
 * @see FEATURES.md PROC-004, PROC-005 - GR structure
 */
export const goodsReceiptDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  receiptNumber: z.string(), // Auto-generated: GR-YYYYMM-00001
  purchaseOrderId: uuidSchema.nullable(),
  supplierId: uuidSchema.nullable(),
  locationId: uuidSchema,
  receiptDate: z.date(),
  status: goodsReceiptStatusSchema,

  // Workflow
  receivedBy: uuidSchema.nullable(),
  notes: z.string().nullable(),

  // Posting fields
  postedAt: z.date().nullable(),
  postedBy: uuidSchema.nullable(),
  postingNotes: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  purchaseOrder: z.object({
    id: uuidSchema,
    orderNumber: z.string(),
    status: z.string(),
  }).nullable(),
  supplier: supplierRelationSchema.nullable(),
  location: locationRelationSchema.nullable(),
  items: z.array(goodsReceiptItemResponseSchema),
});

/**
 * Goods Receipt list item schema (without nested items)
 */
export const goodsReceiptListItemSchema = goodsReceiptDetailSchema.omit({
  items: true,
});

/**
 * Goods Receipt detail response
 */
export const goodsReceiptResponseSchema = successResponseSchema(
  goodsReceiptDetailSchema
);

/**
 * Goods Receipts paginated response
 */
export const goodsReceiptsResponseSchema = paginatedResponseSchema(
  goodsReceiptListItemSchema
);

export type GoodsReceiptDetail = z.infer<typeof goodsReceiptDetailSchema>;
export type GoodsReceiptListItem = z.infer<typeof goodsReceiptListItemSchema>;
export type GoodsReceiptResponse = z.infer<typeof goodsReceiptResponseSchema>;
export type GoodsReceiptsResponse = z.infer<typeof goodsReceiptsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate lot tracking for perishable product
 *
 * CRITICAL BUSINESS RULE (from FEATURES.md PROC-005):
 * If product.isPerishable = true, then lotNumber and expiryDate are REQUIRED.
 *
 * @param item - GR line item
 * @param isPerishable - Whether the product is perishable
 * @returns Validation result
 */
export function validateLotTracking(
  item: GoodsReceiptItemInput,
  isPerishable: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (isPerishable) {
    if (!item.lotNumber) {
      errors.push('Lot number is required for perishable products');
    }
    if (!item.expiryDate) {
      errors.push('Expiry date is required for perishable products');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate variance for a GR line item
 *
 * Business Rule: Variance = quantityReceived - quantityOrdered
 *
 * @param quantityReceived - Actual received quantity
 * @param quantityOrdered - Originally ordered quantity
 * @returns Variance quantity and percentage
 */
export function calculateVariance(
  quantityReceived: number,
  quantityOrdered?: number
): {
  varianceQty: number;
  variancePct: number | null;
} {
  if (!quantityOrdered || quantityOrdered === 0) {
    return {
      varianceQty: 0,
      variancePct: null,
    };
  }

  const varianceQty = quantityReceived - quantityOrdered;
  const variancePct = (varianceQty / quantityOrdered) * 100;

  return {
    varianceQty,
    variancePct,
  };
}

/**
 * Check if over-delivery requires approval
 *
 * Business Rule (from FEATURES.md PROC-004):
 * Over-delivery requires manager approval if variance > threshold (e.g., 10%)
 *
 * @param variancePct - Variance percentage
 * @param threshold - Approval threshold (default 10%)
 * @returns True if manager approval required
 */
export function requiresOverDeliveryApproval(
  variancePct: number,
  threshold: number = 10
): boolean {
  return variancePct > threshold;
}

/**
 * Generate lot number if not provided
 *
 * Format: LOT-YYYYMMDD-###
 *
 * @param date - Receipt date
 * @param sequence - Sequence number for the day
 * @returns Generated lot number
 */
export function generateLotNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');

  return `LOT-${year}${month}${day}-${seq}`;
}
