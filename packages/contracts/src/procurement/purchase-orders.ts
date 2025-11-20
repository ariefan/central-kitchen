/**
 * Purchase Order contracts for procurement module
 *
 * Covers the complete PO lifecycle from creation to completion:
 * 1. Create PO with line items (PROC-001)
 * 2. Approval workflow (PROC-002)
 * 3. Send PO to supplier (PROC-003)
 *
 * @module @contracts/erp/procurement/purchase-orders
 * @see FEATURES.md PROC-001 to PROC-003
 * @see USER_STORIES.md Epic 2 - Procurement & Purchasing
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
  supplierRelationSchema,
  baseLineItemSchema,
} from '../common.js';
import {
  quantitySchema,
  moneyInputSchema,
  moneyAmountSchema,
  taxRateSchema,
  discountRateSchema,
  emailSchema,
  uuidSchema,
} from '../primitives.js';
import {
  purchaseOrderStatusSchema,
  purchaseOrderStatuses,
} from '../enums.js';

// ============================================================================
// LINE ITEM SCHEMAS
// ============================================================================

/**
 * Purchase Order line item for input
 *
 * Extends base line item with pricing fields.
 *
 * @see FEATURES.md PROC-001 - PO line items
 */
export const purchaseOrderItemInputSchema = baseLineItemSchema.extend({
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().max(100, 'Discount cannot exceed 100%').default(0),
  taxRate: taxRateSchema.default(0),
});

/**
 * Purchase Order line item response from database
 *
 * Includes calculated fields and relations.
 */
const purchaseOrderItemResponseSchema = z.object({
  id: uuidSchema,
  purchaseOrderId: uuidSchema,
  productId: uuidSchema,
  quantity: z.string(), // Numeric from DB
  uomId: uuidSchema,
  unitPrice: moneyAmountSchema,
  discount: moneyAmountSchema,
  taxRate: z.string(), // Numeric from DB
  lineTotal: moneyAmountSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),
  // Relations
  product: productRelationSchema.nullable(),
  uom: uomRelationSchema.nullable(),
});

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemInputSchema>;
export type PurchaseOrderItemResponse = z.infer<typeof purchaseOrderItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Purchase Order schema
 *
 * Business Rules (from FEATURES.md PROC-001):
 * - PO number auto-generated (not in input)
 * - Status starts as "draft"
 * - At least 1 line item required
 * - Expected delivery date must be in future (validated in refine)
 * - Supplier must be active (validated in API layer)
 * - Products must be in supplier catalog (validated in API layer)
 *
 * @see FEATURES.md PROC-001 - Purchase Order Creation
 * @see USER_STORIES.md "As a purchasing officer, I want to create POs with multiple line items"
 *
 * @example
 * ```typescript
 * const po = {
 *   supplierId: "uuid...",
 *   locationId: "uuid...",
 *   expectedDeliveryDate: "2025-02-01T00:00:00Z",
 *   paymentTerms: 30,
 *   notes: "Urgent order",
 *   items: [
 *     {
 *       productId: "uuid...",
 *       quantity: 100,
 *       uomId: "uuid...",
 *       unitPrice: 10.50,
 *       discount: 5,
 *       taxRate: 10,
 *     }
 *   ]
 * };
 * ```
 */
export const purchaseOrderCreateSchema = z
  .object({
    supplierId: uuidSchema,
    locationId: uuidSchema,
    expectedDeliveryDate: z.string().datetime().optional(),
    paymentTerms: z.number().int().positive().optional(),
    shippingCost: z.number().nonnegative().optional().default(0),
    discount: z.number().nonnegative().optional().default(0),
    notes: z.string().max(1000).optional(),
    items: z
      .array(purchaseOrderItemInputSchema)
      .min(1, 'At least one item is required')
      .max(100, 'Maximum 100 items per purchase order'),
  })
  .refine(
    (data) => {
      if (data.expectedDeliveryDate) {
        const date = new Date(data.expectedDeliveryDate);
        return date > new Date();
      }
      return true;
    },
    {
      message: 'Expected delivery date must be in the future',
      path: ['expectedDeliveryDate'],
    }
  );

/**
 * Update Purchase Order schema
 *
 * Business Rules (from FEATURES.md PROC-001):
 * - Only draft POs can be updated
 * - Cannot update items through this endpoint (use dedicated item endpoints)
 * - Cannot change supplier once created
 *
 * @see FEATURES.md PROC-001 - "Cannot edit PO after status = approved"
 */
