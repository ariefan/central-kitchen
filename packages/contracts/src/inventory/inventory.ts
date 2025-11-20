/**
 * Inventory Visibility contracts for inventory module
 *
 * Provides real-time inventory on-hand and lot-level visibility.
 * Data computed from immutable stock_ledger (ledger-first architecture).
 *
 * Covers:
 * 1. Real-time on-hand inventory (INV-001)
 * 2. Lot-level balances with expiry tracking (INV-001)
 * 3. FEFO picking recommendations (INV-002)
 * 4. Inventory valuation
 *
 * @module @contracts/erp/inventory/inventory
 * @see FEATURES.md INV-001 - Real-Time Inventory Visibility
 * @see FEATURES.md INV-002 - FEFO Picking for Perishables
 * @see USER_STORIES.md Epic 3 - Inventory Management
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  locationRelationSchema,
  lotRelationSchema,
} from '../common.js';
import {
  stockQuantitySchema,
  moneyAmountSchema,
  uuidSchema,
  dateInputSchema,
} from '../primitives.js';

// ============================================================================
// ON-HAND INVENTORY SCHEMAS (INV-001)
// ============================================================================

/**
 * On-hand inventory query filters
 *
 * Supports filtering by:
 * - Product
 * - Location
 * - Category
 * - Product type (raw material, finished good, etc.)
 * - Negative stock flag
 * - Zero stock flag
 *
 * @see FEATURES.md INV-001 - Inventory filtering
 */
export const inventoryOnhandFiltersSchema = z
  .object({
    productId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    productKind: z.string().optional(), // raw_material, finished_good, etc.
    showNegative: z.boolean().optional(), // Show only negative stock
    showZero: z.boolean().optional(), // Include zero stock items
    minQty: z.number().optional(), // Minimum quantity filter
    maxQty: z.number().optional(), // Maximum quantity filter
  })
  .merge(locationFilterSchema);

/**
 * Complete on-hand inventory query schema
 *
 * Combines base query (pagination, sort, search) with inventory filters.
 *
 * @see FEATURES.md INV-001 - "Filter by category, product type, location"
 */
export const inventoryOnhandQuerySchema = baseQuerySchema.merge(
  inventoryOnhandFiltersSchema
);

/**
 * On-hand inventory item response
 *
 * CRITICAL (from FEATURES.md INV-001):
 * - On-hand = SUM(stock_ledger.quantity) grouped by product, location
 * - Always current (computed on-demand from view)
 * - Cost from get_mavg_cost() function or cost_layers
 * - Alert if quantity < 0
 *
 * @see FEATURES.md INV-001 - "On-hand quantity by product and location"
 *
 * Database View: v_inventory_onhand
 */
export const inventoryOnhandItemSchema = z.object({
  tenantId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  onhandQty: stockQuantitySchema, // SUM of ledger quantities
  baseUomId: uuidSchema,

  // Calculated fields
  stockValue: moneyAmountSchema.nullable(), // quantity × cost
  movingAvgCost: moneyAmountSchema.nullable(), // From cost layers
  isNegative: z.boolean(), // Alert flag

  // Relations
  product: productRelationSchema.extend({
    categoryId: uuidSchema.nullable(),
    kind: z.string().nullable(),
    isPerishable: z.boolean(),
  }).nullable(),
  location: locationRelationSchema.nullable(),
  baseUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }).nullable(),
});

/**
 * On-hand inventory response
 */
export const inventoryOnhandResponseSchema = paginatedResponseSchema(
  inventoryOnhandItemSchema
);

/**
 * Single on-hand inventory item detail
 */
export const inventoryOnhandDetailResponseSchema = successResponseSchema(
  inventoryOnhandItemSchema
);

export type InventoryOnhandFilters = z.infer<typeof inventoryOnhandFiltersSchema>;
export type InventoryOnhandQuery = z.infer<typeof inventoryOnhandQuerySchema>;
export type InventoryOnhandItem = z.infer<typeof inventoryOnhandItemSchema>;
export type InventoryOnhandResponse = z.infer<typeof inventoryOnhandResponseSchema>;
export type InventoryOnhandDetailResponse = z.infer<typeof inventoryOnhandDetailResponseSchema>;

