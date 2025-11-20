/**
 * Price Book Management contracts for admin module
 *
 * Manages price lists for different channels, locations, and time periods.
 * Supports complex pricing scenarios with priority-based hierarchies.
 *
 * CRITICAL: Price book configuration impacts:
 * - Product pricing in POS
 * - Online order pricing
 * - Wholesale pricing
 * - Location-specific pricing
 * - Time-based promotions
 *
 * Covers:
 * 1. Price book creation by channel (ADM-006)
 * 2. Product pricing with variant support
 * 3. Location-specific pricing
 * 4. Priority/precedence rules
 * 5. Price lookup hierarchy
 *
 * @module @contracts/erp/admin/pricebooks
 * @see FEATURES.md Section 12.6 - Price Book Management (ADM-006)
 * @see USER_STORIES.md Epic 12 - System Administration
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
  entityCodeSchema,
  dateInputSchema,
  moneyAmountSchema,
} from '../primitives.js';
import { orderChannelSchema } from '../enums.js';

// ============================================================================
// PRICE BOOK CREATION SCHEMAS
// ============================================================================

/**
 * Price book creation
 *
 * Business Rules (from FEATURES.md ADM-006):
 * - Active price book: is_active = true AND CURRENT_DATE BETWEEN valid_from AND valid_until
 * - If multiple active, highest priority wins
 * - Used in POS, online orders, and invoicing
 *
 * @see FEATURES.md ADM-006 - "Price list creation"
 * @see FEATURES.md ADM-006 - "Channel and date range specification"
 * @see FEATURES.md ADM-006 - "Priority/precedence rules"
 *
 * @example
 * ```typescript
 * {
 *   code: "PB-RETAIL-2025",
 *   name: "Retail Prices 2025",
 *   channel: "pos",
 *   validFrom: "2025-01-01",
 *   validUntil: "2025-12-31",
 *   priority: 10
 * }
 * ```
 */
export const priceBookCreateSchema = z.object({
  code: entityCodeSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(200),
  channel: orderChannelSchema, // pos, online, wholesale
  validFrom: dateInputSchema,
  validUntil: dateInputSchema.optional(), // null = no end date
  priority: z.number().int().nonnegative().default(10), // Higher = higher precedence
  isActive: z.boolean().default(true),
  description: z.string().max(1000).optional(),
});

/**
 * Update price book
 */
export const priceBookUpdateSchema = priceBookCreateSchema.partial().omit({ code: true });

export type PriceBookCreate = z.infer<typeof priceBookCreateSchema>;
export type PriceBookUpdate = z.infer<typeof priceBookUpdateSchema>;

// ============================================================================
// PRICE BOOK ITEM SCHEMAS
// ============================================================================

/**
 * Add price to price book
 *
 * Business Rules (from FEATURES.md ADM-006):
 * - Price lookup hierarchy: variant+location → variant → product+location → product → default
 * - Fallback to product.default_price if no price book match
 *
 * @see FEATURES.md ADM-006 - "Product-specific pricing"
 * @see FEATURES.md ADM-006 - "Price variation by location"
 * @see FEATURES.md ADM-006 - "Price variation by variant"
 *
 * @example
 * ```typescript
 * {
 *   priceBookId: "pb-123",
 *   productId: "prod-456",
 *   variantId: "var-789", // Optional
 *   locationId: "loc-321", // Optional (null for all locations)
 *   price: 19.99
 * }
 * ```
 */
export const priceBookItemCreateSchema = z.object({
  priceBookId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.optional(), // Specific variant (optional)
  locationId: uuidSchema.optional(), // null for all locations
  price: moneyAmountSchema,
});

/**
 * Update price book item
 */
export const priceBookItemUpdateSchema = z.object({
  price: moneyAmountSchema,
});

/**
 * Bulk add prices to price book
 */
export const priceBookItemBulkCreateSchema = z.object({
  priceBookId: uuidSchema,
  items: z.array(
    z.object({
      productId: uuidSchema,
      variantId: uuidSchema.optional(),
      locationId: uuidSchema.optional(),
      price: moneyAmountSchema,
    })
  ).min(1).max(500), // Max 500 items per batch
});

/**
 * Price lookup request
 *
 * Business Rule: Lookup price using hierarchy
 */
export const priceLookupSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  channel: orderChannelSchema,
  lookupDate: dateInputSchema.optional(), // Defaults to today
});