export const purchaseOrderUpdateSchema = purchaseOrderCreateSchema
  .omit({ items: true, supplierId: true })
  .partial();

export type PurchaseOrderCreate = z.infer<typeof purchaseOrderCreateSchema>;
export type PurchaseOrderUpdate = z.infer<typeof purchaseOrderUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Submit PO for approval
 *
 * Transitions status from 'draft' to 'pending_approval'
 *
 * @see FEATURES.md PROC-002 - PO Approval
 */
export const purchaseOrderSubmitSchema = z.object({
  submissionNotes: z.string().max(1000).optional(),
});

/**
 * Approve Purchase Order
 *
 * Business Rules (from FEATURES.md PROC-002):
 * - Only managers can approve
 * - Creator cannot approve their own PO
 * - POs < threshold: auto-approved
 * - POs ≥ threshold: require manager approval
 * - Email notification sent on approval
 *
 * @see FEATURES.md PROC-002 - "Manager approval required above threshold"
 * @see USER_STORIES.md "As a manager, I need to approve POs above a certain threshold"
 */
export const purchaseOrderApprovalSchema = approvalSchema;

/**
 * Reject Purchase Order
 *
 * Rejection reason is required.
 *
 * @see FEATURES.md PROC-002 - Rejection workflow
 */
export const purchaseOrderRejectionSchema = rejectionSchema;

/**
 * Send PO to Supplier
 *
 * Business Rules (from FEATURES.md PROC-003):
 * - PO must be approved before sending
 * - Status changes to "sent" after email
 * - Email template: "Dear [Supplier], please find attached PO #..."
 * - PDF includes: PO number, date, supplier details, line items, terms
 *
 * @see FEATURES.md PROC-003 - Send PO to Supplier
 * @see USER_STORIES.md "As a purchasing officer, I want to email the PO to the supplier as PDF"
 */
export const purchaseOrderSendSchema = z.object({
  emailTo: emailSchema.optional(), // Override supplier email
  ccEmails: z.array(emailSchema).max(10).optional(),
  emailSubject: z.string().max(200).optional(),
  emailMessage: z.string().max(2000).optional(),
  attachPdf: z.boolean().default(true),
});

export type PurchaseOrderSubmit = z.infer<typeof purchaseOrderSubmitSchema>;
export type PurchaseOrderApproval = z.infer<typeof purchaseOrderApprovalSchema>;
export type PurchaseOrderRejection = z.infer<typeof purchaseOrderRejectionSchema>;
export type PurchaseOrderSend = z.infer<typeof purchaseOrderSendSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Purchase Order query filters
 *
 * Supports filtering by:
 * - Status
 * - Supplier
 * - Location
 * - Date range
 * - Created by user
 *
 * Plus standard pagination, sorting, and search from baseQuerySchema.
 *
 * @see FEATURES.md PROC-001 - PO list filtering
 */
export const purchaseOrderFiltersSchema = z
  .object({
    status: purchaseOrderStatusSchema.optional(),
    supplierId: uuidSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Purchase Order query schema
 *
 * Combines base query (pagination, sort, search) with PO-specific filters.
 *
 * @example
 * ```typescript
 * const query = {
 *   limit: 20,
 *   offset: 0,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc',
 *   status: 'pending_approval',
 *   supplierId: 'uuid...',
 * };
 * ```
 */
export const purchaseOrderQuerySchema = baseQuerySchema.merge(purchaseOrderFiltersSchema);

export type PurchaseOrderFilters = z.infer<typeof purchaseOrderFiltersSchema>;
export type PurchaseOrderQuery = z.infer<typeof purchaseOrderQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Purchase Order detail schema (complete document)
 *
 * Includes all PO header fields, calculated totals, and line items.
 *
 * Financial Calculations (from FEATURES.md PROC-001):
 * - lineTotal = quantity × unitPrice × (1 + taxRate / 100) - discount
 * - subtotal = SUM(all line totals)
 * - totalAmount = subtotal + shippingCost - discount
 *
 * @see FEATURES.md PROC-001 - PO structure
 */
export const purchaseOrderDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  orderNumber: z.string(), // Auto-generated: PO-YYYYMM-00001
  supplierId: uuidSchema,
  locationId: uuidSchema,
  orderDate: z.date(),
  expectedDeliveryDate: z.date().nullable(),
  actualDeliveryDate: z.date().nullable(),
  status: purchaseOrderStatusSchema,

  // Financial fields
  subtotal: moneyAmountSchema,
  taxAmount: moneyAmountSchema,
  shippingCost: moneyAmountSchema,
  discount: moneyAmountSchema,
  totalAmount: moneyAmountSchema,

  // Terms
  paymentTerms: z.number().nullable(),

  // Workflow
  notes: z.string().nullable(),
  createdBy: uuidSchema,
  approvedBy: uuidSchema.nullable(),
  approvedAt: z.date().nullable(),
  rejectedBy: uuidSchema.nullable(),
  rejectedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  sentAt: z.date().nullable(),
  sentBy: uuidSchema.nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  supplier: supplierRelationSchema.nullable(),
  location: locationRelationSchema.nullable(),
  items: z.array(purchaseOrderItemResponseSchema),
});