// ============================================================================
// LOT-LEVEL INVENTORY SCHEMAS (INV-001)
// ============================================================================

/**
 * Lot-level inventory query filters
 *
 * Supports filtering by:
 * - Product
 * - Location
 * - Expiry date range
 * - Days to expiry threshold
 * - Near expiry flag
 *
 * @see FEATURES.md INV-001 - "Lot-level detail with expiry dates"
 */
export const lotBalancesFiltersSchema = z
  .object({
    productId: uuidSchema.optional(),
    locationId: uuidSchema.optional(),
    lotId: uuidSchema.optional(),
    expiryFrom: dateInputSchema.optional(),
    expiryTo: dateInputSchema.optional(),
    daysToExpiry: z.number().int().optional(), // Show lots expiring within N days
    onlyPerishable: z.boolean().optional(), // Filter perishable products only
    excludeExpired: z.boolean().default(true), // Exclude expired lots
    excludeZero: z.boolean().default(true), // Exclude zero balance lots
  })
  .merge(locationFilterSchema);

/**
 * Complete lot balances query schema
 */
export const lotBalancesQuerySchema = baseQuerySchema.merge(
  lotBalancesFiltersSchema
);

/**
 * Lot balance item response
 *
 * CRITICAL (from FEATURES.md INV-001):
 * - Lot-level balances computed from ledger
 * - Days to expiry calculated
 * - Alert for near-expiry lots
 *
 * @see FEATURES.md INV-001 - "Lot-level detail with expiry dates"
 *
 * Database View: v_lot_balances
 */
export const lotBalanceItemSchema = z.object({
  tenantId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  lotId: uuidSchema,
  lotNumber: z.string(),
  expiryDate: z.date().nullable(),
  manufactureDate: z.date().nullable(),
  quantity: stockQuantitySchema, // Balance for this lot

  // Calculated fields
  daysToExpiry: z.number().int().nullable(), // Days until expiry
  isExpired: z.boolean(), // Past expiry date
  isNearExpiry: z.boolean(), // Within warning threshold (e.g., 7 days)

  // Relations
  product: productRelationSchema.extend({
    isPerishable: z.boolean(),
  }).nullable(),
  location: locationRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

/**
 * Lot balances response
 */
export const lotBalancesResponseSchema = paginatedResponseSchema(
  lotBalanceItemSchema
);

/**
 * Single lot balance detail
 */
export const lotBalanceDetailResponseSchema = successResponseSchema(
  lotBalanceItemSchema
);

export type LotBalancesFilters = z.infer<typeof lotBalancesFiltersSchema>;
export type LotBalancesQuery = z.infer<typeof lotBalancesQuerySchema>;
export type LotBalanceItem = z.infer<typeof lotBalanceItemSchema>;
export type LotBalancesResponse = z.infer<typeof lotBalancesResponseSchema>;
export type LotBalanceDetailResponse = z.infer<typeof lotBalanceDetailResponseSchema>;

// ============================================================================
// FEFO PICKING SCHEMAS (INV-002)
// ============================================================================

/**
 * FEFO pick list request
 *
 * CRITICAL (from FEATURES.md INV-002):
 * - FEFO = First Expiry, First Out
 * - Only applies to perishable products (product.isPerishable = true)
 * - Pick priority: earliest expiry date first
 * - Exclude expired lots
 * - Exclude zero balance lots
 *
 * @see FEATURES.md INV-002 - "Automatic lot selection based on earliest expiry"
 */
export const fefoPickRequestSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  requestedQty: z.number().positive(), // How much to pick
  excludeExpiryWithinDays: z.number().int().nonnegative().default(0), // Don't pick lots expiring within N days
});

/**
 * FEFO pick line item
 *
 * Recommends which lots to pick in FEFO order.
 *
 * @see FEATURES.md INV-002 - "FEFO pick list generation"
 *
 * Database View: v_fefo_pick
 */
