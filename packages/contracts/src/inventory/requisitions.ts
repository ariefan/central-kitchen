/**
 * Stock Requisition contracts for inventory module
 *
 * Requisitions are requests from outlets to the central kitchen for stock.
 * On approval and issuance, a Transfer is automatically created.
 *
 * Covers the complete requisition lifecycle:
 * 1. Create requisition request (XFER-002)
 * 2. Approval workflow (may approve less than requested)
 * 3. Issue stock (creates transfer)
 * 4. Shortage tracking
 *
 * @module @contracts/erp/inventory/requisitions
 * @see FEATURES.md XFER-002 - Stock Requisitions
 * @see USER_STORIES.md Epic 4 - Stock Requisitions
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  approvalSchema,
  rejectionSchema,
  productRelationSchema,
  uomRelationSchema,
  locationRelationSchema,
} from '../common.js';
import {
  quantitySchema,
  quantityNonNegativeSchema,
  uuidSchema,
  dateInputSchema,
  dateTimeInputSchema,
} from '../primitives.js';
import {
  requisitionStatusSchema,
} from '../enums.js';

// ============================================================================
// LINE ITEM SCHEMAS
// ============================================================================

/**
 * Requisition line item for input
 *
 * Business Rule (from FEATURES.md XFER-002):
 * - requested_qty: What the outlet needs
 * - approved_qty: What central kitchen can provide (may be less)
 * - issued_qty: What was actually issued
 * - shortage_qty: requested - issued
 *
 * @see FEATURES.md XFER-002 - Requisition line items
 */
export const requisitionItemInputSchema = z.object({
  productId: uuidSchema,
  requestedQty: quantitySchema,
  uomId: uuidSchema,
  notes: z.string().max(500).optional(),
});

/**
 * Requisition line item for approval
 *
 * Central kitchen manager can approve less than requested due to stock availability.
 *
 * @see FEATURES.md XFER-002 - "Approved quantity may be less than requested"
 */
export const requisitionItemApprovalSchema = z.object({
  itemId: uuidSchema,
  approvedQty: quantityNonNegativeSchema,
  approvalNotes: z.string().max(500).optional(),
});

/**
 * Requisition line item for issuance
 *
 * Records what was actually issued (creates transfer).
 *
 * @see FEATURES.md XFER-002 - "On issuance, create transfer"
 */
export const requisitionItemIssueSchema = z.object({
  itemId: uuidSchema,
  issuedQty: quantityNonNegativeSchema,
  issueNotes: z.string().max(500).optional(),
});

/**
 * Requisition line item response from database
 *
 * Includes all quantities and calculated shortage.
 */
const requisitionItemResponseSchema = z.object({
  id: uuidSchema,
  requisitionId: uuidSchema,
  productId: uuidSchema,

  // Quantities (all stored as string from NUMERIC columns)
  requestedQty: z.string(),
  approvedQty: z.string().nullable(), // Set during approval
  issuedQty: z.string().nullable(), // Set during issuance
  shortageQty: z.string().nullable(), // Calculated: requested - issued

  // UOM and notes
  uomId: uuidSchema,
  notes: z.string().nullable(),
  approvalNotes: z.string().nullable(),
  issueNotes: z.string().nullable(),
  createdAt: z.date(),

  // Relations
  product: productRelationSchema.nullable(),
  uom: uomRelationSchema.nullable(),
});

export type RequisitionItemInput = z.infer<typeof requisitionItemInputSchema>;
export type RequisitionItemApproval = z.infer<typeof requisitionItemApprovalSchema>;
export type RequisitionItemIssue = z.infer<typeof requisitionItemIssueSchema>;
export type RequisitionItemResponse = z.infer<typeof requisitionItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Requisition schema
 *
 * Business Rules (from FEATURES.md XFER-002):
 * - Requisition number auto-generated (not in input)
 * - Status starts as "draft"
 * - From location is always central kitchen
 * - To location is the requesting outlet
 * - Required date must be in future
 * - At least 1 line item required
 *
 * @see FEATURES.md XFER-002 - Requisition Creation
 * @see USER_STORIES.md "As an outlet manager, I want to request stock from the central kitchen"
 */
export const requisitionCreateSchema = z
  .object({
    fromLocationId: uuidSchema, // Central kitchen
    toLocationId: uuidSchema, // Requesting outlet
    requiredDate: dateInputSchema, // When stock is needed
    notes: z.string().max(1000).optional(),
    items: z
      .array(requisitionItemInputSchema)
      .min(1, 'At least one item is required')
      .max(100, 'Maximum 100 items per requisition'),
  })
  .refine(
    (data) => {
      const required = new Date(data.requiredDate);
      return required > new Date();
    },
    {
      message: 'Required date must be in the future',
      path: ['requiredDate'],
    }
  );

