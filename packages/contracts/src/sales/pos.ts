/**
 * Point of Sale (POS) contracts for sales module
 *
 * Covers shift management, payment processing, order refunds, and kitchen display system.
 * POS operations are tightly integrated with inventory (FEFO picking) and cash management.
 *
 * CRITICAL: Payment completion triggers:
 * - Inventory deduction using FEFO (First Expiry First Out) picking
 * - Ledger entries (movement_type = 'sale', negative qty)
 * - Loyalty points calculation
 * - Receipt generation
 *
 * Covers:
 * 1. Shift management with drawer reconciliation (POS-001)
 * 2. Payment processing with multi-tender support (POS-003)
 * 3. Order refunds with manager approval (POS-004)
 * 4. Kitchen Display System with prep status tracking (POS-005)
 *
 * @module @contracts/erp/sales/pos
 * @see FEATURES.md POS-001 - POS Shift Management
 * @see FEATURES.md POS-003 - Payment Processing
 * @see FEATURES.md POS-004 - Order Refunds
 * @see FEATURES.md POS-005 - Kitchen Display System
 * @see USER_STORIES.md Epic 6 - POS & Orders
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  userRelationSchema,
} from '../common.js';
import {
  moneyAmountSchema,
  uuidSchema,
  dateTimeInputSchema,
} from '../primitives.js';
import {
  paymentMethodSchema,
  paymentStatusSchema,
  prepStatusSchema,
  kitchenStationSchema,
  orderStatusSchema,
} from '../enums.js';

// ============================================================================
// SHIFT MANAGEMENT SCHEMAS (POS-001)
// ============================================================================

/**
 * Open POS Shift schema
 *
 * Business Rules (from FEATURES.md POS-001):
 * - One active shift per terminal per location
 * - Starting cash float required
 * - Cannot have multiple open shifts on same terminal
 * - Shift number auto-generated (SH-YYYYMMDD-TERM001-001)
 *
 * @see FEATURES.md POS-001 - "Open shift with starting cash float"
 * @see FEATURES.md POS-001 - "Shift number auto-generated"
 *
 * @example
 * ```typescript
 * {
 *   locationId: "uuid...",
 *   terminalId: "uuid...",
 *   startingCash: 200.00,
 *   notes: "Morning shift"
 * }
 * ```
 */
export const shiftOpenSchema = z.object({
  locationId: uuidSchema,
  terminalId: uuidSchema, // POS terminal ID
  startingCash: moneyAmountSchema, // Starting cash float
  notes: z.string().max(500).optional(),
});

/**
 * Drawer movement types
 *
 * Business Rules (from FEATURES.md POS-001):
 * - cash_in: Add cash to drawer (e.g., change from safe)
 * - cash_out: Remove cash from drawer (e.g., petty cash)
 * - safe_drop: Move excess cash to safe
 * - petty_cash: Petty cash expense
 *
 * @see FEATURES.md POS-001 - "Drawer movements (cash in/out, safe drop, petty cash)"
 */
export const drawerMovementTypeSchema = z.enum([
  'cash_in',
  'cash_out',
  'safe_drop',
  'petty_cash',
]);

/**
 * Record drawer movement
 *
 * Business Rules (from FEATURES.md POS-001):
 * - Requires reason for all movements
 * - Manager approval for cash_out > threshold
 * - Affects expected cash calculation
 *
 * @see FEATURES.md POS-001 - "Drawer movements (cash in/out, safe drop, petty cash)"
 */
export const drawerMovementSchema = z.object({
  shiftId: uuidSchema,
  movementType: drawerMovementTypeSchema,
  amount: moneyAmountSchema,
  reason: z.string().min(1).max(500),
  approvedBy: uuidSchema.optional(), // Manager approval
  notes: z.string().max(500).optional(),
});

/**
 * Close POS Shift schema
 *
 * Business Rules (from FEATURES.md POS-001):
 * - Count actual cash in drawer
 * - System calculates expected cash:
 *   starting_cash + cash_sales + cash_in - cash_out - safe_drops
 * - Variance = actual_cash - expected_cash
 * - Alert if variance > threshold (e.g., $5)
 * - Cannot close with unpaid orders
 * - Generate shift report
 *
 * @see FEATURES.md POS-001 - "Close shift with variance tracking"
 * @see FEATURES.md POS-001 - "Shift reconciliation (expected vs actual)"
 * @see FEATURES.md POS-001 - "Alert if variance > threshold"
 *
 * @example
 * ```typescript
 * {
 *   shiftId: "uuid...",
 *   endingCash: 487.50,
 *   cashBreakdown: {
 *     hundreds: 2,
 *     fifties: 5,
 *     twenties: 8,
 *     tens: 3,
 *     fives: 4,
 *     ones: 7,
 *     quarters: 10,
 *     dimes: 5,
 *     nickels: 3,
 *     pennies: 15
 *   },
 *   notes: "Busy morning shift"
 * }
 * ```
 */
