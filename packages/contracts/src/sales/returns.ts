/**
 * Returns Management contracts for procurement and sales modules
 *
 * Manages both supplier returns (outbound) and customer returns (inbound).
 * Includes RMA processing, inventory adjustments, and refund handling.
 *
 * CRITICAL: Return processing triggers:
 * - Inventory adjustments (add/subtract based on return type)
 * - Ledger entries for tracking
 * - Financial adjustments (refunds/credits)
 * - Supplier/customer notifications
 *
 * Covers:
 * 1. Supplier returns for damaged/defective goods (RET-001)
 * 2. Customer returns with refund/exchange (RET-002)
 * 3. RMA (Return Merchandise Authorization) process
 * 4. Return tracking and approval workflows
 *
 * @module @contracts/erp/sales/returns
 * @see FEATURES.md RET-001 - Supplier Returns
 * @see FEATURES.md RET-002 - Customer Returns
 * @see USER_STORIES.md Epic 7 - Returns Management
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  supplierRelationSchema,
  customerRelationSchema,
  lotRelationSchema,
} from '../common.js';
import {
  quantitySchema,
  moneyAmountSchema,
  uuidSchema,
  dateInputSchema,
  dateTimeInputSchema,
} from '../primitives.js';
import {
  returnStatusSchema,
  returnTypeSchema,
  returnReasonSchema,
} from '../enums.js';

// ============================================================================
// SUPPLIER RETURN SCHEMAS (RET-001)
// ============================================================================

/**
 * Supplier return line item for input
 *
 * @see FEATURES.md RET-001 - "Return line items with quantities"
 */
export const supplierReturnItemInputSchema = z.object({
  goodsReceiptItemId: uuidSchema.optional(), // Reference to original GR item
  productId: uuidSchema,
  lotId: uuidSchema.optional(), // If lot-tracked
  quantity: quantitySchema,
  unitCost: moneyAmountSchema, // Original purchase cost
  returnReason: returnReasonSchema,
  notes: z.string().max(500).optional(),
});

/**
 * Create supplier return (RMA)
 *
 * Business Rules (from FEATURES.md RET-001):
 * - Can return to supplier for damaged/defective/wrong items
 * - RMA number auto-generated or from supplier
 * - Must reference original goods receipt or purchase order
 * - Requires approval before processing
 * - Inventory adjustment on approval
 *
 * @see FEATURES.md RET-001 - "Return Merchandise Authorization (RMA)"
 * @see FEATURES.md RET-001 - "Inventory adjustment on return"
 *
 * @example
 * ```typescript
 * {
 *   supplierId: "uuid...",
 *   locationId: "uuid...",
 *   goodsReceiptId: "uuid...",
 *   rmaNumber: "RMA-2025-001",
 *   returnDate: "2025-01-20",
 *   expectedRefundAmount: 450.00,
 *   items: [
 *     {
 *       productId: "uuid...",
 *       quantity: 10,
 *       unitCost: 45.00,
 *       returnReason: "damaged",
 *       notes: "Boxes were crushed during delivery"
 *     }
 *   ],
 *   notes: "Requesting full refund"
 * }
 * ```
 */
