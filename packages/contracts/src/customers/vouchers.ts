/**
 * Vouchers & Promotions contracts for customers module
 *
 * Manages voucher campaigns, distribution, and redemption tracking.
 * Supports percentage discounts, fixed amounts, and gift cards.
 *
 * CRITICAL: Voucher validation on redemption:
 * - Is active and within date range
 * - Order total >= minimum spend
 * - Usage limits not exceeded (total and per-customer)
 * - Channel restrictions (POS/online/all)
 * - Discount calculation with max cap
 *
 * Covers:
 * 1. Voucher campaign creation (CUS-003)
 * 2. Bulk code generation
 * 3. Voucher validation and redemption
 * 4. ROI and performance tracking
 * 5. Voucher distribution
 *
 * @module @contracts/erp/customers/vouchers
 * @see FEATURES.md CUS-003 - Vouchers & Promotions
 * @see USER_STORIES.md Epic 9 - Customer & Loyalty
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
  moneyAmountSchema,
  dateInputSchema,
  dateTimeInputSchema,
} from '../primitives.js';
import {
  voucherTypeSchema,
  orderChannelSchema,
} from '../enums.js';

// ============================================================================
// VOUCHER CREATION SCHEMAS
// ============================================================================

/**
 * Create voucher campaign
 *
 * Business Rules (from FEATURES.md CUS-003):
 * - Voucher code is unique per tenant
 * - Three types: percentage_off, fixed_amount, gift_card
 * - Discount configuration with min spend
 * - Usage limits (total and per-customer)
 * - Valid date range
 * - Channel restrictions
 *
 * @see FEATURES.md CUS-003 - "Voucher campaign creation"
 * @see FEATURES.md CUS-003 - "Voucher types (percentage_off, fixed_amount, gift_card)"
 *
 * @example
 * ```typescript
 * {
 *   campaignName: "Summer Sale 2025",
 *   voucherType: "percentage_off",
 *   discountValue: 20,
 *   minSpend: 50,
 *   maxUses: 1000,
 *   maxUsesPerCustomer: 1,
 *   validFrom: "2025-06-01",
 *   validUntil: "2025-08-31",
 *   channel: "all"
 * }
 * ```
 */
export const voucherCreateSchema = z.object({
  code: z.string().min(3).max(50).optional(), // Auto-generated if not provided
  campaignName: z.string().min(1).max(200),
  voucherType: voucherTypeSchema, // percentage_off, fixed_amount, gift_card
  discountValue: z.number().positive(), // Percentage (0-100) or dollar amount
  minSpend: z.number().nonnegative().default(0), // Minimum order amount
  maxDiscount: z.number().positive().optional(), // Max discount cap (for percentage_off)
  maxUses: z.number().int().positive().optional(), // null = unlimited
  maxUsesPerCustomer: z.number().int().positive().default(1),
  validFrom: dateInputSchema,
  validUntil: dateInputSchema,
  channel: z.enum(['pos', 'online', 'wholesale', 'all']).default('all'), // pos, online, wholesale, all
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
  termsAndConditions: z.string().max(2000).optional(),
});

/**
 * Bulk generate voucher codes
 *
 * Business Rules (from FEATURES.md CUS-003):
 * - Bulk generation: create N vouchers with prefix (e.g., SAVE20-XXXXX)
 * - All vouchers share same campaign settings
 * - Unique codes generated
 *
 * @see FEATURES.md CUS-003 - "Auto-generated bulk codes"
 *
 * @example
 * ```typescript
 * {
 *   campaignName: "Welcome Vouchers",
 *   codePrefix: "WELCOME",
 *   quantity: 1000,
 *   voucherType: "fixed_amount",
 *   discountValue: 5,
 *   validFrom: "2025-01-01",
 *   validUntil: "2025-12-31"
 * }
 * // Generates: WELCOME-A1B2C, WELCOME-D3E4F, etc.
 * ```
 */