export const shiftCloseSchema = z.object({
  shiftId: uuidSchema,
  endingCash: moneyAmountSchema, // Actual counted cash
  cashBreakdown: z.object({
    hundreds: z.number().int().nonnegative().default(0),
    fifties: z.number().int().nonnegative().default(0),
    twenties: z.number().int().nonnegative().default(0),
    tens: z.number().int().nonnegative().default(0),
    fives: z.number().int().nonnegative().default(0),
    ones: z.number().int().nonnegative().default(0),
    quarters: z.number().int().nonnegative().default(0), // $0.25
    dimes: z.number().int().nonnegative().default(0),    // $0.10
    nickels: z.number().int().nonnegative().default(0),  // $0.05
    pennies: z.number().int().nonnegative().default(0),  // $0.01
  }).optional(),
  notes: z.string().max(1000).optional(),
  closedAt: dateTimeInputSchema.optional(), // Defaults to now
});

export type ShiftOpen = z.infer<typeof shiftOpenSchema>;
export type DrawerMovementType = z.infer<typeof drawerMovementTypeSchema>;
export type DrawerMovement = z.infer<typeof drawerMovementSchema>;
export type ShiftClose = z.infer<typeof shiftCloseSchema>;

// ============================================================================
// PAYMENT PROCESSING SCHEMAS (POS-003)
// ============================================================================

/**
 * Payment tender (individual payment in a transaction)
 *
 * Business Rules (from FEATURES.md POS-003):
 * - Multi-tender support: cash, card, mobile, gift card, store credit
 * - Payment amount must be > 0
 * - Total tenders must equal order total
 * - Change calculated for cash overpayment
 *
 * @see FEATURES.md POS-003 - "Multi-tender support"
 * @see FEATURES.md POS-003 - "Split payments"
 *
 * @example
 * ```typescript
 * {
 *   paymentMethod: "card",
 *   amount: 45.50,
 *   cardLast4: "4242",
 *   cardBrand: "visa",
 *   transactionRef: "ch_3abc..."
 * }
 * ```
 */
export const paymentTenderSchema = z.object({
  paymentMethod: paymentMethodSchema, // cash, card, mobile, gift_card, store_credit
  amount: moneyAmountSchema,

  // Card payment fields
  cardLast4: z.string().length(4).optional(),
  cardBrand: z.enum(['visa', 'mastercard', 'amex', 'discover', 'other']).optional(),
  cardholderName: z.string().max(100).optional(),
  authCode: z.string().max(50).optional(),
  transactionRef: z.string().max(100).optional(), // Payment gateway reference

  // Cash payment fields
  amountTendered: moneyAmountSchema.optional(), // For cash: amount given by customer
  changeGiven: moneyAmountSchema.optional(),    // For cash: change returned

  // Gift card / Store credit fields
  giftCardCode: z.string().max(50).optional(),
  storeCreditId: uuidSchema.optional(),

  // Mobile payment fields (e.g., Apple Pay, Google Pay)
  mobileWalletType: z.enum(['apple_pay', 'google_pay', 'samsung_pay', 'other']).optional(),

  notes: z.string().max(500).optional(),
});

/**
 * Process payment for order
 *
 * CRITICAL (from FEATURES.md POS-003):
 * - Payment completion triggers:
 *   1. Inventory deduction using FEFO picking
 *   2. Ledger entries (movement_type = 'sale', negative qty)
 *   3. Loyalty points calculation
 *   4. Receipt generation
 * - Cannot pay cancelled/refunded orders
 * - Total payment must equal order total
 * - Supports split payments across multiple tenders
 *
 * @see FEATURES.md POS-003 - "Payment completion triggers inventory deduction (FEFO)"
 * @see FEATURES.md POS-003 - "Ledger entry created (movement_type = 'sale', negative qty)"
 * @see FEATURES.md POS-003 - "Loyalty points calculated and added"
 *
 * @example
 * ```typescript
 * {
 *   orderId: "uuid...",
 *   shiftId: "uuid...",
 *   tenders: [
 *     { paymentMethod: "card", amount: 30.00, cardLast4: "4242" },
 *     { paymentMethod: "cash", amount: 15.50, amountTendered: 20.00, changeGiven: 4.50 }
 *   ],
 *   tipAmount: 5.00,
 *   loyaltyCardNumber: "LOYAL123"
 * }
 * ```
 */