export const fefoPickLineSchema = z.object({
  tenantId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  lotId: uuidSchema,
  lotNumber: z.string(),
  expiryDate: z.date(),
  quantityAvailable: stockQuantitySchema,
  quantityToPick: stockQuantitySchema, // How much to pick from this lot
  pickPriority: z.number().int(), // 1 = pick first, 2 = pick second, etc.

  // Relations
  lot: lotRelationSchema.nullable(),
});

/**
 * FEFO pick list response
 *
 * Contains ordered list of lots to pick.
 */
export const fefoPickResponseSchema = successResponseSchema(
  z.object({
    productId: uuidSchema,
    locationId: uuidSchema,
    requestedQty: z.string(),
    totalAvailable: z.string(),
    canFulfill: z.boolean(), // True if totalAvailable >= requestedQty
    pickLines: z.array(fefoPickLineSchema),
    product: productRelationSchema.nullable(),
    location: locationRelationSchema.nullable(),
  })
);

export type FefoPickRequest = z.infer<typeof fefoPickRequestSchema>;
export type FefoPickLine = z.infer<typeof fefoPickLineSchema>;
export type FefoPickResponse = z.infer<typeof fefoPickResponseSchema>;

// ============================================================================
// LOT ALLOCATION SCHEMAS (INV-002)
// ============================================================================

/**
 * Allocate lots to order/production
 *
 * CRITICAL (from FEATURES.md INV-002):
 * - Allocation to orders happens at payment time
 * - Production orders consume lots in FEFO order
 *
 * @see FEATURES.md INV-002 - "Allocation to orders/production"
 */
export const lotAllocationSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  requestedQty: z.number().positive(),
  allocationType: z.enum(['order', 'production', 'transfer']),
  referenceDocId: uuidSchema, // Order ID, Production Order ID, or Transfer ID
  useFefo: z.boolean().default(true), // Use FEFO allocation
});

/**
 * Lot allocation line
 */
export const lotAllocationLineSchema = z.object({
  lotId: uuidSchema,
  lotNumber: z.string(),
  allocatedQty: stockQuantitySchema,
  expiryDate: z.date().nullable(),
});

/**
 * Lot allocation response
 */
export const lotAllocationResponseSchema = successResponseSchema(
  z.object({
    productId: uuidSchema,
    locationId: uuidSchema,
    requestedQty: z.string(),
    totalAllocated: z.string(),
    fullyAllocated: z.boolean(),
    allocations: z.array(lotAllocationLineSchema),
  })
);

export type LotAllocation = z.infer<typeof lotAllocationSchema>;
export type LotAllocationLine = z.infer<typeof lotAllocationLineSchema>;
export type LotAllocationResponse = z.infer<typeof lotAllocationResponseSchema>;

// ============================================================================
// INVENTORY VALUATION SCHEMAS
// ============================================================================

/**
 * Inventory valuation query filters
 *
 * @see FEATURES.md INV-001 - "Stock value calculation (quantity × cost)"
 */
export const inventoryValuationFiltersSchema = z
  .object({
    productId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    asOfDate: dateInputSchema.optional(), // Historical valuation
  })
  .merge(locationFilterSchema);

/**
 * Inventory valuation query schema
 */
export const inventoryValuationQuerySchema = baseQuerySchema.merge(
  inventoryValuationFiltersSchema
);

/**
 * Inventory valuation item
 *
 * Shows value of inventory by product and location.
 */
export const inventoryValuationItemSchema = z.object({
  tenantId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  onhandQty: stockQuantitySchema,
  movingAvgCost: moneyAmountSchema,
  stockValue: moneyAmountSchema, // quantity × moving avg cost

  // Relations
  product: productRelationSchema.nullable(),
  location: locationRelationSchema.nullable(),
});

/**
 * Inventory valuation response
 */
export const inventoryValuationResponseSchema = paginatedResponseSchema(
  inventoryValuationItemSchema
);

/**
 * Inventory valuation summary
 */