export const voucherBulkCreateSchema = z.object({
  campaignName: z.string().min(1).max(200),
  codePrefix: z.string().min(2).max(20), // e.g., "SAVE20", "WELCOME"
  quantity: z.number().int().min(1).max(10000), // Max 10k vouchers per batch
  voucherType: voucherTypeSchema,
  discountValue: z.number().positive(),
  minSpend: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional(),
  maxUsesPerCustomer: z.number().int().positive().default(1),
  validFrom: dateInputSchema,
  validUntil: dateInputSchema,
  channel: z.enum(['pos', 'online', 'wholesale', 'all']).default('all'),
  description: z.string().max(500).optional(),
});

/**
 * Update voucher campaign
 *
 * Business Rules:
 * - Cannot change voucher type after creation
 * - Cannot change code after creation
 * - Can extend validity dates
 * - Can increase usage limits
 */
export const voucherUpdateSchema = voucherCreateSchema
  .omit({ code: true, voucherType: true })
  .partial();

export type VoucherCreate = z.infer<typeof voucherCreateSchema>;
export type VoucherBulkCreate = z.infer<typeof voucherBulkCreateSchema>;
export type VoucherUpdate = z.infer<typeof voucherUpdateSchema>;

// ============================================================================
// VOUCHER VALIDATION & REDEMPTION SCHEMAS
// ============================================================================

/**
 * Validate voucher for order
 *
 * Business Rules (from FEATURES.md CUS-003):
 * - Is active and within date range
 * - Order total >= min_spend
 * - Uses < max_uses
 * - Customer uses < max_uses_per_customer
 * - Channel matches (if restricted)
 *
 * @see FEATURES.MD CUS-003 - "Validation on redemption"
 *
 * @example
 * ```typescript
 * {
 *   voucherCode: "SAVE20",
 *   customerId: "uuid...",
 *   orderSubtotal: 100.00,
 *   channel: "online"
 * }
 * ```
 */
export const validateVoucherSchema = z.object({
  voucherCode: z.string().min(1).max(50),
  customerId: uuidSchema.optional(), // Guest orders don't have customer
  orderSubtotal: z.number().nonnegative(),
  channel: z.enum(['pos', 'online', 'wholesale']),
});

/**
 * Apply voucher to order
 *
 * Records redemption and returns discount amount.
 */
export const applyVoucherSchema = z.object({
  voucherCode: z.string().min(1).max(50),
  orderId: uuidSchema,
  customerId: uuidSchema.optional(),
  orderSubtotal: z.number().nonnegative(),
  channel: z.enum(['pos', 'online', 'wholesale']),
});

export type ValidateVoucher = z.infer<typeof validateVoucherSchema>;
export type ApplyVoucher = z.infer<typeof applyVoucherSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Voucher query filters
 */
