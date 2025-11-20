/**
 * Stock Transfer contracts for inventory module
 *
 * CRITICAL: This includes ALL fields from FEATURES.md XFER-001
 * Previously missing: driver_name, vehicle_number, damaged_qty, dates, approval fields
 *
 * Covers the complete transfer lifecycle:
 * 1. Create transfer request (XFER-001)
 * 2. Approval workflow
 * 3. Ship transfer with lot selection (FEFO)
 * 4. Receive transfer with damage tracking
 * 5. Variance tracking (shipped vs received)
 *
 * @module @contracts/erp/inventory/transfers
 * @see FEATURES.md XFER-001 - Inter-Location Stock Transfers
 * @see USER_STORIES.md Epic 4 - Stock Movement & Transfers
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
  varianceTrackingSchema,
} from '../common.js';
import {
  quantitySchema,
  quantityNonNegativeSchema,
  uuidSchema,
  dateTimeInputSchema,
  dateInputSchema,
} from '../primitives.js';
import {
  transferStatusSchema,
} from '../enums.js';

// ============================================================================
// LINE ITEM SCHEMAS
// ============================================================================

/**
 * Transfer line item for input
 *
 * Business Rule (from FEATURES.md XFER-001):
 * - requested_qty: Initially requested quantity
 * - shipped_qty: Actual shipped quantity (selected during shipment)
 * - received_qty: Actual received quantity (may differ due to damage)
 * - damaged_qty: Quantity damaged in transit
 *
 * @see FEATURES.md XFER-001 - Transfer line items with variance tracking
 */
export const transferItemInputSchema = z.object({
  productId: uuidSchema,
  requestedQty: quantitySchema,
  uomId: uuidSchema,
  notes: z.string().max(500).optional(),
});

/**
 * Transfer line item for shipment (includes lot selection)
 *
 * CRITICAL: Lot selection happens during shipment (FEFO recommended)
 *
 * @see FEATURES.md XFER-001 - "Lot selection happens during shipment (FEFO recommended)"
 */
export const transferItemShipSchema = z.object({
  itemId: uuidSchema, // Reference to transfer_items.id
  lotId: uuidSchema, // Selected lot (FEFO order recommended)
  shippedQty: quantitySchema,
});

/**
 * Transfer line item for receiving (includes damage tracking)
 *
 * CRITICAL: Variance = received_qty - shipped_qty
 * Damaged quantity recorded for loss tracking
 *
 * @see FEATURES.md XFER-001 - "Damaged quantity recorded for loss tracking"
 */
export const transferItemReceiveSchema = z.object({
  itemId: uuidSchema,
  receivedQty: quantityNonNegativeSchema,
  damagedQty: quantityNonNegativeSchema.default(0),
  notes: z.string().max(500).optional(),
});

/**
 * Transfer line item response from database
 *
 * Includes all quantities and calculated variance.
 */
