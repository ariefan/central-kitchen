/**
 * Loyalty Program contracts for customers module
 *
 * Manages loyalty points earning, tier progression, and redemption.
 * Points are earned on purchases and can be redeemed for vouchers.
 *
 * CRITICAL: Point earning triggers:
 * - Calculated on payment completion
 * - Excludes tax and delivery fees
 * - Applies tier multiplier
 * - Records in loyalty ledger
 *
 * CRITICAL: Tier progression:
 * - Bronze: 0-999 lifetime points
 * - Silver: 1000-2999 lifetime points (1.25x multiplier)
 * - Gold: 3000+ lifetime points (1.5x multiplier)
 *
 * Covers:
 * 1. Points earning on purchases (CUS-002)
 * 2. Tier progression and benefits
 * 3. Points redemption for vouchers
 * 4. Points ledger tracking
 * 5. Birthday bonus points
 *
 * @module @contracts/erp/customers/loyalty
 * @see FEATURES.md CUS-002 - Loyalty Program
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
  dateTimeInputSchema,
} from '../primitives.js';
import {
  loyaltyTierSchema,
  loyaltyTransactionTypeSchema,
} from '../enums.js';

// ============================================================================
// LOYALTY ACCOUNT SCHEMAS
// ============================================================================

/**
 * Loyalty tier configuration
 *
 * Business Rules (from FEATURES.md CUS-002):
 * - Bronze: 0-999 lifetime points (1x multiplier)
 * - Silver: 1000-2999 lifetime points (1.25x multiplier)
 * - Gold: 3000+ lifetime points (1.5x multiplier)
 *
 * @see FEATURES.md CUS-002 - "Tier thresholds"
 * @see FEATURES.md CUS-002 - "Tier multiplier"
 */
export const loyaltyTierConfigSchema = z.object({
  tier: loyaltyTierSchema,
  minLifetimePoints: z.number().int().nonnegative(),
  maxLifetimePoints: z.number().int().positive().nullable(), // null for unlimited (gold)
  pointsMultiplier: z.number().positive(), // 1.0, 1.25, 1.5
  benefits: z.array(z.string()).optional(), // e.g., ["Priority support", "Exclusive offers"]
});

export type LoyaltyTierConfig = z.infer<typeof loyaltyTierConfigSchema>;

// ============================================================================
// POINTS EARNING SCHEMAS
// ============================================================================

/**
 * Earn loyalty points
 *
 * Business Rules (from FEATURES.md CUS-002):
 * - Earning rate: 1 point per $1 spent (exclude tax, delivery fee)
 * - Points earned on payment completion
 * - Tier multiplier applied
 * - Points recorded in loyalty ledger
 *
 * @see FEATURES.md CUS-002 - "Earning rate: 1 point per $1 spent"
 * @see FEATURES.md CUS-002 - "Points exclusions (delivery fees, taxes)"
 * @see FEATURES.md CUS-002 - "Points earned on payment completion"
 *
 * @example
 * ```typescript
 * {
 *   customerId: "uuid...",
 *   orderId: "uuid...",
 *   orderSubtotal: 150.00,
 *   tierMultiplier: 1.25
 * }
 * // Points earned = 150 × 1.25 = 187.5 → 188 points (rounded up)
 * ```
 */
export const earnLoyaltyPointsSchema = z.object({
  customerId: uuidSchema,
  orderId: uuidSchema,
  orderSubtotal: moneyAmountSchema, // Excludes tax and delivery
  tierMultiplier: z.number().positive().default(1.0),
  description: z.string().max(500).optional(),
});

/**
 * Award birthday bonus points
 *
 * Business Rules (from FEATURES.md CUS-002):
 * - Birthday bonus: 100 points on birthday
 * - Awarded automatically on birthday
 *
 * @see FEATURES.md CUS-002 - "Birthday bonus: 100 points on birthday"
 */
export const awardBirthdayBonusSchema = z.object({
  customerId: uuidSchema,
  bonusPoints: z.number().int().positive().default(100),
  notes: z.string().max(500).optional(),
});

/**
 * Manual points adjustment (admin only)
 *
 * For corrections or special awards.
 */
export const adjustLoyaltyPointsSchema = z.object({
  customerId: uuidSchema,
  points: z.number().int(), // Positive or negative
  reason: z.string().min(1).max(500),
  adjustedBy: uuidSchema, // Admin user
});