export const orderPaymentSchema = z.object({
  orderId: uuidSchema,
  shiftId: uuidSchema, // Link payment to shift
  tenders: z
    .array(paymentTenderSchema)
    .min(1, 'At least one payment tender is required')
    .max(10, 'Maximum 10 payment tenders per transaction'),
  tipAmount: moneyAmountSchema.optional(), // Optional tip
  loyaltyCardNumber: z.string().max(50).optional(), // For loyalty points
  notes: z.string().max(500).optional(),
  paidAt: dateTimeInputSchema.optional(), // Defaults to now
});

export type PaymentTender = z.infer<typeof paymentTenderSchema>;
export type OrderPayment = z.infer<typeof orderPaymentSchema>;

// ============================================================================
// ORDER REFUND SCHEMAS (POS-004)
// ============================================================================

/**
 * Refund reasons
 *
 * Business Rules (from FEATURES.md POS-004):
 * - Refund reason required for audit trail
 *
 * @see FEATURES.md POS-004 - "Refund reason (wrong order, quality issue, customer request)"
 */
export const refundReasonSchema = z.enum([
  'wrong_order',      // Order was incorrect
  'quality_issue',    // Quality problem
  'customer_request', // Customer changed mind
  'overcharge',       // Pricing error
  'other',            // Other reason
]);

/**
 * Refund order (full or partial)
 *
 * Business Rules (from FEATURES.md POS-004):
 * - Manager approval required
 * - Can only refund paid orders
 * - Inventory reversal: add back to stock using FEFO lots
 * - Payment reversal: refund to original payment method(s)
 * - Loyalty points reversal if applicable
 * - Cannot refund same order twice (unless partial)
 * - Order status changes to 'refunded'
 *
 * @see FEATURES.md POS-004 - "Manager approval required"
 * @see FEATURES.md POS-004 - "Inventory reversal (add back to stock)"
 * @see FEATURES.md POS-004 - "Payment reversal (refund to payment method)"
 * @see FEATURES.md POS-004 - "Loyalty points reversal"
 *
 * @example
 * ```typescript
 * {
 *   orderId: "uuid...",
 *   refundReason: "quality_issue",
 *   refundAmount: 45.50, // Can be partial
 *   refundItems: [
 *     { orderItemId: "uuid...", quantity: 1, reason: "Burnt" }
 *   ],
 *   managerApprovedBy: "uuid...",
 *   notes: "Customer complained about burnt food"
 * }
 * ```
 */
export const orderRefundSchema = z.object({
  orderId: uuidSchema,
  refundReason: refundReasonSchema,
  refundAmount: moneyAmountSchema, // Can be partial refund
  refundItems: z.array(z.object({
    orderItemId: uuidSchema,
    quantity: z.number().positive(), // Quantity to refund
    reason: z.string().max(500).optional(),
  })).optional(), // For partial refunds, specify items
  managerApprovedBy: uuidSchema, // Manager who approved refund
  refundToPaymentMethod: paymentMethodSchema.optional(), // Override refund method
  notes: z.string().max(1000).optional(),
  refundedAt: dateTimeInputSchema.optional(), // Defaults to now
});

export type RefundReason = z.infer<typeof refundReasonSchema>;
export type OrderRefund = z.infer<typeof orderRefundSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Shift query filters
 */