/**
 * Purchase Order list item schema (without nested items for list views)
 *
 * Used in list endpoints for better performance.
 */
export const purchaseOrderListItemSchema = purchaseOrderDetailSchema.omit({
  items: true,
});

/**
 * Purchase Order detail response
 *
 * Standard success response wrapper for single PO.
 */
export const purchaseOrderResponseSchema = successResponseSchema(
  purchaseOrderDetailSchema
);

/**
 * Purchase Orders paginated response
 *
 * Standard paginated response wrapper for PO list.
 */
export const purchaseOrdersResponseSchema = paginatedResponseSchema(
  purchaseOrderListItemSchema
);

export type PurchaseOrderDetail = z.infer<typeof purchaseOrderDetailSchema>;
export type PurchaseOrderListItem = z.infer<typeof purchaseOrderListItemSchema>;
export type PurchaseOrderResponse = z.infer<typeof purchaseOrderResponseSchema>;
export type PurchaseOrdersResponse = z.infer<typeof purchaseOrdersResponseSchema>;

// ============================================================================
// HELPER SCHEMAS
// ============================================================================

/**
 * Purchase Order summary for reports
 *
 * Lightweight schema for reporting and dashboards.
 */
export const purchaseOrderSummarySchema = z.object({
  id: uuidSchema,
  orderNumber: z.string(),
  supplierId: uuidSchema,
  supplierName: z.string(),
  status: purchaseOrderStatusSchema,
  orderDate: z.date(),
  totalAmount: moneyAmountSchema,
  itemCount: z.number().int(),
});

export type PurchaseOrderSummary = z.infer<typeof purchaseOrderSummarySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate PO status transition
 *
 * Business Rules (from FEATURES.md PROC-001):
 * - draft → pending_approval → approved → sent → confirmed → completed
 * - Can cancel from any status
 * - Can reject from pending_approval
 *
 * @param currentStatus - Current PO status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidPOStatusTransition(
  currentStatus: (typeof purchaseOrderStatuses)[number],
  nextStatus: (typeof purchaseOrderStatuses)[number]
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    draft: ['pending_approval', 'cancelled'],
    pending_approval: ['approved', 'rejected', 'cancelled'],
    approved: ['sent', 'cancelled'],
    rejected: ['draft'], // Can be revised and resubmitted
    sent: ['confirmed', 'cancelled'],
    confirmed: ['partial_receipt', 'completed', 'cancelled'],
    partial_receipt: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate line total
 *
 * Formula: quantity × unitPrice × (1 + taxRate / 100) - discount
 *
 * @param quantity - Line quantity
 * @param unitPrice - Unit price
 * @param taxRate - Tax rate (0-100)
 * @param discount - Line discount amount
 * @returns Line total
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discount: number = 0
): number {
  const subtotal = quantity * unitPrice;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;
  return Math.max(0, total); // Ensure non-negative
}

/**
 * Calculate PO total amount
 *
 * Formula: SUM(line totals) + shippingCost - documentDiscount
 *
 * @param lineItems - Array of line items
 * @param shippingCost - Shipping cost
 * @param documentDiscount - Document-level discount
 * @returns Total amount
 */
export function calculatePOTotal(
  lineItems: PurchaseOrderItemInput[],
  shippingCost: number = 0,
  documentDiscount: number = 0
): number {
  const lineTotal = lineItems.reduce((sum, item) => {
    return sum + calculateLineTotal(
      item.quantity,
      item.unitPrice,
      item.taxRate,
      item.discount
    );
  }, 0);

  const total = lineTotal + shippingCost - documentDiscount;
  return Math.max(0, total); // Ensure non-negative
}