const transferItemResponseSchema = z.object({
  id: uuidSchema,
  transferId: uuidSchema,
  productId: uuidSchema,
  lotId: uuidSchema.nullable(), // Assigned during shipment

  // Quantities (all stored as string from NUMERIC columns)
  requestedQty: z.string(),
  shippedQty: z.string().nullable(),
  receivedQty: z.string().nullable(),
  damagedQty: z.string().nullable(),
  varianceQty: z.string().nullable(), // Calculated: received - shipped

  // UOM and notes
  uomId: uuidSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),

  // Relations
  product: productRelationSchema.nullable(),
  uom: uomRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

export type TransferItemInput = z.infer<typeof transferItemInputSchema>;
export type TransferItemShip = z.infer<typeof transferItemShipSchema>;
export type TransferItemReceive = z.infer<typeof transferItemReceiveSchema>;
export type TransferItemResponse = z.infer<typeof transferItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Transfer schema
 *
 * Business Rules (from FEATURES.md XFER-001):
 * - Transfer number auto-generated (not in input)
 * - Status starts as "draft"
 * - From/to locations must be different
 * - At least 1 line item required
 * - Stock validation happens during approval
 *
 * @see FEATURES.md XFER-001 - Transfer Creation
 * @see USER_STORIES.md "As a warehouse manager, I want to transfer stock between locations"
 */
export const transferCreateSchema = z
  .object({
    fromLocationId: uuidSchema,
    toLocationId: uuidSchema,
    requestedDate: dateInputSchema.optional(), // Defaults to today
    requiredDate: dateInputSchema.optional(), // When needed
    notes: z.string().max(1000).optional(),
    items: z
      .array(transferItemInputSchema)
      .min(1, 'At least one item is required')
      .max(100, 'Maximum 100 items per transfer'),
  })
  .refine(
    (data) => data.fromLocationId !== data.toLocationId,
    {
      message: 'From and to locations must be different',
      path: ['toLocationId'],
    }
  );

/**
 * Update Transfer schema
 *
 * Business Rules:
 * - Only draft transfers can be updated
 * - Cannot update items through this endpoint
 * - Cannot change from/to locations once created
 */
export const transferUpdateSchema = transferCreateSchema
  .omit({ items: true, fromLocationId: true, toLocationId: true })
  .partial();

export type TransferCreate = z.infer<typeof transferCreateSchema>;
export type TransferUpdate = z.infer<typeof transferUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Submit Transfer for approval
 *
 * Transitions status from 'draft' to 'pending'
 *
 * @see FEATURES.md XFER-001 - Approval workflow
 */
export const transferSubmitSchema = z.object({
  submissionNotes: z.string().max(1000).optional(),
});

/**
 * Approve Transfer
 *
 * Business Rules (from FEATURES.md XFER-001):
 * - Approval required before shipping
 * - Stock reserved in from_location on approval
 * - Validates stock availability
 * - Transitions to 'approved' status
 *
 * @see FEATURES.md XFER-001 - "Stock reserved in from_location on approval"
 */
export const transferApprovalSchema = approvalSchema;

/**
 * Reject Transfer
 *
 * Rejection reason required.
 */
export const transferRejectionSchema = rejectionSchema;

/**
 * Ship Transfer with lot selection
 *
 * CRITICAL OPERATION (from FEATURES.md XFER-001):
 * - Lot selection happens during shipment (FEFO recommended)
 * - Creates ledger entry: xfer_out (negative qty) in from_location
 * - Transitions to 'shipped' status
 * - Includes driver/vehicle information
 *
 * @see FEATURES.md XFER-001 - "Lot selection happens during shipment (FEFO recommended)"
 * @see FEATURES.md XFER-001 - "Driver/vehicle information capture"
 *
 * Business Rules:
 * 1. Validate all items have lot assignments
 * 2. Validate shipped_qty does not exceed on-hand for selected lots
 * 3. Create stock_ledger entry: type='xfer_out', qty=-shipped_qty
 * 4. Update transfer status to 'shipped'
 * 5. Record driver and vehicle information
 * 6. Generate packing slip PDF
 */
export const transferShipSchema = z.object({
  items: z
    .array(transferItemShipSchema)
    .min(1, 'At least one item must be shipped'),
  shippedDate: dateTimeInputSchema.optional(), // Defaults to now
  driverName: z.string().min(1).max(100).optional(),
  vehicleNumber: z.string().max(50).optional(),
  shippingNotes: z.string().max(1000).optional(),
});

/**
 * Receive Transfer with damage tracking
 *
 * CRITICAL OPERATION (from FEATURES.md XFER-001):
 * - Creates ledger entry: xfer_in (positive qty) in to_location
 * - Variance = received_qty - shipped_qty
 * - Damaged quantity recorded for loss tracking
 * - Transitions to 'received' status
 *
 * @see FEATURES.md XFER-001 - "Variance = received_qty - shipped_qty"
 * @see FEATURES.md XFER-001 - "Damaged quantity recorded for loss tracking"
 *
 * Business Rules:
 * 1. Validate transfer is in 'shipped' status
 * 2. For each item: received_qty + damaged_qty should equal shipped_qty (with tolerance)
 * 3. Create stock_ledger entry: type='xfer_in', qty=+received_qty
 * 4. Record variance for each line
 * 5. Update transfer status to 'received'
 * 6. Send notification to sender if significant variance
 */
export const transferReceiveSchema = z.object({
  items: z
    .array(transferItemReceiveSchema)
    .min(1, 'At least one item must be received'),
  receivedDate: dateTimeInputSchema.optional(), // Defaults to now
  receivingNotes: z.string().max(1000).optional(),
});

export type TransferSubmit = z.infer<typeof transferSubmitSchema>;
export type TransferApproval = z.infer<typeof transferApprovalSchema>;
export type TransferRejection = z.infer<typeof transferRejectionSchema>;
export type TransferShip = z.infer<typeof transferShipSchema>;
export type TransferReceive = z.infer<typeof transferReceiveSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Transfer query filters
 *
 * Supports filtering by:
 * - Status
 * - From location
 * - To location
 * - Date range
 * - Created by user
 *
 * @see FEATURES.md XFER-001 - Transfer list filtering
 */
export const transferFiltersSchema = z
  .object({
    status: transferStatusSchema.optional(),
    fromLocationId: uuidSchema.optional(),
    toLocationId: uuidSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Transfer query schema
 *
 * Combines base query (pagination, sort, search) with transfer-specific filters.
 */
export const transferQuerySchema = baseQuerySchema.merge(transferFiltersSchema);

export type TransferFilters = z.infer<typeof transferFiltersSchema>;
export type TransferQuery = z.infer<typeof transferQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Transfer detail schema (complete document)
 *
 * Includes all transfer header fields from FEATURES.md XFER-001
 *
 * @see FEATURES.md XFER-001 - Transfer structure
 */
export const transferDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: XFER-YYYYMM-00001
  fromLocationId: uuidSchema,
  toLocationId: uuidSchema,
  status: transferStatusSchema,

  // Dates
  requestedDate: z.date().nullable(),
  requiredDate: z.date().nullable(),
  shippedDate: z.date().nullable(),
  receivedDate: z.date().nullable(),

  // Workflow
  notes: z.string().nullable(),
  createdBy: uuidSchema,
  approvedBy: uuidSchema.nullable(),
  approvedAt: z.date().nullable(),
  rejectedBy: uuidSchema.nullable(),
  rejectedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),

  // Shipping information (CRITICAL: These were missing from original schema)
  driverName: z.string().nullable(),
  vehicleNumber: z.string().nullable(),
  shippingNotes: z.string().nullable(),
  receivingNotes: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  fromLocation: locationRelationSchema.nullable(),
  toLocation: locationRelationSchema.nullable(),
  items: z.array(transferItemResponseSchema),
});