/**
 * Update Requisition schema
 *
 * Business Rules:
 * - Only draft requisitions can be updated
 * - Cannot update items through this endpoint
 * - Cannot change from/to locations once created
 */
export const requisitionUpdateSchema = requisitionCreateSchema
  .omit({ items: true, fromLocationId: true, toLocationId: true })
  .partial();

export type RequisitionCreate = z.infer<typeof requisitionCreateSchema>;
export type RequisitionUpdate = z.infer<typeof requisitionUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Submit Requisition for approval
 *
 * Transitions status from 'draft' to 'pending'
 *
 * @see FEATURES.md XFER-002 - Approval workflow
 */
export const requisitionSubmitSchema = z.object({
  submissionNotes: z.string().max(1000).optional(),
});

/**
 * Approve Requisition with quantities
 *
 * CRITICAL (from FEATURES.md XFER-002):
 * - Central kitchen manager approves requisition
 * - Approved quantity may be less than requested (due to stock availability)
 * - System validates approved_qty does not exceed on-hand
 * - Email notification sent to requester
 *
 * @see FEATURES.md XFER-002 - "Approved quantity may be less than requested"
 *
 * Business Rules:
 * 1. For each item: approve_qty <= requested_qty
 * 2. Validate stock availability in from_location
 * 3. approved_qty can be 0 (backorder)
 * 4. Calculate shortage = requested - approved
 * 5. Update status to 'approved'
 * 6. Send email to requester
 */
export const requisitionApprovalSchema = z.object({
  items: z
    .array(requisitionItemApprovalSchema)
    .min(1, 'At least one item must be approved'),
  approvalNotes: z.string().max(1000).optional(),
});

/**
 * Reject Requisition
 *
 * Rejection reason required.
 * Requester can revise and resubmit.
 */
export const requisitionRejectionSchema = rejectionSchema;

/**
 * Issue Requisition (creates transfer)
 *
 * CRITICAL OPERATION (from FEATURES.md XFER-002):
 * - On issuance, create transfer from central kitchen to outlet
 * - Ledger entries via transfer flow (xfer_out, xfer_in)
 * - Shortage = requested_qty - issued_qty
 * - Email notification to requester
 *
 * @see FEATURES.md XFER-002 - "On issuance, create transfer from central kitchen to outlet"
 *
 * Business Rules:
 * 1. For each item: issued_qty <= approved_qty
 * 2. Create transfer document with issued quantities
 * 3. Transfer status starts as 'approved' (ready to ship)
 * 4. Calculate shortage for each line
 * 5. Update requisition status to 'issued'
 * 6. If all items fully issued: status = 'completed'
 * 7. If partial issuance: status = 'issued' (can issue more later)
 */
export const requisitionIssueSchema = z.object({
  items: z
    .array(requisitionItemIssueSchema)
    .min(1, 'At least one item must be issued'),
  issuedDate: dateTimeInputSchema.optional(), // Defaults to now
  issueNotes: z.string().max(1000).optional(),
});

export type RequisitionSubmit = z.infer<typeof requisitionSubmitSchema>;
export type RequisitionApproval = z.infer<typeof requisitionApprovalSchema>;
export type RequisitionRejection = z.infer<typeof requisitionRejectionSchema>;
export type RequisitionIssue = z.infer<typeof requisitionIssueSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Requisition query filters
 *
 * Supports filtering by:
 * - Status
 * - From location (central kitchen)
 * - To location (outlet)
 * - Date range
 * - Created by user
 *
 * @see FEATURES.md XFER-002 - Requisition list filtering
 */
export const requisitionFiltersSchema = z
  .object({
    status: requisitionStatusSchema.optional(),
    fromLocationId: uuidSchema.optional(),
    toLocationId: uuidSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Requisition query schema
 *
 * Combines base query (pagination, sort, search) with requisition-specific filters.
 */
export const requisitionQuerySchema = baseQuerySchema.merge(requisitionFiltersSchema);

export type RequisitionFilters = z.infer<typeof requisitionFiltersSchema>;
export type RequisitionQuery = z.infer<typeof requisitionQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Requisition detail schema (complete document)
 *
 * Includes all requisition header fields from FEATURES.md XFER-002
 *
 * @see FEATURES.md XFER-002 - Requisition structure
 */
export const requisitionDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: REQ-YYYYMM-00001
  fromLocationId: uuidSchema, // Central kitchen
  toLocationId: uuidSchema, // Requesting outlet
  status: requisitionStatusSchema,

  // Dates
  requiredDate: z.date(), // When stock is needed
  issuedDate: z.date().nullable(), // When stock was issued

  // Workflow
  notes: z.string().nullable(),
  createdBy: uuidSchema,
  approvedBy: uuidSchema.nullable(),
  approvedAt: z.date().nullable(),
  rejectedBy: uuidSchema.nullable(),
  rejectedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  approvalNotes: z.string().nullable(),
  issueNotes: z.string().nullable(),

  // Transfer reference (created on issuance)
  transferId: uuidSchema.nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  fromLocation: locationRelationSchema.nullable(),
  toLocation: locationRelationSchema.nullable(),
  transfer: z.object({
    id: uuidSchema,
    docNo: z.string(),
    status: z.string(),
  }).nullable(),
  items: z.array(requisitionItemResponseSchema),
});

