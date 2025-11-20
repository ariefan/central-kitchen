/**
 * Order Management contracts for sales module
 *
 * Covers both POS and online ordering with unified schema.
 * Orders flow through: draft → confirmed → preparing → ready → completed
 *
 * CRITICAL: Payment completion triggers:
 * - Inventory deduction using FEFO picking
 * - Ledger entries (movement_type = 'sale', negative qty)
 * - Loyalty points calculation
 *
 * Covers:
 * 1. POS order creation (POS-002)
 * 2. Online ordering (ORD-001)
 * 3. Cart management
 * 4. Order workflow
 *
 * @module @contracts/erp/sales/orders
 * @see FEATURES.md POS-002 - POS Order Creation
 * @see FEATURES.md ORD-001 - Online Ordering
 * @see USER_STORIES.md Epic 6 - POS & Orders
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
} from '../common.js';
import {
  quantitySchema,
  moneyAmountSchema,
  taxRateSchema,
  uuidSchema,
  emailSchema,
} from '../primitives.js';
import {
  orderChannelSchema,
  orderTypeSchema,
  orderStatusSchema,
  prepStatusSchema,
} from '../enums.js';

// ============================================================================
// ORDER ITEM SCHEMAS
// ============================================================================

/**
 * Order item modifier
 *
 * Modifiers add customizations to order items (e.g., extra shot, no sugar).
 *
 * @see FEATURES.md POS-002 - "Modifier application"
 */
export const orderItemModifierInputSchema = z.object({
  modifierId: uuidSchema,
  modifierName: z.string().max(100),
  price: z.number().nonnegative(),
});

/**
 * Order item for input (POS and online)
 *
 * @see FEATURES.md POS-002 - Order items with variants and modifiers
 */
export const orderItemInputSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.optional(), // Size, flavor, etc.
  quantity: quantitySchema,
  unitPrice: z.number().nonnegative(), // From price book
  discountAmount: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(), // Special instructions
  modifiers: z.array(orderItemModifierInputSchema).max(20).optional(),
});

/**
 * Order item response from database
 */
const orderItemResponseSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  quantity: z.string(), // Numeric from DB
  unitPrice: moneyAmountSchema,
  discountAmount: moneyAmountSchema,
  lineTotal: moneyAmountSchema, // quantity × (unitPrice + modifier_prices) - discount
  notes: z.string().nullable(),

  // Kitchen Display System (KDS) fields
  prepStatus: prepStatusSchema.nullable(),
  station: z.string().nullable(), // hot, cold, drinks

  // Relations
  product: productRelationSchema.nullable(),
  modifiers: z.array(z.object({
    id: uuidSchema,
    modifierId: uuidSchema,
    modifierName: z.string(),
    price: moneyAmountSchema,
  })),
});

export type OrderItemModifierInput = z.infer<typeof orderItemModifierInputSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

// ============================================================================
// ORDER CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Order schema (POS and online)
 *
 * Business Rules (from FEATURES.md POS-002):
 * - Order number auto-generated (ORD-YYYYMM-00001)
 * - Status starts as "draft"
 * - Shift must be open for POS orders
 * - Menu items filtered by location availability
 * - Unit price from price book or product default
 * - At least 1 item required
 *
 * @see FEATURES.md POS-002 - POS Order Creation
 * @see FEATURES.md ORD-001 - Online Ordering
 */