export const voucherFiltersSchema = z
  .object({
    campaignName: z.string().optional(),
    voucherType: voucherTypeSchema.optional(),
    isActive: z.boolean().optional(),
    channel: orderChannelSchema.optional(),
    isExpired: z.boolean().optional(), // validUntil < now
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Voucher query schema
 */
export const voucherQuerySchema = baseQuerySchema.merge(voucherFiltersSchema);

/**
 * Voucher redemption filters
 */
export const redemptionFiltersSchema = z
  .object({
    voucherId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    orderId: uuidSchema.optional(),
  })
  .merge(dateRangeFilterSchema);

export type VoucherFilters = z.infer<typeof voucherFiltersSchema>;
export type VoucherQuery = z.infer<typeof voucherQuerySchema>;
export type RedemptionFilters = z.infer<typeof redemptionFiltersSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Voucher detail schema
 *
 * @see FEATURES.md CUS-003 - Voucher structure
 */
export const voucherDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(),
  campaignName: z.string(),
  voucherType: z.string(), // percentage_off, fixed_amount, gift_card
  discountValue: z.string(), // Numeric from DB
  minSpend: z.string(), // Numeric from DB
  maxDiscount: z.string().nullable(),

  // Usage limits
  maxUses: z.number().int().nullable(),
  currentUses: z.number().int(),
  maxUsesPerCustomer: z.number().int(),

  // Validity
  validFrom: z.date(),
  validUntil: z.date(),
  channel: z.string(), // pos, online, wholesale, all
  isActive: z.boolean(),

  // Calculated fields
  isExpired: z.boolean(),
  isFullyUsed: z.boolean(),
  remainingUses: z.number().int().nullable(),

  // Performance metrics
  totalRedemptions: z.number().int(),
  uniqueCustomers: z.number().int(),
  totalDiscountGiven: z.string(), // Money amount
  totalRevenue: z.string(), // Revenue from orders using this voucher

  // Content
  description: z.string().nullable(),
  termsAndConditions: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Voucher list item schema
 */
export const voucherListItemSchema = voucherDetailSchema.omit({
  termsAndConditions: true,
  metadata: true,
});

/**
 * Voucher redemption record
 */
export const voucherRedemptionSchema = z.object({
  id: uuidSchema,
  voucherId: uuidSchema,
  voucherCode: z.string(),
  orderId: uuidSchema,
  customerId: uuidSchema.nullable(),
  discountApplied: z.string(), // Money amount
  orderSubtotal: z.string(),
  redeemedAt: z.date(),

  // Order info
  order: z.object({
    id: uuidSchema,
    docNo: z.string(),
    totalAmount: z.string(),
    channel: z.string(),
  }).nullable(),
});

/**
 * Voucher validation response
 *
 * Returns whether voucher is valid and discount amount.
 */
export const voucherValidationResponseSchema = successResponseSchema(
  z.object({
    valid: z.boolean(),
    voucherId: uuidSchema.nullable(),
    voucherCode: z.string(),
    voucherType: z.string().nullable(),
    discountAmount: z.number().nullable(), // Calculated discount
    message: z.string(), // Success or error message
    voucher: voucherDetailSchema.nullable(),
  })
);

/**
 * Voucher redemption response
 */
export const voucherRedemptionResponseSchema = successResponseSchema(
  z.object({
    redemptionId: uuidSchema,
    voucherId: uuidSchema,
    voucherCode: z.string(),
    discountApplied: z.number(),
    orderSubtotal: z.number(),
    finalAmount: z.number(), // After discount
  })
);

/**
 * Voucher performance report
 *
 * @see FEATURES.md CUS-003 - "Revenue impact analysis"
 * @see FEATURES.md CUS-003 - "ROI calculation"
 */
export const voucherPerformanceResponseSchema = successResponseSchema(
  z.object({
    voucherId: uuidSchema,
    voucherCode: z.string(),
    campaignName: z.string(),
    period: z.object({
      validFrom: z.date(),
      validUntil: z.date(),
    }),
    redemptions: z.object({
      total: z.number().int(),
      uniqueCustomers: z.number().int(),
      averageOrderValue: z.string(),
    }),
    financials: z.object({
      totalRevenue: z.string(), // Total from orders using voucher
      totalDiscountGiven: z.string(),
      averageDiscount: z.string(),
      netRevenue: z.string(), // revenue - discount
    }),
    roi: z.object({
      campaignCost: z.string().nullable(), // If tracked
      revenueGenerated: z.string(),
      roi: z.number().nullable(), // (revenue - cost) / cost × 100
    }),
    topProducts: z.array(z.object({
      productId: uuidSchema,
      productName: z.string(),
      quantity: z.number().int(),
      revenue: z.string(),
    })),
  })
);

/**
 * Bulk voucher creation response
 */
export const voucherBulkCreateResponseSchema = successResponseSchema(
  z.object({
    campaignName: z.string(),
    totalCreated: z.number().int(),
    codePrefix: z.string(),
    sampleCodes: z.array(z.string()), // First 10 generated codes
    downloadUrl: z.string().url().nullable(), // CSV export of all codes
  })
);

/**
 * Voucher detail response
 */
export const voucherResponseSchema = successResponseSchema(voucherDetailSchema);

/**
 * Vouchers paginated response
 */
export const vouchersResponseSchema = paginatedResponseSchema(voucherListItemSchema);

/**
 * Voucher redemptions paginated response
 */
export const voucherRedemptionsResponseSchema = paginatedResponseSchema(
  voucherRedemptionSchema
);

export type VoucherDetail = z.infer<typeof voucherDetailSchema>;
export type VoucherListItem = z.infer<typeof voucherListItemSchema>;
export type VoucherRedemption = z.infer<typeof voucherRedemptionSchema>;
export type VoucherValidationResponse = z.infer<typeof voucherValidationResponseSchema>;
export type VoucherRedemptionResponse = z.infer<typeof voucherRedemptionResponseSchema>;
export type VoucherPerformanceResponse = z.infer<typeof voucherPerformanceResponseSchema>;
export type VoucherBulkCreateResponse = z.infer<typeof voucherBulkCreateResponseSchema>;
export type VoucherResponse = z.infer<typeof voucherResponseSchema>;
export type VouchersResponse = z.infer<typeof vouchersResponseSchema>;
export type VoucherRedemptionsResponse = z.infer<typeof voucherRedemptionsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate unique voucher code
 *
 * @param prefix - Code prefix (e.g., "SAVE20")
 * @param length - Random suffix length (default 5)
 * @returns Unique voucher code
 */
export function generateVoucherCode(
  prefix: string = '',
  length: number = 5
): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${suffix}` : suffix;
}

/**
 * Calculate discount amount
 *
 * Business Rules (from FEATURES.md CUS-003):
 * - percentage_off: subtotal × (discount_value / 100)
 * - fixed_amount: discount_value
 * - Max discount = subtotal (cannot exceed order total)
 *
 * @see FEATURES.md CUS-003 - "Discount calculation"
 *
 * @param voucherType - Type of voucher
 * @param discountValue - Discount value (percentage or amount)
 * @param orderSubtotal - Order subtotal
 * @param maxDiscount - Maximum discount cap
 * @returns Discount amount
 */
export function calculateVoucherDiscount(
  voucherType: string,
  discountValue: number,
  orderSubtotal: number,
  maxDiscount?: number
): number {
  let discount = 0;

  if (voucherType === 'percentage_off') {
    discount = orderSubtotal * (discountValue / 100);
    if (maxDiscount) {
      discount = Math.min(discount, maxDiscount);
    }
  } else if (voucherType === 'fixed_amount' || voucherType === 'gift_card') {
    discount = discountValue;
  }

  // Cannot exceed order subtotal
  return Math.min(discount, orderSubtotal);
}

/**
 * Validate voucher eligibility
 *
 * Business Rules (from FEATURES.md CUS-003):
 * Comprehensive validation checks for voucher usage.
 *
 * @param voucher - Voucher details
 * @param orderSubtotal - Order subtotal
 * @param channel - Order channel
 * @param customerUsageCount - How many times customer has used this voucher
 * @param currentDate - Current date (defaults to now)
 * @returns Validation result
 */
export function validateVoucherEligibility(
  voucher: {
    isActive: boolean;
    validFrom: Date;
    validUntil: Date;
    minSpend: number;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerCustomer: number;
    channel: string;
  },
  orderSubtotal: number,
  channel: string,
  customerUsageCount: number,
  currentDate: Date = new Date()
): { valid: boolean; error?: string } {
  // Check if active
  if (!voucher.isActive) {
    return { valid: false, error: 'Voucher is not active' };
  }

  // Check date range
  if (currentDate < voucher.validFrom) {
    return { valid: false, error: 'Voucher is not yet valid' };
  }
  if (currentDate > voucher.validUntil) {
    return { valid: false, error: 'Voucher has expired' };
  }

  // Check minimum spend
  if (orderSubtotal < voucher.minSpend) {
    return {
      valid: false,
      error: `Minimum spend of $${voucher.minSpend.toFixed(2)} required`,
    };
  }

  // Check total usage limit
  if (voucher.maxUses !== null && voucher.currentUses >= voucher.maxUses) {
    return { valid: false, error: 'Voucher usage limit reached' };
  }

  // Check per-customer usage limit
  if (customerUsageCount >= voucher.maxUsesPerCustomer) {
    return {
      valid: false,
      error: `You have already used this voucher ${voucher.maxUsesPerCustomer} time(s)`,
    };
  }

  // Check channel restrictions
  if (voucher.channel !== 'all' && voucher.channel !== channel) {
    return {
      valid: false,
      error: `Voucher only valid for ${voucher.channel} orders`,
    };
  }

  return { valid: true };
}

/**
 * Check if voucher is expired
 *
 * @param validUntil - Voucher expiry date
 * @param currentDate - Current date (defaults to now)
 * @returns True if expired
 */
export function isVoucherExpired(
  validUntil: Date,
  currentDate: Date = new Date()
): boolean {
  return currentDate > validUntil;
}

/**
 * Check if voucher is fully used
 *
 * @param maxUses - Maximum total uses allowed
 * @param currentUses - Current number of uses
 * @returns True if fully used
 */
export function isVoucherFullyUsed(
  maxUses: number | null,
  currentUses: number
): boolean {
  if (maxUses === null) return false; // Unlimited uses
  return currentUses >= maxUses;
}

/**
 * Calculate voucher ROI
 *
 * Business Rule (from FEATURES.md CUS-003):
 * ROI = (revenue - cost) / cost × 100
 *
 * @param totalRevenue - Revenue from orders using voucher
 * @param totalDiscount - Total discount given
 * @param campaignCost - Cost of campaign (optional)
 * @returns ROI percentage
 */
export function calculateVoucherROI(
  totalRevenue: number,
  totalDiscount: number,
  campaignCost: number = 0
): number | null {
  const totalCost = totalDiscount + campaignCost;
  if (totalCost === 0) return null;

  const netRevenue = totalRevenue - totalCost;
  return (netRevenue / totalCost) * 100;
}

/**
 * Format voucher display text
 *
 * Helper for UI display.
 *
 * @param voucherType - Type of voucher
 * @param discountValue - Discount value
 * @returns Formatted display text
 */
export function formatVoucherDisplay(
  voucherType: string,
  discountValue: number
): string {
  if (voucherType === 'percentage_off') {
    return `${discountValue}% OFF`;
  }
  if (voucherType === 'fixed_amount') {
    return `$${discountValue.toFixed(2)} OFF`;
  }
  if (voucherType === 'gift_card') {
    return `$${discountValue.toFixed(2)} Gift Card`;
  }
  return `$${discountValue.toFixed(2)} OFF`;
}

/**
 * Generate voucher description
 *
 * Helper to create human-readable description.
 *
 * @param voucher - Voucher details
 * @returns Description text
 */
export function generateVoucherDescription(voucher: {
  voucherType: string;
  discountValue: number;
  minSpend: number;
  maxUsesPerCustomer: number;
}): string {
  const discountText = formatVoucherDisplay(voucher.voucherType, voucher.discountValue);
  const minSpendText = voucher.minSpend > 0 ? ` on orders over $${voucher.minSpend.toFixed(2)}` : '';
  const usesText = voucher.maxUsesPerCustomer === 1 ? '' : ` (max ${voucher.maxUsesPerCustomer} uses per customer)`;

  return `${discountText}${minSpendText}${usesText}`;
}