export type PriceBookItemCreate = z.infer<typeof priceBookItemCreateSchema>;
export type PriceBookItemUpdate = z.infer<typeof priceBookItemUpdateSchema>;
export type PriceBookItemBulkCreate = z.infer<typeof priceBookItemBulkCreateSchema>;
export type PriceLookup = z.infer<typeof priceLookupSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Price book query filters
 */
export const priceBookFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    code: z.string().optional(), // Search by code
    channel: orderChannelSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Price book query schema
 */
export const priceBookQuerySchema = baseQuerySchema.merge(priceBookFiltersSchema);

/**
 * Price book item query filters
 */
export const priceBookItemFiltersSchema = z.object({
  priceBookId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  variantId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
});

/**
 * Price book item query schema
 */
export const priceBookItemQuerySchema = baseQuerySchema.merge(priceBookItemFiltersSchema);

export type PriceBookFilters = z.infer<typeof priceBookFiltersSchema>;
export type PriceBookQuery = z.infer<typeof priceBookQuerySchema>;
export type PriceBookItemFilters = z.infer<typeof priceBookItemFiltersSchema>;
export type PriceBookItemQuery = z.infer<typeof priceBookItemQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Price book item detail schema
 */
export const priceBookItemDetailSchema = z.object({
  id: uuidSchema,
  priceBookId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  locationId: uuidSchema.nullable(),
  price: z.string(), // Money amount

  // Product relation
  product: z.object({
    id: uuidSchema,
    sku: z.string(),
    name: z.string(),
    defaultPrice: z.string().nullable(),
  }),

  // Variant relation (if applicable)
  variant: z.object({
    id: uuidSchema,
    variantName: z.string(),
  }).nullable(),

  // Location relation (if applicable)
  location: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }).nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Price book detail schema
 *
 * @see FEATURES.md ADM-006 - Price book structure
 */
export const priceBookDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique price book code
  name: z.string(),
  channel: z.string(), // pos, online, wholesale
  validFrom: z.date(),
  validUntil: z.date().nullable(),
  priority: z.number(),
  isActive: z.boolean(),
  description: z.string().nullable(),

  // Statistics
  totalItems: z.number().int(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations (optional)
  items: z.array(priceBookItemDetailSchema).optional(),
});

/**
 * Price book list item schema (without items)
 */
export const priceBookListItemSchema = priceBookDetailSchema.omit({
  items: true,
  description: true,
});

/**
 * Price lookup result
 */
export const priceLookupResultSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  locationId: uuidSchema.nullable(),
  channel: z.string(),
  price: z.string(), // Money amount
  source: z.enum([
    'variant_location',
    'variant',
    'product_location',
    'product',
    'default',
  ]),
  priceBookId: uuidSchema.nullable(),
  priceBookName: z.string().nullable(),
});

/**
 * Price book response
 */
export const priceBookResponseSchema = successResponseSchema(priceBookDetailSchema);

/**
 * Price books paginated response
 */
export const priceBooksResponseSchema = paginatedResponseSchema(priceBookListItemSchema);

/**
 * Price book item response
 */
export const priceBookItemResponseSchema = successResponseSchema(priceBookItemDetailSchema);

/**
 * Price book items response
 */
export const priceBookItemsResponseSchema = successResponseSchema(
  z.object({
    priceBookId: uuidSchema,
    items: z.array(priceBookItemDetailSchema),
  })
);

/**
 * Price lookup response
 */
export const priceLookupResponseSchema = successResponseSchema(priceLookupResultSchema);

export type PriceBookItemDetail = z.infer<typeof priceBookItemDetailSchema>;
export type PriceBookDetail = z.infer<typeof priceBookDetailSchema>;
export type PriceBookListItem = z.infer<typeof priceBookListItemSchema>;
export type PriceLookupResult = z.infer<typeof priceLookupResultSchema>;
export type PriceBookResponse = z.infer<typeof priceBookResponseSchema>;
export type PriceBooksResponse = z.infer<typeof priceBooksResponseSchema>;
export type PriceBookItemResponse = z.infer<typeof priceBookItemResponseSchema>;
export type PriceBookItemsResponse = z.infer<typeof priceBookItemsResponseSchema>;
export type PriceLookupResponse = z.infer<typeof priceLookupResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate price book code
 *
 * Business Rule: Auto-generated format: PB-{CHANNEL}-{YEAR}
 *
 * @param channel - Price book channel
 * @param year - Year
 * @returns Price book code
 */
