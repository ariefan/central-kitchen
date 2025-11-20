/**
 * Stock Adjustment contracts for inventory module
 *
 * Stock adjustments correct inventory discrepancies found through:
 * - Physical stock counts
 * - Damage, waste, theft, expiry
 * - System corrections
 *
 * CRITICAL: All adjustments require manager approval before posting to ledger
 *
 * Covers the complete adjustment lifecycle:
 * 1. Create adjustment with reason (INV-003)
 * 2. Manager approval workflow
 * 3. Post to inventory (creates ledger entry)
 * 4. Audit trail
 *
 * @module @contracts/erp/inventory/adjustments
 * @see FEATURES.md INV-003 - Stock Adjustments
 * @see USER_STORIES.md Epic 3 - Stock Adjustments
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  approvalSchema,
  rejectionSchema,
  productRelationSchema,
  uomRelationSchema,
  locationRelationSchema,
  lotRelationSchema,
} from '../common.js';
import {
  quantityDeltaSchema,
  moneyAmountSchema,
  uuidSchema,
  dateTimeInputSchema,
} from '../primitives.js';
import {
  adjustmentKindSchema,
  adjustmentStatusSchema,
} from '../enums.js';

// ============================================================================
// LINE ITEM SCHEMAS
// ============================================================================

/**
 * Adjustment line item for input
 *
 * CRITICAL Business Rules (from FEATURES.md INV-003):
 * - quantity: Can be positive or negative
 * - Positive = found/correction up
 * - Negative = damage/waste/theft/expiry
 * - Lot-specific adjustments supported
 * - Cost tracking for valuation impact
 *
 * @see FEATURES.md INV-003 - "Positive quantity = found/correction up"
 * @see FEATURES.md INV-003 - "Negative quantity = damage/waste/theft/expiry"
 *
 * @example
 * ```typescript
 * // Damage adjustment (negative)
 * {
 *   productId: "uuid...",
 *   lotId: "uuid...",
 *   quantity: -10, // 10 units damaged
 *   uomId: "uuid...",
 *   unitCost: 5.50,
 *   reasonNotes: "Damaged during handling"
 * }
 *
 * // Found inventory (positive)
 * {
 *   productId: "uuid...",
 *   quantity: 50, // 50 units found
 *   uomId: "uuid...",
 *   unitCost: 5.50,
 *   reasonNotes: "Found in back storage"
 * }
 * ```
 */
export const adjustmentItemInputSchema = z.object({
  productId: uuidSchema,
  lotId: uuidSchema.optional(), // Required for lot-specific adjustments
  quantity: quantityDeltaSchema, // Can be positive (found) or negative (loss)
  uomId: uuidSchema,
  unitCost: z.number().nonnegative('Unit cost cannot be negative'),
  reasonNotes: z.string().max(500).optional(),
});

/**
 * Adjustment line item response from database
 *
 * Includes calculated cost impact.
 */
const adjustmentItemResponseSchema = z.object({
  id: uuidSchema,
  adjustmentId: uuidSchema,
  productId: uuidSchema,
  lotId: uuidSchema.nullable(),

  // Quantities (stored as string from NUMERIC columns)
  quantity: z.string(), // Can be negative
  uomId: uuidSchema,

  // Cost tracking
  unitCost: moneyAmountSchema,
  costImpact: moneyAmountSchema, // quantity × unitCost

  // Notes
  reasonNotes: z.string().nullable(),
  createdAt: z.date(),

  // Relations
  product: productRelationSchema.nullable(),
  uom: uomRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

export type AdjustmentItemInput = z.infer<typeof adjustmentItemInputSchema>;
export type AdjustmentItemResponse = z.infer<typeof adjustmentItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Adjustment schema
 *
 * Business Rules (from FEATURES.md INV-003):
 * - Adjustment number auto-generated (not in input)
 * - Status starts as "draft"
 * - Reason types: damage, expiry, theft, found, correction, waste, spoilage
 * - Manager approval required before posting
 * - At least 1 line item required
 * - Cannot post if results in negative inventory (validated on post)
 *
 * @see FEATURES.md INV-003 - Adjustment Creation
 * @see USER_STORIES.md "As a warehouse manager, I want to create stock adjustments"
 */
export const adjustmentCreateSchema = z.object({
  locationId: uuidSchema,
  reason: adjustmentKindSchema,
  notes: z.string().max(1000).optional(),
  items: z
    .array(adjustmentItemInputSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items per adjustment'),
});

/**
 * Update Adjustment schema
 *
 * Business Rules:
 * - Only draft adjustments can be updated
 * - Cannot update items through this endpoint
 * - Cannot change location once created
 */
export const adjustmentUpdateSchema = adjustmentCreateSchema
  .omit({ items: true, locationId: true })
  .partial();

export type AdjustmentCreate = z.infer<typeof adjustmentCreateSchema>;
export type AdjustmentUpdate = z.infer<typeof adjustmentUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Submit Adjustment for approval
 *
 * Note: Based on schema, there is no 'pending' status.
 * Adjustment goes directly from 'draft' to 'approved' upon manager approval.
 * This schema is for attaching documentation before approval.
 *
 * @see FEATURES.md INV-003 - Approval workflow
 */
export const adjustmentSubmitSchema = z.object({
  submissionNotes: z.string().max(1000).optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileType: z.string(), // image/jpeg, application/pdf, etc.
  })).max(10).optional(), // Photo upload for documentation
});