export type EarnLoyaltyPoints = z.infer<typeof earnLoyaltyPointsSchema>;
export type AwardBirthdayBonus = z.infer<typeof awardBirthdayBonusSchema>;
export type AdjustLoyaltyPoints = z.infer<typeof adjustLoyaltyPointsSchema>;

// ============================================================================
// POINTS REDEMPTION SCHEMAS
// ============================================================================

/**
 * Redeem points for voucher
 *
 * Business Rules (from FEATURES.MD CUS-002):
 * - Redemption: 100 points = $1 voucher
 * - Points deducted from balance
 * - Voucher issued automatically
 * - Email/app delivery of voucher
 *
 * @see FEATURES.md CUS-002 - "Redemption: 100 points = $1 voucher"
 * @see FEATURES.md CUS-002 - "Voucher issuance on redemption"
 *
 * @example
 * ```typescript
 * {
 *   customerId: "uuid...",
 *   pointsToRedeem: 500
 * }
 * // Voucher value = 500 / 100 = $5
 * ```
 */
export const redeemPointsSchema = z.object({
  customerId: uuidSchema,
  pointsToRedeem: z.number().int().positive().multipleOf(100), // Must be multiple of 100
  notes: z.string().max(500).optional(),
});

export type RedeemPoints = z.infer<typeof redeemPointsSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Loyalty ledger query filters
 */
export const loyaltyLedgerFiltersSchema = z
  .object({
    customerId: uuidSchema.optional(),
    transactionType: loyaltyTransactionTypeSchema.optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Loyalty Ledger query schema
 */
export const loyaltyLedgerQuerySchema = baseQuerySchema.merge(
  loyaltyLedgerFiltersSchema
);

export type LoyaltyLedgerFilters = z.infer<typeof loyaltyLedgerFiltersSchema>;
export type LoyaltyLedgerQuery = z.infer<typeof loyaltyLedgerQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Loyalty account detail schema
 *
 * @see FEATURES.md CUS-002 - Loyalty account structure
 */
export const loyaltyAccountDetailSchema = z.object({
  id: uuidSchema,
  customerId: uuidSchema,
  pointsBalance: z.string(), // Current available points
  lifetimePoints: z.string(), // Total points ever earned
  tier: z.string(), // bronze, silver, gold
  tierMultiplier: z.number(), // 1.0, 1.25, 1.5
  tierExpiryDate: z.date().nullable(), // When tier might downgrade

  // Next tier info
  nextTier: z.string().nullable(),
  pointsToNextTier: z.number().int().nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Customer info
  customer: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    email: z.string(),
  }).nullable(),
});

/**
 * Loyalty ledger entry schema
 *
 * @see FEATURES.md CUS-002 - Loyalty ledger structure
 */
export const loyaltyLedgerEntrySchema = z.object({
  id: uuidSchema,
  loyaltyAccountId: uuidSchema,
  transactionType: z.string(), // earned, redeemed, expired, adjusted
  points: z.string(), // Positive for earned, negative for redeemed
  balanceAfter: z.string(), // Balance after this transaction
  referenceType: z.string().nullable(), // 'order', 'voucher_redemption', 'birthday'
  referenceId: uuidSchema.nullable(),
  description: z.string(),
  createdAt: z.date(),
});

/**
 * Redemption catalog item
 *
 * Shows available rewards for redemption.
 *
 * @see FEATURES.md CUS-002 - "Redemption catalog (points → vouchers)"
 */
export const redemptionCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(), // e.g., "$5 Voucher"
  description: z.string(),
  pointsCost: z.number().int().positive(),
  voucherValue: z.number().positive(),
  voucherType: z.string(), // fixed_amount
  minSpend: z.number().nonnegative().nullable(),
  validityDays: z.number().int().positive(), // How long voucher is valid
  imageUrl: z.string().url().nullable(),
  isAvailable: z.boolean(),
});

/**
 * Points redemption response
 *
 * Returned after successful redemption.
 */
export const pointsRedemptionResponseSchema = successResponseSchema(
  z.object({
    redemptionId: uuidSchema,
    customerId: uuidSchema,
    pointsRedeemed: z.number().int(),
    voucherIssued: z.object({
      voucherId: uuidSchema,
      voucherCode: z.string(),
      voucherValue: z.number(),
      validFrom: z.date(),
      validUntil: z.date(),
    }),
    newPointsBalance: z.string(),
    ledgerEntryId: uuidSchema,
  })
);

/**
 * Loyalty account response
 */