export const shiftFiltersSchema = z
  .object({
    terminalId: uuidSchema.optional(),
    status: z.enum(['open', 'closed']).optional(),
    userId: uuidSchema.optional(), // Cashier
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Shift query schema
 */
export const shiftQuerySchema = baseQuerySchema.merge(shiftFiltersSchema);

/**
 * Payment query filters
 */
export const paymentFiltersSchema = z
  .object({
    orderId: uuidSchema.optional(),
    shiftId: uuidSchema.optional(),
    paymentMethod: paymentMethodSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Payment query schema
 */
export const paymentQuerySchema = baseQuerySchema.merge(paymentFiltersSchema);

export type ShiftFilters = z.infer<typeof shiftFiltersSchema>;
export type ShiftQuery = z.infer<typeof shiftQuerySchema>;
export type PaymentFilters = z.infer<typeof paymentFiltersSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Shift detail schema
 *
 * @see FEATURES.md POS-001 - Shift structure
 */
export const shiftDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  shiftNumber: z.string(), // Auto-generated: SH-YYYYMMDD-TERM001-001
  locationId: uuidSchema,
  terminalId: uuidSchema,
  status: z.enum(['open', 'closed']),

  // Shift timing
  openedAt: z.date(),
  closedAt: z.date().nullable(),
  openedBy: uuidSchema,
  closedBy: uuidSchema.nullable(),

  // Cash management
  startingCash: moneyAmountSchema,
  endingCash: moneyAmountSchema.nullable(),
  expectedCash: moneyAmountSchema.nullable(), // Calculated
  cashVariance: moneyAmountSchema.nullable(), // actual - expected

  // Sales summary
  totalOrders: z.number().int(),
  totalSales: moneyAmountSchema,
  cashSales: moneyAmountSchema,
  cardSales: moneyAmountSchema,
  otherSales: moneyAmountSchema, // Mobile, gift card, store credit

  // Drawer movements
  totalCashIn: moneyAmountSchema,
  totalCashOut: moneyAmountSchema,
  totalSafeDrops: moneyAmountSchema,

  // Cash breakdown (from close)
  cashBreakdown: z.object({
    hundreds: z.number().int(),
    fifties: z.number().int(),
    twenties: z.number().int(),
    tens: z.number().int(),
    fives: z.number().int(),
    ones: z.number().int(),
    quarters: z.number().int(),
    dimes: z.number().int(),
    nickels: z.number().int(),
    pennies: z.number().int(),
  }).nullable(),

  // Flags
  hasVariance: z.boolean(),
  varianceExceedsThreshold: z.boolean(),

  // Notes
  notes: z.string().nullable(),
  closeNotes: z.string().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  openedByUser: userRelationSchema.nullable(),
  closedByUser: userRelationSchema.nullable(),
  movements: z.array(z.object({
    id: uuidSchema,
    movementType: z.string(),
    amount: moneyAmountSchema,
    reason: z.string(),
    createdAt: z.date(),
  })),
});

/**
 * Shift list item schema
 */
export const shiftListItemSchema = shiftDetailSchema.omit({
  movements: true,
  cashBreakdown: true,
});

/**
 * Payment detail schema
 */
export const paymentDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  orderId: uuidSchema,
  shiftId: uuidSchema.nullable(),
  locationId: uuidSchema,

  // Payment amounts
  subtotal: moneyAmountSchema,
  taxAmount: moneyAmountSchema,
  tipAmount: moneyAmountSchema,
  totalAmount: moneyAmountSchema,

  // Payment status
  paymentStatus: paymentStatusSchema,
  paidAt: z.date().nullable(),

  // Loyalty
  loyaltyCardNumber: z.string().nullable(),
  loyaltyPointsEarned: z.number().int().nullable(),

  // Notes
  notes: z.string().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  tenders: z.array(z.object({
    id: uuidSchema,
    paymentMethod: z.string(),
    amount: moneyAmountSchema,
    cardLast4: z.string().nullable(),
    cardBrand: z.string().nullable(),
    transactionRef: z.string().nullable(),
    amountTendered: moneyAmountSchema.nullable(),
    changeGiven: moneyAmountSchema.nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
  })),
});

/**
 * Refund detail schema
 */
export const refundDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  orderId: uuidSchema,
  paymentId: uuidSchema.nullable(), // Original payment

  // Refund details
  refundReason: z.string(),
  refundAmount: moneyAmountSchema,
  refundStatus: z.enum(['pending', 'approved', 'processed', 'failed']),

  // Approval
  managerApprovedBy: uuidSchema,
  approvedAt: z.date().nullable(),

  // Processing
  refundedAt: z.date().nullable(),
  refundToPaymentMethod: z.string().nullable(),

  // Inventory reversal
  inventoryReversed: z.boolean(),

  // Loyalty reversal
  loyaltyPointsReversed: z.number().int().nullable(),

  // Notes
  notes: z.string().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  refundItems: z.array(z.object({
    id: uuidSchema,
    orderItemId: uuidSchema,
    productId: uuidSchema,
    productName: z.string(),
    quantity: z.string(),
    refundAmount: moneyAmountSchema,
    reason: z.string().nullable(),
  })),
});