/**
 * Approve and Post Adjustment
 *
 * CRITICAL OPERATION (from FEATURES.md INV-003):
 * - Manager approval required for posting
 * - Cannot post if results in negative inventory
 * - Ledger entry created on posting (movement_type = 'adjustment')
 * - Cost impact recorded for valuation
 * - Idempotent (prevents double-posting)
 *
 * @see FEATURES.md INV-003 - "Manager approval required for posting"
 * @see FEATURES.md INV-003 - "Cannot post if results in negative inventory"
 *
 * Business Rules:
 * 1. Validate adjustment is in 'draft' status (transitions to 'approved')
 * 2. For each negative adjustment: check would not result in negative stock
 * 3. Transition to 'approved' status (ready for posting)
 * 4. Record approval timestamp and user
 * 5. Send notification to creator
 *
 * Note: Actual posting to ledger happens separately (approved → posted)
 */
export const adjustmentApprovalSchema = approvalSchema;

/**
 * Reject Adjustment
 *
 * Rejection reason required.
 * Creator can revise and resubmit.
 */
export const adjustmentRejectionSchema = rejectionSchema;

export type AdjustmentSubmit = z.infer<typeof adjustmentSubmitSchema>;
export type AdjustmentApproval = z.infer<typeof adjustmentApprovalSchema>;
export type AdjustmentRejection = z.infer<typeof adjustmentRejectionSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Adjustment query filters
 *
 * Supports filtering by:
 * - Status
 * - Reason
 * - Location
 * - Date range
 * - Created by user
 *
 * @see FEATURES.md INV-003 - Adjustment list filtering
 */
export const adjustmentFiltersSchema = z
  .object({
    status: adjustmentStatusSchema.optional(),
    reason: adjustmentKindSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Adjustment query schema
 *
 * Combines base query (pagination, sort, search) with adjustment-specific filters.
 */
export const adjustmentQuerySchema = baseQuerySchema.merge(adjustmentFiltersSchema);

export type AdjustmentFilters = z.infer<typeof adjustmentFiltersSchema>;
export type AdjustmentQuery = z.infer<typeof adjustmentQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Adjustment detail schema (complete document)
 *
 * Includes all adjustment header fields from FEATURES.md INV-003
 *
 * @see FEATURES.md INV-003 - Adjustment structure
 */
export const adjustmentDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: ADJ-YYYYMM-00001
  locationId: uuidSchema,
  reason: adjustmentKindSchema,
  status: adjustmentStatusSchema,

  // Workflow
  notes: z.string().nullable(),
  createdBy: uuidSchema,
  approvedBy: uuidSchema.nullable(),
  approvedAt: z.date().nullable(),
  rejectedBy: uuidSchema.nullable(),
  rejectedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  approvalNotes: z.string().nullable(),

  // Totals
  totalCostImpact: moneyAmountSchema, // SUM of line cost impacts

  // Attachments (photo upload for documentation)
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileType: z.string(),
    uploadedAt: z.date(),
  })).nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  location: locationRelationSchema.nullable(),
  items: z.array(adjustmentItemResponseSchema),
});

/**
 * Adjustment list item schema (without nested items for list views)
 */
export const adjustmentListItemSchema = adjustmentDetailSchema.omit({
  items: true,
});

/**
 * Adjustment detail response
 */
export const adjustmentResponseSchema = successResponseSchema(
  adjustmentDetailSchema
);

/**
 * Adjustments paginated response
 */
export const adjustmentsResponseSchema = paginatedResponseSchema(
  adjustmentListItemSchema
);

export type AdjustmentDetail = z.infer<typeof adjustmentDetailSchema>;
export type AdjustmentListItem = z.infer<typeof adjustmentListItemSchema>;
export type AdjustmentResponse = z.infer<typeof adjustmentResponseSchema>;
export type AdjustmentsResponse = z.infer<typeof adjustmentsResponseSchema>;

// ============================================================================
// HELPER SCHEMAS
// ============================================================================

/**
 * Adjustment summary by reason (for reporting)
 */