export const supplierReturnCreateSchema = z.object({
  supplierId: uuidSchema,
  locationId: uuidSchema,
  goodsReceiptId: uuidSchema.optional(), // Original GR reference
  purchaseOrderId: uuidSchema.optional(), // Original PO reference
  rmaNumber: z.string().max(50).optional(), // RMA from supplier
  returnDate: dateInputSchema.optional(), // When items will be returned
  expectedRefundAmount: moneyAmountSchema.optional(),
  items: z
    .array(supplierReturnItemInputSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items per return'),
  notes: z.string().max(1000).optional(),
});

/**
 * Update supplier return
 *
 * Business Rules:
 * - Can only update draft status
 * - Cannot update after approval
 */
export const supplierReturnUpdateSchema = supplierReturnCreateSchema
  .omit({ items: true })
  .partial();

/**
 * Approve supplier return
 *
 * Business Rules (from FEATURES.md RET-001):
 * - Manager approval required
 * - Creates inventory adjustment (negative qty)
 * - Creates ledger entry (movement_type = 'return_to_supplier')
 * - Updates status to approved
 *
 * @see FEATURES.md RET-001 - "Manager approval"
 * @see FEATURES.md RET-001 - "Inventory adjustment on return"
 */
export const supplierReturnApproveSchema = z.object({
  returnId: uuidSchema,
  approvedBy: uuidSchema, // Manager
  approvalNotes: z.string().max(500).optional(),
  approvedAt: dateTimeInputSchema.optional(),
});

/**
 * Ship supplier return
 *
 * Business Rules (from FEATURES.md RET-001):
 * - Record shipment details
 * - Tracking number for follow-up
 * - Carrier information
 *
 * @see FEATURES.md RET-001 - "Return shipping tracking"
 */
export const supplierReturnShipSchema = z.object({
  returnId: uuidSchema,
  carrier: z.string().max(100),
  trackingNumber: z.string().max(100),
  shippedDate: dateInputSchema.optional(),
  shippingCost: moneyAmountSchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Complete supplier return
 *
 * Business Rules (from FEATURES.md RET-001):
 * - Record actual refund received
 * - Can be partial refund
 * - Supplier credit memo reference
 *
 * @see FEATURES.md RET-001 - "Credit memo from supplier"
 */
export const supplierReturnCompleteSchema = z.object({
  returnId: uuidSchema,
  actualRefundAmount: moneyAmountSchema,
  creditMemoNumber: z.string().max(50).optional(),
  refundDate: dateInputSchema.optional(),
  completionNotes: z.string().max(1000).optional(),
});

export type SupplierReturnItemInput = z.infer<typeof supplierReturnItemInputSchema>;
export type SupplierReturnCreate = z.infer<typeof supplierReturnCreateSchema>;
export type SupplierReturnUpdate = z.infer<typeof supplierReturnUpdateSchema>;
export type SupplierReturnApprove = z.infer<typeof supplierReturnApproveSchema>;
export type SupplierReturnShip = z.infer<typeof supplierReturnShipSchema>;
export type SupplierReturnComplete = z.infer<typeof supplierReturnCompleteSchema>;

// ============================================================================
// CUSTOMER RETURN SCHEMAS (RET-002)
// ============================================================================

/**
 * Customer return line item for input
 *
 * @see FEATURES.md RET-002 - "Return line items with quantities"
 */
export const customerReturnItemInputSchema = z.object({
  orderItemId: uuidSchema, // Reference to original order item
  productId: uuidSchema,
  quantity: quantitySchema,
  unitPrice: moneyAmountSchema, // Original sale price
  returnReason: returnReasonSchema,
  condition: z.enum(['unopened', 'opened', 'damaged', 'defective']),
  notes: z.string().max(500).optional(),
});

/**
 * Create customer return
 *
 * Business Rules (from FEATURES.md RET-002):
 * - Can return items from completed orders
 * - Manager approval required
 * - Return within return window (e.g., 7 days)
 * - Can be refund or exchange
 * - Inventory reversal on approval
 *
 * @see FEATURES.md RET-002 - "Customer return request"
 * @see FEATURES.md RET-002 - "Manager approval required"
 * @see FEATURES.md RET-002 - "Inventory reversal"
 *
 * @example
 * ```typescript
 * {
 *   orderId: "uuid...",
 *   customerId: "uuid...",
 *   locationId: "uuid...",
 *   returnType: "refund",
 *   items: [
 *     {
 *       orderItemId: "uuid...",
 *       productId: "uuid...",
 *       quantity: 2,
 *       unitPrice: 15.50,
 *       returnReason: "quality_issue",
 *       condition: "defective",
 *       notes: "Product was spoiled"
 *     }
 *   ],
 *   customerNotes: "Not satisfied with quality"
 * }
 * ```
 */
export const customerReturnCreateSchema = z.object({
  orderId: uuidSchema,
  customerId: uuidSchema,
  locationId: uuidSchema,
  returnType: returnTypeSchema, // refund or exchange
  items: z
    .array(customerReturnItemInputSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Maximum 50 items per return'),
  customerNotes: z.string().max(1000).optional(),
  requestedRefundAmount: moneyAmountSchema.optional(), // For partial refund
});

/**
 * Update customer return
 *
 * Business Rules:
 * - Can only update pending status
 * - Cannot update after approval
 */
export const customerReturnUpdateSchema = customerReturnCreateSchema
  .omit({ orderId: true, customerId: true, items: true })
  .partial();

/**
 * Approve customer return
 *
 * Business Rules (from FEATURES.md RET-002):
 * - Manager approval required
 * - Creates inventory adjustment (positive qty for restockable items)
 * - Processes refund if return type is 'refund'
 * - Creates exchange order if return type is 'exchange'
 *
 * @see FEATURES.md RET-002 - "Manager approval required"
 * @see FEATURES.md RET-002 - "Refund processing"
 * @see FEATURES.md RET-002 - "Exchange handling"
 */
export const customerReturnApproveSchema = z.object({
  returnId: uuidSchema,
  approvedBy: uuidSchema, // Manager
  approvalNotes: z.string().max(500).optional(),
  refundAmount: moneyAmountSchema.optional(), // Actual refund amount
  restockItems: z.boolean().default(true), // Add items back to inventory
  approvedAt: dateTimeInputSchema.optional(),
});

/**
 * Reject customer return
 *
 * Business Rules (from FEATURES.md RET-002):
 * - Can reject returns outside return window
 * - Can reject damaged/used items
 * - Requires rejection reason
 */
export const customerReturnRejectSchema = z.object({
  returnId: uuidSchema,
  rejectedBy: uuidSchema,
  rejectionReason: z.string().min(1).max(1000),
  rejectedAt: dateTimeInputSchema.optional(),
});

/**
 * Process customer return refund
 *
 * Business Rules (from FEATURES.md RET-002):
 * - Refund to original payment method
 * - Can be partial refund
 * - Deducts restocking fee if applicable
 *
 * @see FEATURES.md RET-002 - "Refund to original payment method"
 */
export const customerReturnRefundSchema = z.object({
  returnId: uuidSchema,
  refundAmount: moneyAmountSchema,
  refundMethod: z.enum(['original_payment', 'store_credit', 'cash']),
  restockingFee: z.number().nonnegative().default(0),
  transactionRef: z.string().max(100).optional(), // Payment gateway reference
  refundedAt: dateTimeInputSchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Create exchange order from return
 *
 * Business Rules (from FEATURES.md RET-002):
 * - Exchange for same or different product
 * - Price difference handled as refund or additional payment
 *
 * @see FEATURES.md RET-002 - "Exchange handling"
 */
export const customerReturnExchangeSchema = z.object({
  returnId: uuidSchema,
  exchangeItems: z.array(z.object({
    productId: uuidSchema,
    variantId: uuidSchema.optional(),
    quantity: quantitySchema,
    unitPrice: moneyAmountSchema,
  })).min(1).max(20),
  additionalPayment: moneyAmountSchema.optional(), // If exchange items cost more
  refundAmount: moneyAmountSchema.optional(), // If exchange items cost less
  notes: z.string().max(500).optional(),
});

export type CustomerReturnItemInput = z.infer<typeof customerReturnItemInputSchema>;
export type CustomerReturnCreate = z.infer<typeof customerReturnCreateSchema>;
export type CustomerReturnUpdate = z.infer<typeof customerReturnUpdateSchema>;
export type CustomerReturnApprove = z.infer<typeof customerReturnApproveSchema>;
export type CustomerReturnReject = z.infer<typeof customerReturnRejectSchema>;
export type CustomerReturnRefund = z.infer<typeof customerReturnRefundSchema>;
export type CustomerReturnExchange = z.infer<typeof customerReturnExchangeSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Supplier return query filters
 */
export const supplierReturnFiltersSchema = z
  .object({
    supplierId: uuidSchema.optional(),
    status: returnStatusSchema.optional(),
    goodsReceiptId: uuidSchema.optional(),
    purchaseOrderId: uuidSchema.optional(),
    rmaNumber: z.string().optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Supplier Return query schema
 */
export const supplierReturnQuerySchema = baseQuerySchema.merge(
  supplierReturnFiltersSchema
);

/**
 * Customer return query filters
 */
export const customerReturnFiltersSchema = z
  .object({
    customerId: uuidSchema.optional(),
    orderId: uuidSchema.optional(),
    status: returnStatusSchema.optional(),
    returnType: returnTypeSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Customer Return query schema
 */
export const customerReturnQuerySchema = baseQuerySchema.merge(
  customerReturnFiltersSchema
);

export type SupplierReturnFilters = z.infer<typeof supplierReturnFiltersSchema>;
export type SupplierReturnQuery = z.infer<typeof supplierReturnQuerySchema>;
export type CustomerReturnFilters = z.infer<typeof customerReturnFiltersSchema>;
export type CustomerReturnQuery = z.infer<typeof customerReturnQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Supplier return item response
 */
const supplierReturnItemResponseSchema = z.object({
  id: uuidSchema,
  returnId: uuidSchema,
  goodsReceiptItemId: uuidSchema.nullable(),
  productId: uuidSchema,
  lotId: uuidSchema.nullable(),
  quantity: z.string(), // Numeric from DB
  unitCost: moneyAmountSchema,
  lineTotal: moneyAmountSchema, // quantity × unitCost
  returnReason: z.string(),
  notes: z.string().nullable(),

  // Relations
  product: productRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

/**
 * Customer return item response
 */
const customerReturnItemResponseSchema = z.object({
  id: uuidSchema,
  returnId: uuidSchema,
  orderItemId: uuidSchema,
  productId: uuidSchema,
  quantity: z.string(), // Numeric from DB
  unitPrice: moneyAmountSchema,
  lineTotal: moneyAmountSchema, // quantity × unitPrice
  returnReason: z.string(),
  condition: z.string(),
  notes: z.string().nullable(),

  // Relations
  product: productRelationSchema.nullable(),
});

/**
 * Supplier return detail schema
 *
 * @see FEATURES.md RET-001 - Supplier return structure
 */
export const supplierReturnDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: SR-YYYYMM-00001
  supplierId: uuidSchema,
  locationId: uuidSchema,
  status: returnStatusSchema,

  // References
  goodsReceiptId: uuidSchema.nullable(),
  purchaseOrderId: uuidSchema.nullable(),
  rmaNumber: z.string().nullable(),

  // Dates
  returnDate: z.date().nullable(),
  approvedAt: z.date().nullable(),
  shippedDate: z.date().nullable(),
  completedDate: z.date().nullable(),

  // Financial
  expectedRefundAmount: moneyAmountSchema.nullable(),
  actualRefundAmount: moneyAmountSchema.nullable(),
  totalAmount: moneyAmountSchema, // Sum of line totals

  // Shipping
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  shippingCost: moneyAmountSchema.nullable(),

  // Credit memo
  creditMemoNumber: z.string().nullable(),

  // Approval
  approvedBy: uuidSchema.nullable(),
  approvalNotes: z.string().nullable(),

  // Notes
  notes: z.string().nullable(),
  completionNotes: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  supplier: supplierRelationSchema.nullable(),
  items: z.array(supplierReturnItemResponseSchema),
});

/**
 * Customer return detail schema
 *
 * @see FEATURES.md RET-002 - Customer return structure
 */
export const customerReturnDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: CR-YYYYMM-00001
  orderId: uuidSchema,
  customerId: uuidSchema,
  locationId: uuidSchema,
  status: returnStatusSchema,
  returnType: returnTypeSchema,

  // Dates
  requestedAt: z.date(),
  approvedAt: z.date().nullable(),
  rejectedAt: z.date().nullable(),
  completedAt: z.date().nullable(),

  // Financial
  requestedRefundAmount: moneyAmountSchema.nullable(),
  approvedRefundAmount: moneyAmountSchema.nullable(),
  restockingFee: moneyAmountSchema,
  totalAmount: moneyAmountSchema, // Sum of line totals

  // Approval/Rejection
  approvedBy: uuidSchema.nullable(),
  rejectedBy: uuidSchema.nullable(),
  approvalNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),

  // Refund
  refundMethod: z.string().nullable(),
  refundTransactionRef: z.string().nullable(),
  refundedAt: z.date().nullable(),

  // Exchange
  exchangeOrderId: uuidSchema.nullable(),
  exchangeCompleted: z.boolean(),

  // Inventory
  restockItems: z.boolean(),
  inventoryReversed: z.boolean(),

  // Notes
  customerNotes: z.string().nullable(),
  notes: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  customer: customerRelationSchema.nullable(),
  order: z.object({
    id: uuidSchema,
    docNo: z.string(),
    orderType: z.string(),
    totalAmount: z.string(),
  }).nullable(),
  items: z.array(customerReturnItemResponseSchema),
});

/**
 * Supplier return list item schema
 */
export const supplierReturnListItemSchema = supplierReturnDetailSchema.omit({
  items: true,
});

/**
 * Customer return list item schema
 */
export const customerReturnListItemSchema = customerReturnDetailSchema.omit({
  items: true,
});

/**
 * Supplier return detail response
 */
export const supplierReturnResponseSchema = successResponseSchema(
  supplierReturnDetailSchema
);

/**
 * Supplier returns paginated response
 */
export const supplierReturnsResponseSchema = paginatedResponseSchema(
  supplierReturnListItemSchema
);

/**
 * Customer return detail response
 */
export const customerReturnResponseSchema = successResponseSchema(
  customerReturnDetailSchema
);

/**
 * Customer returns paginated response
 */
export const customerReturnsResponseSchema = paginatedResponseSchema(
  customerReturnListItemSchema
);

export type SupplierReturnItemResponse = z.infer<typeof supplierReturnItemResponseSchema>;
export type CustomerReturnItemResponse = z.infer<typeof customerReturnItemResponseSchema>;
export type SupplierReturnDetail = z.infer<typeof supplierReturnDetailSchema>;
export type CustomerReturnDetail = z.infer<typeof customerReturnDetailSchema>;
export type SupplierReturnListItem = z.infer<typeof supplierReturnListItemSchema>;
export type CustomerReturnListItem = z.infer<typeof customerReturnListItemSchema>;
export type SupplierReturnResponse = z.infer<typeof supplierReturnResponseSchema>;
export type SupplierReturnsResponse = z.infer<typeof supplierReturnsResponseSchema>;
export type CustomerReturnResponse = z.infer<typeof customerReturnResponseSchema>;
export type CustomerReturnsResponse = z.infer<typeof customerReturnsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if within return window
 *
 * Business Rule (from FEATURES.md RET-002):
 * Customer returns must be within return window (e.g., 7 days)
 *
 * @param orderDate - Original order date
 * @param returnRequestDate - Return request date
 * @param windowDays - Return window in days (default 7)
 * @returns True if within window
 */
export function isWithinReturnWindow(
  orderDate: Date,
  returnRequestDate: Date,
  windowDays: number = 7
): boolean {
  const maxReturnDate = new Date(orderDate);
  maxReturnDate.setDate(maxReturnDate.getDate() + windowDays);
  return returnRequestDate <= maxReturnDate;
}

/**
 * Calculate restocking fee
 *
 * Business Rule: Restocking fee for opened/used items
 *
 * @param itemValue - Item value
 * @param condition - Item condition
 * @param restockingRate - Restocking fee percentage (default 15%)
 * @returns Restocking fee amount
 */
export function calculateRestockingFee(
  itemValue: number,
  condition: string,
  restockingRate: number = 15
): number {
  // No fee for unopened items
  if (condition === 'unopened') return 0;

  // Apply restocking fee for opened/used items
  if (condition === 'opened') {
    return (itemValue * restockingRate) / 100;
  }

  // No fee for damaged/defective (supplier's fault)
  return 0;
}

/**
 * Determine if item is restockable
 *
 * Business Rule: Only restock items in good condition
 *
 * @param condition - Item condition
 * @param isPerishable - Whether product is perishable
 * @returns True if can restock
 */
export function isRestockable(
  condition: string,
  isPerishable: boolean
): boolean {
  // Cannot restock perishable items (food safety)
  if (isPerishable) return false;

  // Only restock unopened items
  return condition === 'unopened';
}

/**
 * Validate return status transition
 *
 * Business Rule: Status flow validation
 *
 * @param currentStatus - Current return status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidReturnStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    // Supplier returns
    draft: ['approved', 'cancelled'],
    approved: ['shipped', 'cancelled'],
    shipped: ['completed'],
    completed: [],

    // Customer returns
    pending: ['approved', 'rejected', 'cancelled'],
    rejected: [],
    refunded: [],
    exchanged: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate return refund amount
 *
 * Business Rule: Total refund = item values - restocking fees
 *
 * @param items - Return items with values
 * @param restockingFees - Total restocking fees
 * @returns Net refund amount
 */
export function calculateReturnRefund(
  items: Array<{ lineTotal: number }>,
  restockingFees: number = 0
): number {
  const totalValue = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return Math.max(0, totalValue - restockingFees);
}

/**
 * Check if manager approval required
 *
 * Business Rule (from FEATURES.md RET-002):
 * Manager approval always required for returns above threshold
 *
 * @param returnValue - Total return value
 * @param approvalThreshold - Threshold requiring approval (default $100)
 * @returns True if approval required
 */
export function requiresManagerApprovalForReturn(
  returnValue: number,
  approvalThreshold: number = 100
): boolean {
  // Always require manager approval for returns
  // (can adjust threshold based on business rules)
  return true;
}

/**
 * Check if can create exchange from return
 *
 * Business Rule: Exchange only for approved returns
 *
 * @param returnStatus - Return status
 * @param returnType - Return type
 * @returns True if can exchange
 */
export function canCreateExchange(
  returnStatus: string,
  returnType: string
): boolean {
  return returnStatus === 'approved' && returnType === 'exchange';
}

/**
 * Suggest return reason based on condition
 *
 * Helper to suggest appropriate return reason.
 *
 * @param condition - Item condition
 * @returns Suggested reasons
 */
export function suggestReturnReasons(condition: string): string[] {
  const reasonMap: Record<string, string[]> = {
    unopened: ['changed_mind', 'wrong_item', 'no_longer_needed'],
    opened: ['quality_issue', 'not_as_described', 'changed_mind'],
    damaged: ['received_damaged', 'shipping_damage'],
    defective: ['defective', 'quality_issue', 'not_working'],
  };

  return reasonMap[condition] || ['other'];
}