export const orderCreateSchema = z.object({
  locationId: uuidSchema,
  channel: orderChannelSchema, // pos, online, wholesale
  orderType: orderTypeSchema, // dine_in, takeaway, delivery
  customerId: uuidSchema.optional(), // Optional for POS, required for online
  shiftId: uuidSchema.optional(), // Required for POS orders

  // Dine-in specific
  tableNumber: z.string().max(20).optional(),

  // Delivery specific
  deliveryAddress: z.string().max(500).optional(),
  deliveryFee: z.number().nonnegative().optional(),
  deliveryInstructions: z.string().max(500).optional(),

  // Order details
  notes: z.string().max(1000).optional(),
  items: z
    .array(orderItemInputSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items per order'),
});

/**
 * Update Order schema
 *
 * Business Rules:
 * - Only draft orders can be updated
 * - Cannot update after payment
 */
export const orderUpdateSchema = orderCreateSchema
  .omit({ items: true, shiftId: true })
  .partial();

export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderUpdate = z.infer<typeof orderUpdateSchema>;

// ============================================================================
// ORDER WORKFLOW SCHEMAS
// ============================================================================

/**
 * Void Order schema
 *
 * Business Rules (from FEATURES.md POS-002):
 * - Cannot void order after payment
 * - Requires reason
 *
 * @see FEATURES.md POS-002 - "Void order (unpaid only)"
 */
export const orderVoidSchema = z.object({
  voidReason: z.string().min(1).max(500),
});

export type OrderVoid = z.infer<typeof orderVoidSchema>;

// ============================================================================
// CART MANAGEMENT SCHEMAS (Online Orders)
// ============================================================================

/**
 * Add item to cart
 *
 * Business Rules (from FEATURES.md ORD-001):
 * - Cart persists for 7 days
 * - Session ID for guest users
 * - Customer ID for logged-in users
 *
 * @see FEATURES.md ORD-001 - "Cart management"
 */
export const cartAddItemSchema = z.object({
  sessionId: z.string().optional(), // For guests
  customerId: uuidSchema.optional(), // For logged-in users
  locationId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.optional(),
  quantity: quantitySchema,
  notes: z.string().max(500).optional(),
  modifiers: z.array(orderItemModifierInputSchema).max(20).optional(),
});

/**
 * Update cart item
 */
export const cartUpdateItemSchema = z.object({
  quantity: quantitySchema,
  notes: z.string().max(500).optional(),
});

/**
 * Checkout from cart
 *
 * Business Rules (from FEATURES.md ORD-001):
 * - Order created from cart on checkout
 * - Cart cleared after order placement
 * - Minimum order amount for delivery enforced
 *
 * @see FEATURES.md ORD-001 - "Order created from cart on checkout"
 */
export const checkoutSchema = z.object({
  sessionId: z.string().optional(),
  customerId: uuidSchema.optional(),
  orderType: orderTypeSchema, // delivery or pickup
  deliveryAddress: z.string().max(500).optional(),
  deliveryInstructions: z.string().max(500).optional(),
  voucherCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export type CartAddItem = z.infer<typeof cartAddItemSchema>;
export type CartUpdateItem = z.infer<typeof cartUpdateItemSchema>;
export type Checkout = z.infer<typeof checkoutSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Order query filters
 */
export const orderFiltersSchema = z
  .object({
    status: orderStatusSchema.optional(),
    channel: orderChannelSchema.optional(),
    orderType: orderTypeSchema.optional(),
    customerId: uuidSchema.optional(),
    shiftId: uuidSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Order query schema
 */
export const orderQuerySchema = baseQuerySchema.merge(orderFiltersSchema);

export type OrderFilters = z.infer<typeof orderFiltersSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Order detail schema (complete document)
 *
 * @see FEATURES.md POS-002 - Order structure
 */
export const orderDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: ORD-YYYYMM-00001
  locationId: uuidSchema,
  channel: orderChannelSchema,
  orderType: orderTypeSchema,
  status: orderStatusSchema,

  // Customer and shift
  customerId: uuidSchema.nullable(),
  shiftId: uuidSchema.nullable(),
  tableNumber: z.string().nullable(),

  // Delivery
  deliveryAddress: z.string().nullable(),
  deliveryFee: moneyAmountSchema.nullable(),
  deliveryInstructions: z.string().nullable(),

  // Financial
  subtotal: moneyAmountSchema,
  discountAmount: moneyAmountSchema,
  taxAmount: moneyAmountSchema,
  totalAmount: moneyAmountSchema,

  // Payment
  paymentStatus: z.enum(['unpaid', 'partial', 'paid', 'refunded']),

  // Notes
  notes: z.string().nullable(),
  voidReason: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  customer: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }).nullable(),
  items: z.array(orderItemResponseSchema),
});

/**
 * Order list item schema (without items)
 */
export const orderListItemSchema = orderDetailSchema.omit({
  items: true,
});

/**
 * Order detail response
 */
export const orderResponseSchema = successResponseSchema(
  orderDetailSchema
);

/**
 * Orders paginated response
 */
export const ordersResponseSchema = paginatedResponseSchema(
  orderListItemSchema
);

/**
 * Cart response
 */
export const cartResponseSchema = successResponseSchema(
  z.object({
    id: uuidSchema,
    sessionId: z.string().nullable(),
    customerId: uuidSchema.nullable(),
    locationId: uuidSchema,
    subtotal: moneyAmountSchema,
    itemCount: z.number().int(),
    updatedAt: z.date(),
    items: z.array(z.object({
      id: uuidSchema,
      productId: uuidSchema,
      productName: z.string(),
      variantId: uuidSchema.nullable(),
      quantity: z.string(),
      unitPrice: moneyAmountSchema,
      lineTotal: moneyAmountSchema,
      notes: z.string().nullable(),
      modifiers: z.array(orderItemModifierInputSchema),
    })),
  })
);

export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type OrderListItem = z.infer<typeof orderListItemSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
export type CartResponse = z.infer<typeof cartResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate order status transition
 *
 * Business Rules:
 * - draft → confirmed → preparing → ready → completed
 * - Can cancel from draft or confirmed
 * - Can refund from completed
 *
 * @param currentStatus - Current order status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidOrderStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['completed', 'cancelled'],
    completed: ['refunded'],
    cancelled: [],
    refunded: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate line total for order item
 *
 * Business Rule (from FEATURES.md POS-002):
 * Line total = quantity × (unit_price + modifier_prices) - discount
 *
 * @param quantity - Item quantity
 * @param unitPrice - Unit price
 * @param modifierPrices - Sum of modifier prices
 * @param discountAmount - Line discount amount
 * @returns Line total
 */
export function calculateOrderLineTotal(
  quantity: number,
  unitPrice: number,
  modifierPrices: number = 0,
  discountAmount: number = 0
): number {
  const basePrice = unitPrice + modifierPrices;
  const total = (quantity * basePrice) - discountAmount;
  return Math.max(0, total);
}

/**
 * Calculate order totals
 *
 * Business Rule (from FEATURES.md POS-002):
 * - Subtotal = SUM(line_total)
 * - Tax amount = subtotal × tax_rate
 * - Total = subtotal - discount + tax + delivery_fee
 *
 * @param lineItems - Order line items
 * @param taxRate - Tax rate (percentage)
 * @param orderDiscount - Order-level discount
 * @param deliveryFee - Delivery fee
 * @returns Order totals
 */
export function calculateOrderTotals(
  lineItems: Array<{ lineTotal: number }>,
  taxRate: number = 0,
  orderDiscount: number = 0,
  deliveryFee: number = 0
): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxableAmount = subtotal - orderDiscount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = subtotal - orderDiscount + taxAmount + deliveryFee;

  return {
    subtotal,
    taxAmount,
    totalAmount: Math.max(0, totalAmount),
  };
}

/**
 * Check if minimum order amount met for delivery
 *
 * Business Rule (from FEATURES.md ORD-001):
 * Minimum order amount for delivery (e.g., $20)
 *
 * @param subtotal - Order subtotal
 * @param minimumAmount - Minimum delivery amount (default 20)
 * @returns True if meets minimum
 */
export function meetsMinimumDeliveryAmount(
  subtotal: number,
  minimumAmount: number = 20
): boolean {
  return subtotal >= minimumAmount;
}

/**
 * Check if order can be voided
 *
 * Business Rule: Cannot void order after payment
 *
 * @param paymentStatus - Order payment status
 * @returns True if can void
 */
export function canVoidOrder(paymentStatus: string): boolean {
  return paymentStatus === 'unpaid';
}