export function generateNextPriceBookCode(
  channel: string,
  year: number
): string {
  const prefix = channel.toUpperCase();
  return `PB-${prefix}-${year}`;
}

/**
 * Check if price book is currently active
 *
 * Business Rule (from FEATURES.md ADM-006):
 * Active price book: is_active = true AND CURRENT_DATE BETWEEN valid_from AND valid_until
 *
 * @param isActive - Price book active flag
 * @param validFrom - Valid from date
 * @param validUntil - Valid until date (null = no end)
 * @param currentDate - Current date (defaults to now)
 * @returns True if price book is active
 */
export function isPriceBookActive(
  isActive: boolean,
  validFrom: Date,
  validUntil: Date | null,
  currentDate: Date = new Date()
): boolean {
  if (!isActive) return false;

  const now = currentDate.getTime();
  if (now < validFrom.getTime()) return false;
  if (validUntil && now > validUntil.getTime()) return false;

  return true;
}

/**
 * Select highest priority active price book
 *
 * Business Rule (from FEATURES.md ADM-006):
 * If multiple active, highest priority wins
 *
 * @param priceBooks - List of active price books
 * @returns Highest priority price book
 */
export function selectHighestPriorityPriceBook<
  T extends { priority: number }
>(priceBooks: T[]): T | null {
  if (priceBooks.length === 0) return null;

  return priceBooks.reduce((highest, current) =>
    current.priority > highest.priority ? current : highest
  );
}

/**
 * Lookup price using hierarchy
 *
 * Business Rule (from FEATURES.md ADM-006):
 * Price lookup hierarchy: variant+location → variant → product+location → product → default
 *
 * @param priceBookItems - Available price book items
 * @param productId - Product ID
 * @param variantId - Variant ID (optional)
 * @param locationId - Location ID (optional)
 * @param defaultPrice - Fallback default price
 * @returns Matched price and source
 */
export function lookupPrice(
  priceBookItems: Array<{
    productId: string;
    variantId: string | null;
    locationId: string | null;
    price: number;
  }>,
  productId: string,
  variantId: string | null,
  locationId: string | null,
  defaultPrice: number
): { price: number; source: string } {
  // 1. variant+location
  if (variantId && locationId) {
    const match = priceBookItems.find(
      (item) =>
        item.productId === productId &&
        item.variantId === variantId &&
        item.locationId === locationId
    );
    if (match) return { price: match.price, source: 'variant_location' };
  }

  // 2. variant (all locations)
  if (variantId) {
    const match = priceBookItems.find(
      (item) =>
        item.productId === productId &&
        item.variantId === variantId &&
        item.locationId === null
    );
    if (match) return { price: match.price, source: 'variant' };
  }

  // 3. product+location
  if (locationId) {
    const match = priceBookItems.find(
      (item) =>
        item.productId === productId &&
        item.variantId === null &&
        item.locationId === locationId
    );
    if (match) return { price: match.price, source: 'product_location' };
  }

  // 4. product (all variants, all locations)
  const match = priceBookItems.find(
    (item) =>
      item.productId === productId &&
      item.variantId === null &&
      item.locationId === null
  );
  if (match) return { price: match.price, source: 'product' };

  // 5. default
  return { price: defaultPrice, source: 'default' };
}

/**
 * Validate price book date range
 *
 * Business Rule: validFrom must be before validUntil
 *
 * @param validFrom - Valid from date
 * @param validUntil - Valid until date
 * @returns Validation result
 */
export function validatePriceBookDateRange(
  validFrom: Date,
  validUntil: Date | null
): { valid: boolean; error?: string } {
  if (validUntil && validFrom >= validUntil) {
    return {
      valid: false,
      error: 'Valid from date must be before valid until date',
    };
  }
  return { valid: true };
}

/**
 * Calculate price change percentage
 *
 * Helper for price comparison.
 *
 * @param oldPrice - Old price
 * @param newPrice - New price
 * @returns Percentage change
 */
export function calculatePriceChange(
  oldPrice: number,
  newPrice: number
): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Get price source display
 *
 * Helper for UI display.
 *
 * @param source - Price source
 * @returns Display name
 */
export function getPriceSourceDisplay(source: string): string {
  const displays: Record<string, string> = {
    variant_location: 'Variant Price (Location-Specific)',
    variant: 'Variant Price',
    product_location: 'Product Price (Location-Specific)',
    product: 'Product Price',
    default: 'Default Price',
  };
  return displays[source] || source;
}