/**
 * Shift detail response
 */
export const shiftResponseSchema = successResponseSchema(shiftDetailSchema);

/**
 * Shifts paginated response
 */
export const shiftsResponseSchema = paginatedResponseSchema(shiftListItemSchema);

/**
 * Payment detail response
 */
export const paymentResponseSchema = successResponseSchema(paymentDetailSchema);

/**
 * Payments paginated response
 */
export const paymentsResponseSchema = paginatedResponseSchema(paymentDetailSchema);

/**
 * Refund detail response
 */
export const refundResponseSchema = successResponseSchema(refundDetailSchema);

/**
 * Refunds paginated response
 */
export const refundsResponseSchema = paginatedResponseSchema(refundDetailSchema);

export type ShiftDetail = z.infer<typeof shiftDetailSchema>;
export type ShiftListItem = z.infer<typeof shiftListItemSchema>;
export type PaymentDetail = z.infer<typeof paymentDetailSchema>;
export type RefundDetail = z.infer<typeof refundDetailSchema>;
export type ShiftResponse = z.infer<typeof shiftResponseSchema>;
export type ShiftsResponse = z.infer<typeof shiftsResponseSchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
export type PaymentsResponse = z.infer<typeof paymentsResponseSchema>;
export type RefundResponse = z.infer<typeof refundResponseSchema>;
export type RefundsResponse = z.infer<typeof refundsResponseSchema>;

// ============================================================================
// KITCHEN DISPLAY SYSTEM (KDS) SCHEMAS (POS-005)
// ============================================================================

/**
 * Update order item prep status
 *
 * Business Rules (from FEATURES.md POS-005):
 * - Status flow: queued → preparing → ready
 * - When all items ready → order status = 'ready'
 * - Notification sent to cashier when ready
 * - Prep time = prep_completed_at - prep_started_at
 *
 * @see FEATURES.md POS-005 - "Item status updates (queued → preparing → ready)"
 * @see FEATURES.md POS-005 - "Preparation time analytics"
 *
 * @example
 * ```typescript
 * {
 *   orderItemId: "item-123",
 *   prepStatus: "preparing",
 *   station: "hot"
 * }
 * ```
 */
export const prepStatusUpdateSchema = z.object({
  orderItemId: uuidSchema,
  prepStatus: prepStatusSchema, // queued, preparing, ready
  station: kitchenStationSchema.optional(), // hot, cold, drinks
  prepStartedAt: dateTimeInputSchema.optional(),
  prepCompletedAt: dateTimeInputSchema.optional(),
});

/**
 * Update kitchen order status
 *
 * Business Rule: Order status changes when all items reach same status
 */
export const kitchenStatusUpdateSchema = z.object({
  orderId: uuidSchema,
  status: orderStatusSchema, // confirmed, preparing, ready, completed
  notes: z.string().max(500).optional(),
});

export type PrepStatusUpdate = z.infer<typeof prepStatusUpdateSchema>;
export type KitchenStatusUpdate = z.infer<typeof kitchenStatusUpdateSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Calculate expected cash in drawer
 *
 * Business Rule (from FEATURES.md POS-001):
 * Expected cash = starting_cash + cash_sales + cash_in - cash_out - safe_drops
 *
 * @param startingCash - Starting cash float
 * @param cashSales - Total cash sales
 * @param cashIn - Cash additions
 * @param cashOut - Cash removals
 * @param safeDrops - Safe deposits
 * @returns Expected cash amount
 */
export function calculateExpectedCash(
  startingCash: number,
  cashSales: number,
  cashIn: number,
  cashOut: number,
  safeDrops: number
): number {
  return startingCash + cashSales + cashIn - cashOut - safeDrops;
}

/**
 * Calculate cash variance
 *
 * Business Rule (from FEATURES.md POS-001):
 * Variance = actual_cash - expected_cash
 * Alert if |variance| > threshold
 *
 * @param actualCash - Actual counted cash
 * @param expectedCash - Calculated expected cash
 * @returns Cash variance
 */
export function calculateCashVariance(
  actualCash: number,
  expectedCash: number
): number {
  return actualCash - expectedCash;
}