/**
 * Requisition list item schema (without nested items for list views)
 */
export const requisitionListItemSchema = requisitionDetailSchema.omit({
  items: true,
});

/**
 * Requisition detail response
 */
export const requisitionResponseSchema = successResponseSchema(
  requisitionDetailSchema
);

/**
 * Requisitions paginated response
 */
export const requisitionsResponseSchema = paginatedResponseSchema(
  requisitionListItemSchema
);

export type RequisitionDetail = z.infer<typeof requisitionDetailSchema>;
export type RequisitionListItem = z.infer<typeof requisitionListItemSchema>;
export type RequisitionResponse = z.infer<typeof requisitionResponseSchema>;
export type RequisitionsResponse = z.infer<typeof requisitionsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate requisition status transition
 *
 * Business Rules (from FEATURES.md XFER-002):
 * - draft → pending → approved → issued → completed
 * - Can cancel from any status except completed
 * - Can reject from pending
 *
 * @param currentStatus - Current requisition status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidRequisitionStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['issued', 'cancelled'],
    rejected: ['draft'], // Can be revised and resubmitted
    issued: ['completed', 'cancelled'], // Can issue more if partial
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate shortage for a requisition line item
 *
 * Business Rule: Shortage = requested_qty - issued_qty
 *
 * @param requestedQty - Requested quantity
 * @param issuedQty - Actually issued quantity
 * @returns Shortage quantity and percentage
 */
export function calculateShortage(
  requestedQty: number,
  issuedQty: number
): {
  shortageQty: number;
  shortagePct: number;
  fullyFulfilled: boolean;
} {
  const shortageQty = requestedQty - issuedQty;
  const shortagePct = requestedQty > 0 ? (shortageQty / requestedQty) * 100 : 0;
  const fullyFulfilled = shortageQty === 0;

  return {
    shortageQty,
    shortagePct,
    fullyFulfilled,
  };
}

/**
 * Validate approved quantity does not exceed requested
 *
 * Business Rule: approved_qty must be <= requested_qty
 *
 * @param approvedQty - Approved quantity
 * @param requestedQty - Requested quantity
 * @returns Validation result
 */
export function validateApprovedQuantity(
  approvedQty: number,
  requestedQty: number
): { valid: boolean; error?: string } {
  if (approvedQty > requestedQty) {
    return {
      valid: false,
      error: `Approved quantity (${approvedQty}) cannot exceed requested quantity (${requestedQty})`,
    };
  }

  return { valid: true };
}

/**
 * Validate issued quantity does not exceed approved
 *
 * Business Rule: issued_qty must be <= approved_qty
 *
 * @param issuedQty - Issued quantity
 * @param approvedQty - Approved quantity
 * @returns Validation result
 */
export function validateIssuedQuantity(
  issuedQty: number,
  approvedQty: number
): { valid: boolean; error?: string } {
  if (issuedQty > approvedQty) {
    return {
      valid: false,
      error: `Issued quantity (${issuedQty}) cannot exceed approved quantity (${approvedQty})`,
    };
  }

  return { valid: true };
}

/**
 * Determine if requisition is completed
 *
 * Business Rule: Completed when all items are fully issued (shortage = 0)
 *
 * @param items - Requisition items
 * @returns True if all items fully issued
 */
export function isRequisitionCompleted(
  items: Array<{ requestedQty: number; issuedQty: number }>
): boolean {
  return items.every(item => item.issuedQty >= item.requestedQty);
}

/**
 * Check if requisition requires urgent fulfillment
 *
 * Business Rule: Urgent if required date is within threshold (e.g., 24 hours)
 *
 * @param requiredDate - Required date
 * @param thresholdHours - Urgency threshold in hours (default 24)
 * @returns True if urgent
 */
export function isUrgentRequisition(
  requiredDate: Date,
  thresholdHours: number = 24
): boolean {
  const now = new Date();
  const hoursUntilRequired = (requiredDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilRequired > 0 && hoursUntilRequired <= thresholdHours;
}