export const loyaltyAccountResponseSchema = successResponseSchema(
  loyaltyAccountDetailSchema
);

/**
 * Loyalty ledger response
 */
export const loyaltyLedgerResponseSchema = paginatedResponseSchema(
  loyaltyLedgerEntrySchema
);

/**
 * Redemption catalog response
 */
export const redemptionCatalogResponseSchema = successResponseSchema(
  z.object({
    items: z.array(redemptionCatalogItemSchema),
    customerPointsBalance: z.string(),
  })
);

export type LoyaltyAccountDetail = z.infer<typeof loyaltyAccountDetailSchema>;
export type LoyaltyLedgerEntry = z.infer<typeof loyaltyLedgerEntrySchema>;
export type RedemptionCatalogItem = z.infer<typeof redemptionCatalogItemSchema>;
export type PointsRedemptionResponse = z.infer<typeof pointsRedemptionResponseSchema>;
export type LoyaltyAccountResponse = z.infer<typeof loyaltyAccountResponseSchema>;
export type LoyaltyLedgerResponse = z.infer<typeof loyaltyLedgerResponseSchema>;
export type RedemptionCatalogResponse = z.infer<typeof redemptionCatalogResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Default loyalty tier configurations
 *
 * Business Rules (from FEATURES.md CUS-002):
 * - Bronze: 0-999 lifetime points (1x multiplier)
 * - Silver: 1000-2999 lifetime points (1.25x multiplier)
 * - Gold: 3000+ lifetime points (1.5x multiplier)
 */
export const DEFAULT_TIER_CONFIGS: Record<string, LoyaltyTierConfig> = {
  bronze: {
    tier: 'bronze',
    minLifetimePoints: 0,
    maxLifetimePoints: 999,
    pointsMultiplier: 1.0,
    benefits: ['Standard support'],
  },
  silver: {
    tier: 'silver',
    minLifetimePoints: 1000,
    maxLifetimePoints: 2999,
    pointsMultiplier: 1.25,
    benefits: ['Priority support', '25% bonus points', 'Exclusive offers'],
  },
  gold: {
    tier: 'gold',
    minLifetimePoints: 3000,
    maxLifetimePoints: null, // Unlimited
    pointsMultiplier: 1.5,
    benefits: ['VIP support', '50% bonus points', 'Early access', 'Birthday gift'],
  },
};

/**
 * Calculate points earned from order
 *
 * Business Rule (from FEATURES.md CUS-002):
 * Points = (subtotal × tier_multiplier) / earning_rate
 * Earning rate: 1 point per $1
 *
 * @param orderSubtotal - Order subtotal (excludes tax and delivery)
 * @param tierMultiplier - Customer's tier multiplier
 * @param earningRate - Points per dollar (default 1)
 * @returns Points earned (rounded up)
 */
export function calculatePointsEarned(
  orderSubtotal: number,
  tierMultiplier: number = 1.0,
  earningRate: number = 1.0
): number {
  const points = (orderSubtotal * earningRate * tierMultiplier);
  return Math.ceil(points); // Round up to nearest whole number
}

/**
 * Determine loyalty tier from lifetime points
 *
 * Business Rule (from FEATURES.md CUS-002):
 * Tier based on lifetime points accumulated
 *
 * @param lifetimePoints - Total points ever earned
 * @param tierConfigs - Optional custom tier configurations
 * @returns Current tier
 */
export function determineLoyaltyTier(
  lifetimePoints: number,
  tierConfigs: Record<string, LoyaltyTierConfig> = DEFAULT_TIER_CONFIGS
): string {
  if (tierConfigs.gold && lifetimePoints >= tierConfigs.gold.minLifetimePoints) return 'gold';
  if (tierConfigs.silver && lifetimePoints >= tierConfigs.silver.minLifetimePoints) return 'silver';
  return 'bronze';
}

/**
 * Get tier multiplier
 *
 * @param tier - Loyalty tier
 * @param tierConfigs - Optional custom tier configurations
 * @returns Points multiplier
 */
export function getTierMultiplier(
  tier: string,
  tierConfigs: Record<string, LoyaltyTierConfig> = DEFAULT_TIER_CONFIGS
): number {
  return tierConfigs[tier]?.pointsMultiplier || 1.0;
}

/**
 * Calculate points to next tier
 *
 * @param lifetimePoints - Current lifetime points
 * @param tierConfigs - Optional custom tier configurations
 * @returns Points needed for next tier (null if at highest tier)
 */