/**
 * Check if variance exceeds threshold
 *
 * Business Rule (from FEATURES.md POS-001):
 * Alert if variance > threshold (e.g., $5)
 *
 * @param variance - Cash variance
 * @param threshold - Alert threshold (default $5)
 * @returns True if variance exceeds threshold
 */
export function exceedsVarianceThreshold(
  variance: number,
  threshold: number = 5
): boolean {
  return Math.abs(variance) > threshold;
}

/**
 * Calculate cash breakdown total
 *
 * Helper to calculate total cash from denomination breakdown.
 *
 * @param breakdown - Cash denomination counts
 * @returns Total cash amount
 */
export function calculateCashBreakdownTotal(breakdown: {
  hundreds?: number;
  fifties?: number;
  twenties?: number;
  tens?: number;
  fives?: number;
  ones?: number;
  quarters?: number;
  dimes?: number;
  nickels?: number;
  pennies?: number;
}): number {
  return (
    (breakdown.hundreds || 0) * 100 +
    (breakdown.fifties || 0) * 50 +
    (breakdown.twenties || 0) * 20 +
    (breakdown.tens || 0) * 10 +
    (breakdown.fives || 0) * 5 +
    (breakdown.ones || 0) * 1 +
    (breakdown.quarters || 0) * 0.25 +
    (breakdown.dimes || 0) * 0.10 +
    (breakdown.nickels || 0) * 0.05 +
    (breakdown.pennies || 0) * 0.01
  );
}

/**
 * Validate payment total matches order total
 *
 * Business Rule (from FEATURES.md POS-003):
 * Total payment tenders must equal order total
 *
 * @param tenders - Payment tenders
 * @param orderTotal - Order total amount
 * @param tolerance - Acceptable tolerance (default $0.01)
 * @returns Validation result
 */
export function validatePaymentTotal(
  tenders: Array<{ amount: number }>,
  orderTotal: number,
  tolerance: number = 0.01
): { valid: boolean; error?: string; totalPaid?: number } {
  const totalPaid = tenders.reduce((sum, tender) => sum + tender.amount, 0);
  const difference = Math.abs(totalPaid - orderTotal);

  if (difference > tolerance) {
    return {
      valid: false,
      error: `Payment total ($${totalPaid.toFixed(2)}) does not match order total ($${orderTotal.toFixed(2)})`,
      totalPaid,
    };
  }

  return { valid: true, totalPaid };
}

/**
 * Calculate change for cash payment
 *
 * Business Rule (from FEATURES.md POS-003):
 * Change = amount_tendered - payment_amount
 *
 * @param amountTendered - Cash given by customer
 * @param paymentAmount - Actual payment amount
 * @returns Change to give back
 */
export function calculateChange(
  amountTendered: number,
  paymentAmount: number
): number {
  const change = amountTendered - paymentAmount;
  return Math.max(0, change);
}

/**
 * Check if order can be refunded
 *
 * Business Rule (from FEATURES.md POS-004):
 * - Can only refund paid orders
 * - Cannot refund already refunded orders
 *
 * @param paymentStatus - Order payment status
 * @param orderStatus - Order status
 * @returns True if refund allowed
 */
export function canRefundOrder(
  paymentStatus: string,
  orderStatus: string
): boolean {
  return paymentStatus === 'paid' && orderStatus !== 'refunded';
}

/**
 * Calculate refund amount validation
 *
 * Business Rule: Refund amount cannot exceed original payment
 *
 * @param refundAmount - Requested refund amount
 * @param originalPayment - Original payment amount
 * @returns Validation result
 */
export function validateRefundAmount(
  refundAmount: number,
  originalPayment: number
): { valid: boolean; error?: string } {
  if (refundAmount <= 0) {
    return { valid: false, error: 'Refund amount must be greater than 0' };
  }

  if (refundAmount > originalPayment) {
    return {
      valid: false,
      error: `Refund amount ($${refundAmount.toFixed(2)}) cannot exceed original payment ($${originalPayment.toFixed(2)})`,
    };
  }

  return { valid: true };
}

/**
 * Check if manager approval required for refund
 *
 * Business Rule (from FEATURES.md POS-004):
 * Manager approval always required for refunds
 *
 * @param refundAmount - Refund amount
 * @returns Always true
 */
export function requiresManagerApprovalForRefund(refundAmount: number): boolean {
  // Always require manager approval for refunds
  return true;
}