/**
 * Transfer list item schema (without nested items for list views)
 */
export const transferListItemSchema = transferDetailSchema.omit({
  items: true,
});

/**
 * Transfer detail response
 */
export const transferResponseSchema = successResponseSchema(
  transferDetailSchema
);

/**
 * Transfers paginated response
 */
export const transfersResponseSchema = paginatedResponseSchema(
  transferListItemSchema
);

export type TransferDetail = z.infer<typeof transferDetailSchema>;
export type TransferListItem = z.infer<typeof transferListItemSchema>;
export type TransferResponse = z.infer<typeof transferResponseSchema>;
export type TransfersResponse = z.infer<typeof transfersResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate transfer status transition
 *
 * Business Rules (from FEATURES.md XFER-001):
 * - draft → pending → approved → shipped → received
 * - Can cancel from any status except received
 * - Can reject from pending
 *
 * @param currentStatus - Current transfer status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidTransferStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['shipped', 'cancelled'],
    rejected: ['draft'], // Can be revised and resubmitted
    shipped: ['in_transit', 'received', 'cancelled'],
    in_transit: ['received', 'cancelled'],
    received: [], // Terminal state
    cancelled: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate variance for a transfer line item
 *
 * Business Rule: Variance = received_qty - shipped_qty
 * Damaged items are separate from variance
 *
 * @param receivedQty - Actual received quantity
 * @param shippedQty - Originally shipped quantity
 * @param damagedQty - Damaged quantity
 * @returns Variance quantity and details
 */
export function calculateTransferVariance(
  receivedQty: number,
  shippedQty: number,
  damagedQty: number = 0
): {
  varianceQty: number;
  variancePct: number;
  totalLoss: number;
  hasSignificantVariance: boolean;
} {
  const varianceQty = receivedQty - shippedQty;
  const variancePct = shippedQty > 0 ? (varianceQty / shippedQty) * 100 : 0;
  const totalLoss = shippedQty - receivedQty + damagedQty;

  // Significant variance if >5% or any damage
  const hasSignificantVariance = Math.abs(variancePct) > 5 || damagedQty > 0;

  return {
    varianceQty,
    variancePct,
    totalLoss,
    hasSignificantVariance,
  };
}

/**
 * Validate receive quantities match shipped
 *
 * Business Rule: received_qty + damaged_qty should approximately equal shipped_qty
 * Allows small tolerance for rounding
 *
 * @param receivedQty - Received quantity
 * @param damagedQty - Damaged quantity
 * @param shippedQty - Originally shipped quantity
 * @param tolerance - Acceptable variance (default 0.01)
 * @returns Validation result
 */
export function validateReceiveQuantities(
  receivedQty: number,
  damagedQty: number,
  shippedQty: number,
  tolerance: number = 0.01
): { valid: boolean; error?: string } {
  const total = receivedQty + damagedQty;
  const diff = Math.abs(total - shippedQty);

  if (diff > tolerance) {
    return {
      valid: false,
      error: `Received (${receivedQty}) + Damaged (${damagedQty}) = ${total}, but Shipped was ${shippedQty}. Difference: ${diff.toFixed(2)}`,
    };
  }

  return { valid: true };
}

/**
 * Check if transfer requires manager approval
 *
 * Business Rule: Large transfers or inter-company transfers may require approval
 *
 * @param itemCount - Number of items in transfer
 * @param threshold - Approval threshold (default 50 items)
 * @returns True if manager approval required
 */
export function requiresManagerApproval(
  itemCount: number,
  threshold: number = 50
): boolean {
  return itemCount > threshold;
}