export const adjustmentSummarySchema = successResponseSchema(
  z.object({
    period: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    totalAdjustments: z.number().int(),
    totalCostImpact: moneyAmountSchema,
    byReason: z.array(z.object({
      reason: adjustmentKindSchema,
      count: z.number().int(),
      totalQty: z.string(),
      totalCostImpact: moneyAmountSchema,
    })),
    byLocation: z.array(z.object({
      locationId: uuidSchema,
      locationName: z.string(),
      count: z.number().int(),
      totalCostImpact: moneyAmountSchema,
    })),
  })
);

export type AdjustmentSummary = z.infer<typeof adjustmentSummarySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate adjustment status transition
 *
 * Business Rules (based on schema):
 * - draft → approved → posted
 * - Status flow is simplified (no pending/rejected states in schema)
 * - Manager approval transitions directly from draft to approved
 * - Posted is terminal state (immutable)
 *
 * Note: Schema has ["draft", "approved", "posted"] statuses only
 *
 * @param currentStatus - Current adjustment status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidAdjustmentStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    draft: ['approved'],
    approved: ['posted'],
    posted: [], // Terminal state (immutable)
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate cost impact for an adjustment line
 *
 * Business Rule: Cost Impact = quantity × unitCost
 * Negative quantity = negative cost impact (loss)
 * Positive quantity = positive cost impact (found)
 *
 * @param quantity - Adjustment quantity (can be negative)
 * @param unitCost - Unit cost
 * @returns Cost impact
 */
export function calculateCostImpact(
  quantity: number,
  unitCost: number
): number {
  return quantity * unitCost;
}

/**
 * Validate adjustment would not cause negative stock
 *
 * CRITICAL Business Rule (from FEATURES.md INV-003):
 * Cannot post if results in negative inventory
 *
 * @param currentOnhand - Current on-hand quantity
 * @param adjustmentQty - Adjustment quantity (negative for decrease)
 * @returns Validation result
 */
export function validateNegativeStockPrevention(
  currentOnhand: number,
  adjustmentQty: number
): { valid: boolean; error?: string } {
  const resultingQty = currentOnhand + adjustmentQty;

  if (resultingQty < 0) {
    return {
      valid: false,
      error: `Cannot post adjustment: would result in negative stock. Current: ${currentOnhand}, Adjustment: ${adjustmentQty}, Resulting: ${resultingQty}`,
    };
  }

  return { valid: true };
}

/**
 * Determine if adjustment reason indicates loss
 *
 * Loss reasons: damage, expiry, theft, waste, spoilage
 * Gain reasons: found, correction (can be either)
 *
 * @param reason - Adjustment reason
 * @returns True if reason typically indicates loss
 */
export function isLossReason(reason: string): boolean {
  const lossReasons = ['damage', 'expiry', 'theft', 'waste', 'spoilage'];
  return lossReasons.includes(reason);
}

/**
 * Check if adjustment requires photo documentation
 *
 * Business Rule: High-value adjustments or loss reasons should have photos
 *
 * @param reason - Adjustment reason
 * @param costImpact - Absolute cost impact
 * @param photoThreshold - Threshold for requiring photo (default 1000)
 * @returns True if photo documentation recommended
 */
export function requiresPhotoDocumentation(
  reason: string,
  costImpact: number,
  photoThreshold: number = 1000
): boolean {
  // Loss reasons always recommend photo
  if (isLossReason(reason)) return true;

  // High-value adjustments recommend photo
  if (Math.abs(costImpact) >= photoThreshold) return true;

  return false;
}

/**
 * Calculate total cost impact for adjustment
 *
 * @param items - Adjustment line items
 * @returns Total cost impact (sum of all lines)
 */
export function calculateTotalCostImpact(
  items: Array<{ quantity: number; unitCost: number }>
): number {
  return items.reduce((sum, item) => {
    return sum + calculateCostImpact(item.quantity, item.unitCost);
  }, 0);
}

/**
 * Group adjustments by reason for analysis
 *
 * @param adjustments - Array of adjustments
 * @returns Grouped by reason with totals
 */
export function groupAdjustmentsByReason(
  adjustments: Array<{
    reason: string;
    totalCostImpact: number;
    items: Array<{ quantity: number }>;
  }>
): Record<string, {
  count: number;
  totalCostImpact: number;
  totalQuantity: number;
}> {
  return adjustments.reduce((acc, adj) => {
    if (!acc[adj.reason]) {
      acc[adj.reason] = {
        count: 0,
        totalCostImpact: 0,
        totalQuantity: 0,
      };
    }

    acc[adj.reason].count++;
    acc[adj.reason].totalCostImpact += adj.totalCostImpact;
    acc[adj.reason].totalQuantity += adj.items.reduce(
      (sum, item) => sum + Math.abs(item.quantity),
      0
    );

    return acc;
  }, {} as Record<string, { count: number; totalCostImpact: number; totalQuantity: number }>);
}