export function calculatePointsToNextTier(
  lifetimePoints: number,
  tierConfigs: Record<string, LoyaltyTierConfig> = DEFAULT_TIER_CONFIGS
): number | null {
  const currentTier = determineLoyaltyTier(lifetimePoints, tierConfigs);

  if (currentTier === 'bronze' && tierConfigs.silver) {
    return tierConfigs.silver.minLifetimePoints - lifetimePoints;
  }
  if (currentTier === 'silver' && tierConfigs.gold) {
    return tierConfigs.gold.minLifetimePoints - lifetimePoints;
  }
  // Gold tier - no next tier
  return null;
}

/**
 * Calculate voucher value from points
 *
 * Business Rule (from FEATURES.md CUS-002):
 * Redemption: 100 points = $1 voucher
 *
 * @param points - Points to redeem
 * @param redemptionRate - Points per dollar (default 100)
 * @returns Voucher value in dollars
 */
export function calculateVoucherValue(
  points: number,
  redemptionRate: number = 100
): number {
  return points / redemptionRate;
}

/**
 * Check if has enough points for redemption
 *
 * Business Rule: Cannot redeem more points than balance
 *
 * @param pointsBalance - Current points balance
 * @param pointsToRedeem - Points customer wants to redeem
 * @returns Validation result
 */
export function canRedeemPoints(
  pointsBalance: number,
  pointsToRedeem: number
): { valid: boolean; error?: string } {
  if (pointsToRedeem <= 0) {
    return { valid: false, error: 'Redemption amount must be positive' };
  }
  if (pointsToRedeem > pointsBalance) {
    return {
      valid: false,
      error: `Insufficient points. Balance: ${pointsBalance}, Required: ${pointsToRedeem}`,
    };
  }
  if (pointsToRedeem % 100 !== 0) {
    return {
      valid: false,
      error: 'Points to redeem must be a multiple of 100',
    };
  }
  return { valid: true };
}

/**
 * Check if points are expired
 *
 * Business Rule (from FEATURES.md CUS-002):
 * Points expiry: 12 months from earn date (optional)
 *
 * @param earnedDate - When points were earned
 * @param expiryMonths - Months until expiry (default 12, null for no expiry)
 * @param currentDate - Current date (defaults to now)
 * @returns True if expired
 */
export function arePointsExpired(
  earnedDate: Date,
  expiryMonths: number | null = 12,
  currentDate: Date = new Date()
): boolean {
  if (expiryMonths === null) return false; // No expiry

  const expiryDate = new Date(earnedDate);
  expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

  return currentDate > expiryDate;
}

/**
 * Format points balance for display
 *
 * Helper for UI display.
 *
 * @param points - Points balance
 * @returns Formatted string
 */
export function formatPointsBalance(points: number): string {
  return `${points.toLocaleString()} points`;
}

/**
 * Calculate tier progress percentage
 *
 * Helper to show progress bar to next tier.
 *
 * @param lifetimePoints - Current lifetime points
 * @param tierConfigs - Optional custom tier configurations
 * @returns Progress percentage (0-100)
 */
export function calculateTierProgress(
  lifetimePoints: number,
  tierConfigs: Record<string, LoyaltyTierConfig> = DEFAULT_TIER_CONFIGS
): number {
  const currentTier = determineLoyaltyTier(lifetimePoints, tierConfigs);
  const tierConfig = tierConfigs[currentTier];

  if (!tierConfig || !tierConfig.maxLifetimePoints) return 100; // Gold tier or missing config - 100%

  const tierMin = tierConfig.minLifetimePoints;
  const tierMax = tierConfig.maxLifetimePoints;
  const progress = ((lifetimePoints - tierMin) / (tierMax - tierMin)) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Suggest redemption options
 *
 * Helper to show customer what they can redeem.
 *
 * @param pointsBalance - Customer's points balance
 * @param redemptionRate - Points per dollar (default 100)
 * @returns Redemption suggestions
 */
export function suggestRedemptions(
  pointsBalance: number,
  redemptionRate: number = 100
): Array<{ points: number; voucherValue: number }> {
  const suggestions: Array<{ points: number; voucherValue: number }> = [];
  const amounts = [100, 200, 500, 1000, 2000, 5000]; // Common redemption amounts

  for (const amount of amounts) {
    if (amount <= pointsBalance) {
      suggestions.push({
        points: amount,
        voucherValue: amount / redemptionRate,
      });
    }
  }

  return suggestions;
}