export const inventoryValuationSummarySchema = successResponseSchema(
  z.object({
    totalValue: moneyAmountSchema,
    byCategory: z.array(z.object({
      categoryId: uuidSchema,
      categoryName: z.string(),
      value: moneyAmountSchema,
    })),
    byLocation: z.array(z.object({
      locationId: uuidSchema,
      locationName: z.string(),
      value: moneyAmountSchema,
    })),
  })
);

export type InventoryValuationFilters = z.infer<typeof inventoryValuationFiltersSchema>;
export type InventoryValuationQuery = z.infer<typeof inventoryValuationQuerySchema>;
export type InventoryValuationItem = z.infer<typeof inventoryValuationItemSchema>;
export type InventoryValuationResponse = z.infer<typeof inventoryValuationResponseSchema>;
export type InventoryValuationSummary = z.infer<typeof inventoryValuationSummarySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if product is perishable and requires FEFO
 *
 * @param isPerishable - Product.isPerishable flag
 * @returns True if FEFO picking required
 */
export function requiresFEFO(isPerishable: boolean): boolean {
  return isPerishable;
}

/**
 * Check if lot is near expiry
 *
 * @param expiryDate - Lot expiry date
 * @param thresholdDays - Warning threshold in days (default 7)
 * @returns True if expiring within threshold
 */
export function isNearExpiry(
  expiryDate: Date | null,
  thresholdDays: number = 7
): boolean {
  if (!expiryDate) return false;

  const now = new Date();
  const daysToExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return daysToExpiry > 0 && daysToExpiry <= thresholdDays;
}

/**
 * Check if lot is expired
 *
 * @param expiryDate - Lot expiry date
 * @returns True if past expiry date
 */
export function isExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return false;

  return expiryDate < new Date();
}

/**
 * Calculate days to expiry
 *
 * @param expiryDate - Lot expiry date
 * @returns Days until expiry (negative if expired)
 */
export function calculateDaysToExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;

  const now = new Date();
  const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysToExpiry;
}

/**
 * Generate FEFO pick list
 *
 * Business Rule: Pick lots in order of earliest expiry date first
 *
 * @param lots - Available lots with quantities
 * @param requestedQty - How much to pick
 * @returns Ordered pick list
 */
export function generateFEFOPickList(
  lots: Array<{
    lotId: string;
    lotNumber: string;
    expiryDate: Date;
    quantityAvailable: number;
  }>,
  requestedQty: number
): Array<{
  lotId: string;
  lotNumber: string;
  expiryDate: Date;
  quantityToPick: number;
  pickPriority: number;
}> {
  // Sort by expiry date (earliest first)
  const sortedLots = [...lots].sort((a, b) =>
    a.expiryDate.getTime() - b.expiryDate.getTime()
  );

  const pickList: Array<{
    lotId: string;
    lotNumber: string;
    expiryDate: Date;
    quantityToPick: number;
    pickPriority: number;
  }> = [];

  let remainingQty = requestedQty;
  let priority = 1;

  for (const lot of sortedLots) {
    if (remainingQty <= 0) break;

    const quantityToPick = Math.min(remainingQty, lot.quantityAvailable);

    pickList.push({
      lotId: lot.lotId,
      lotNumber: lot.lotNumber,
      expiryDate: lot.expiryDate,
      quantityToPick,
      pickPriority: priority++,
    });

    remainingQty -= quantityToPick;
  }

  return pickList;
}

/**
 * Check if inventory is negative (should never happen)
 *
 * @param quantity - On-hand quantity
 * @returns True if negative
 */
export function isNegativeStock(quantity: number): boolean {
  return quantity < 0;
}

/**
 * Calculate inventory turnover rate
 *
 * Turnover = Cost of Goods Sold / Average Inventory Value
 *
 * @param cogs - Cost of goods sold over period
 * @param avgInventoryValue - Average inventory value over period
 * @returns Turnover rate
 */
export function calculateTurnoverRate(
  cogs: number,
  avgInventoryValue: number
): number {
  if (avgInventoryValue === 0) return 0;
  return cogs / avgInventoryValue;
}
