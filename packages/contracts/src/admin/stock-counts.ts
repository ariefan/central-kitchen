/**
 * Stock Count (Physical Inventory) contracts for admin module
 *
 * Manages physical stock counts to verify inventory accuracy.
 * Supports mobile counting interface with barcode scanning.
 *
 * CRITICAL: Stock counts impact:
 * - Inventory accuracy verification
 * - Automatic adjustment generation
 * - Variance tracking and analysis
 * - Financial reporting accuracy
 *
 * Covers:
 * 1. Stock count creation and management (INV-004)
 * 2. Mobile counting interface (INV-005)
 * 3. Lot-level counting
 * 4. Variance calculation and posting
 *
 * @module @contracts/erp/admin/stock-counts
 * @see FEATURES.md Section 3.4-3.5 - Physical Stock Counts (INV-004, INV-005)
 * @see USER_STORIES.md Epic 3 - Inventory Management
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
  documentNumberSchema,
  quantitySchema,
  dateInputSchema,
  dateTimeInputSchema,
  barcodeSchema,
} from '../primitives.js';
import { countStatusSchema } from '../enums.js';

// ============================================================================
// STOCK COUNT CREATION SCHEMAS
// ============================================================================

/**
 * Stock count creation
 *
 * Business Rules (from FEATURES.md INV-004):
 * - Auto-numbering: CNT-YYYYMM-00001
 * - System pre-fill with current on-hand quantities
 * - Status flow: draft → in_progress → completed → posted
 * - Manager must review and approve before posting
 * - Posting creates stock adjustment with variances
 *
 * @see FEATURES.md INV-004 - "Stock count creation by location"
 * @see FEATURES.md INV-004 - "Auto-numbering (CNT-YYYYMM-00001)"
 * @see FEATURES.md INV-004 - "System pre-fill with current on-hand quantities"
 *
 * @example
 * ```typescript
 * {
 *   locationId: "loc-123",
 *   countDate: "2025-01-15",
 *   description: "Monthly physical count - January 2025"
 * }
 * ```
 */
export const stockCountCreateSchema = z.object({
  docNo: documentNumberSchema.optional(), // Auto-generated if not provided
  locationId: uuidSchema,
  countDate: dateInputSchema,
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  prefillSystemQuantities: z.boolean().default(true), // Pre-fill with current on-hand
});

/**
 * Update stock count
 *
 * Business Rules:
 * - Can only update draft or in_progress counts
 * - Cannot change location after creation
 */
export const stockCountUpdateSchema = z.object({
  countDate: dateInputSchema.optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Start counting (draft → in_progress)
 */
export const stockCountStartSchema = z.object({
  countId: uuidSchema,
  startedAt: dateTimeInputSchema.optional(),
});

/**
 * Complete counting (in_progress → completed)
 */
export const stockCountCompleteSchema = z.object({
  countId: uuidSchema,
  completedAt: dateTimeInputSchema.optional(),
});

/**
 * Post count (completed → posted)
 *
 * Business Rule: Creates stock adjustment with variances
 */
export const stockCountPostSchema = z.object({
  countId: uuidSchema,
  reviewedBy: uuidSchema, // Manager who reviewed
  postedAt: dateTimeInputSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type StockCountCreate = z.infer<typeof stockCountCreateSchema>;
export type StockCountUpdate = z.infer<typeof stockCountUpdateSchema>;
export type StockCountStart = z.infer<typeof stockCountStartSchema>;
export type StockCountComplete = z.infer<typeof stockCountCompleteSchema>;
export type StockCountPost = z.infer<typeof stockCountPostSchema>;

// ============================================================================
// STOCK COUNT LINE SCHEMAS
// ============================================================================

/**
 * Update counted quantity (mobile interface)
 *
 * Business Rules (from FEATURES.md INV-004, INV-005):
 * - Lot-level counting
 * - Barcode scanning support
 * - Variance = counted_qty - system_qty
 * - Alert if |variance| > threshold (e.g., 5%)
 *
 * @see FEATURES.md INV-004 - "Lot-level counting"
 * @see FEATURES.md INV-004 - "Variance calculation (counted vs system)"
 * @see FEATURES.md INV-005 - "Barcode scanner integration"
 *
 * @example
 * ```typescript
 * {
 *   countId: "count-123",
 *   productId: "prod-456",
 *   lotId: "lot-789",
 *   countedQty: 95.5,
 *   countedBy: "user-123",
 *   notes: "Damaged items found"
 * }
 * ```
 */
export const stockCountLineUpdateSchema = z.object({
  countId: uuidSchema,
  lineId: uuidSchema.optional(), // If updating existing line
  productId: uuidSchema,
  lotId: uuidSchema.optional(), // null for non-lot-tracked products
  countedQty: quantitySchema,
  uomId: uuidSchema,
  countedBy: uuidSchema, // User who counted
  countedAt: dateTimeInputSchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Scan barcode for counting (mobile interface)
 *
 * Business Rule: Quick lookup by barcode
 */
export const stockCountBarcodeScanSchema = z.object({
  countId: uuidSchema,
  barcode: barcodeSchema,
  countedQty: z.number().nonnegative().default(1), // Default to 1 unit
  countedBy: uuidSchema,
  countedAt: dateTimeInputSchema.optional(),
});

/**
 * Bulk update counted quantities
 */
export const stockCountLinesBulkUpdateSchema = z.object({
  countId: uuidSchema,
  lines: z.array(
    z.object({
      lineId: uuidSchema.optional(),
      productId: uuidSchema,
      lotId: uuidSchema.optional(),
      countedQty: quantitySchema,
      uomId: uuidSchema,
      notes: z.string().max(500).optional(),
    })
  ).min(1).max(100), // Max 100 lines per batch
  countedBy: uuidSchema,
});

export type StockCountLineUpdate = z.infer<typeof stockCountLineUpdateSchema>;
export type StockCountBarcodeScan = z.infer<typeof stockCountBarcodeScanSchema>;
export type StockCountLinesBulkUpdate = z.infer<typeof stockCountLinesBulkUpdateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Stock count query filters
 */
export const stockCountFiltersSchema = z
  .object({
    docNo: z.string().optional(), // Search by doc number
    locationId: uuidSchema.optional(),
    status: countStatusSchema.optional(),
    createdBy: uuidSchema.optional(),
    reviewedBy: uuidSchema.optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Stock count query schema
 */
export const stockCountQuerySchema = baseQuerySchema.merge(stockCountFiltersSchema);

/**
 * Stock count line query filters
 */
export const stockCountLineFiltersSchema = z.object({
  countId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  hasVariance: z.boolean().optional(), // Only lines with variances
  varianceExceedsThreshold: z.boolean().optional(), // Variances exceeding threshold
});

/**
 * Stock count line query schema
 */
export const stockCountLineQuerySchema = baseQuerySchema.merge(stockCountLineFiltersSchema);

export type StockCountFilters = z.infer<typeof stockCountFiltersSchema>;
export type StockCountQuery = z.infer<typeof stockCountQuerySchema>;
export type StockCountLineFilters = z.infer<typeof stockCountLineFiltersSchema>;
export type StockCountLineQuery = z.infer<typeof stockCountLineQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Stock count line detail schema
 */
export const stockCountLineDetailSchema = z.object({
  id: uuidSchema,
  countId: uuidSchema,
  productId: uuidSchema,
  lotId: uuidSchema.nullable(),
  systemQty: z.string(), // Pre-filled from v_inventory_onhand
  countedQty: z.string().nullable(), // Entered by counter
  varianceQty: z.string().nullable(), // counted - system
  uomId: uuidSchema,
  notes: z.string().nullable(),
  countedBy: uuidSchema.nullable(),
  countedAt: z.date().nullable(),

  // Product relation
  product: z.object({
    id: uuidSchema,
    sku: z.string(),
    name: z.string(),
  }),

  // Lot relation (if applicable)
  lot: z.object({
    id: uuidSchema,
    lotNumber: z.string(),
    expiryDate: z.date().nullable(),
  }).nullable(),

  // UOM relation
  uom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),

  // Counter relation
  counter: z.object({
    id: uuidSchema,
    name: z.string(),
  }).nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Stock count detail schema
 *
 * @see FEATURES.md INV-004 - Stock count structure
 */
export const stockCountDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: CNT-YYYYMM-00001
  locationId: uuidSchema,
  countDate: z.date(),
  status: z.string(), // draft, in_progress, completed, posted
  description: z.string().nullable(),
  notes: z.string().nullable(),

  // Progress tracking
  totalLines: z.number().int(),
  countedLines: z.number().int(),
  varianceLines: z.number().int(), // Lines with variances

  // Users
  createdBy: uuidSchema,
  reviewedBy: uuidSchema.nullable(),

  // Timestamps
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  postedAt: z.date().nullable(),

  // Relations
  location: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),

  creator: z.object({
    id: uuidSchema,
    name: z.string(),
  }),

  reviewer: z.object({
    id: uuidSchema,
    name: z.string(),
  }).nullable(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Lines (optional)
  lines: z.array(stockCountLineDetailSchema).optional(),
});

/**
 * Stock count list item schema (without lines)
 */
export const stockCountListItemSchema = stockCountDetailSchema.omit({
  lines: true,
  notes: true,
});

/**
 * Variance report item
 */
export const varianceReportItemSchema = z.object({
  productId: uuidSchema,
  productSku: z.string(),
  productName: z.string(),
  lotId: uuidSchema.nullable(),
  lotNumber: z.string().nullable(),
  systemQty: z.string(),
  countedQty: z.string(),
  varianceQty: z.string(),
  variancePercentage: z.string(), // Percentage
  varianceValue: z.string(), // Money amount (variance × cost)
  uomCode: z.string(),
});

/**
 * Stock count response
 */
export const stockCountResponseSchema = successResponseSchema(stockCountDetailSchema);

/**
 * Stock counts paginated response
 */
export const stockCountsResponseSchema = paginatedResponseSchema(stockCountListItemSchema);

/**
 * Stock count line response
 */
export const stockCountLineResponseSchema = successResponseSchema(stockCountLineDetailSchema);

/**
 * Stock count lines response
 */
export const stockCountLinesResponseSchema = successResponseSchema(
  z.object({
    countId: uuidSchema,
    lines: z.array(stockCountLineDetailSchema),
  })
);

/**
 * Variance report response
 */
export const varianceReportResponseSchema = successResponseSchema(
  z.object({
    countId: uuidSchema,
    docNo: z.string(),
    totalVarianceValue: z.string(), // Total variance in money
    variances: z.array(varianceReportItemSchema),
  })
);

export type StockCountLineDetail = z.infer<typeof stockCountLineDetailSchema>;
export type StockCountDetail = z.infer<typeof stockCountDetailSchema>;
export type StockCountListItem = z.infer<typeof stockCountListItemSchema>;
export type VarianceReportItem = z.infer<typeof varianceReportItemSchema>;
export type StockCountResponse = z.infer<typeof stockCountResponseSchema>;
export type StockCountsResponse = z.infer<typeof stockCountsResponseSchema>;
export type StockCountLineResponse = z.infer<typeof stockCountLineResponseSchema>;
export type StockCountLinesResponse = z.infer<typeof stockCountLinesResponseSchema>;
export type VarianceReportResponse = z.infer<typeof varianceReportResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate stock count document number
 *
 * Business Rule (from FEATURES.md INV-004):
 * Auto-numbering format: CNT-YYYYMM-00001
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @param lastSequence - Last used sequence for the month
 * @returns Next document number
 */
export function generateStockCountDocNo(
  year: number,
  month: number,
  lastSequence: number
): string {
  const yearMonth = `${year}${month.toString().padStart(2, '0')}`;
  const sequence = (lastSequence + 1).toString().padStart(5, '0');
  return `CNT-${yearMonth}-${sequence}`;
}

/**
 * Calculate variance quantity
 *
 * Business Rule (from FEATURES.md INV-004):
 * Variance = counted_qty - system_qty
 *
 * @param countedQty - Counted quantity
 * @param systemQty - System on-hand quantity
 * @returns Variance quantity (positive = overage, negative = shortage)
 */
export function calculateVarianceQty(
  countedQty: number,
  systemQty: number
): number {
  return countedQty - systemQty;
}

/**
 * Calculate variance percentage
 *
 * Business Rule: (variance / system_qty) × 100
 *
 * @param varianceQty - Variance quantity
 * @param systemQty - System on-hand quantity
 * @returns Variance percentage
 */
export function calculateVariancePercentage(
  varianceQty: number,
  systemQty: number
): number {
  if (systemQty === 0) return varianceQty === 0 ? 0 : 100;
  return (varianceQty / systemQty) * 100;
}

/**
 * Check if variance exceeds threshold
 *
 * Business Rule (from FEATURES.md INV-004):
 * Alert if |variance| > threshold (e.g., 5%)
 *
 * @param variancePercentage - Variance percentage
 * @param threshold - Threshold percentage (default 5%)
 * @returns True if exceeds threshold
 */
export function varianceExceedsThreshold(
  variancePercentage: number,
  threshold: number = 5
): boolean {
  return Math.abs(variancePercentage) > threshold;
}

/**
 * Calculate variance value
 *
 * Business Rule: Variance value = variance_qty × standard_cost
 *
 * @param varianceQty - Variance quantity
 * @param standardCost - Product standard cost
 * @returns Variance value in money
 */
export function calculateVarianceValue(
  varianceQty: number,
  standardCost: number
): number {
  return varianceQty * standardCost;
}

/**
 * Validate status transition
 *
 * Business Rule (from FEATURES.md INV-004):
 * Status flow: draft → in_progress → completed → posted
 *
 * @param currentStatus - Current status
 * @param newStatus - New status
 * @returns Validation result
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    draft: ['in_progress'],
    in_progress: ['completed'],
    completed: ['posted'],
    posted: [], // Terminal state
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate count progress
 *
 * Helper for progress tracking.
 *
 * @param countedLines - Number of counted lines
 * @param totalLines - Total number of lines
 * @returns Progress percentage (0-100)
 */
export function calculateCountProgress(
  countedLines: number,
  totalLines: number
): number {
  if (totalLines === 0) return 0;
  return Math.round((countedLines / totalLines) * 100);
}

/**
 * Check if count can be posted
 *
 * Business Rule (from FEATURES.md INV-004):
 * - All lines must be counted
 * - Status must be completed
 * - Manager review required
 *
 * @param status - Count status
 * @param countedLines - Number of counted lines
 * @param totalLines - Total number of lines
 * @param reviewedBy - Reviewer user ID
 * @returns Validation result
 */
export function canPostStockCount(
  status: string,
  countedLines: number,
  totalLines: number,
  reviewedBy: string | null
): { valid: boolean; error?: string } {
  if (status !== 'completed') {
    return {
      valid: false,
      error: 'Count must be completed before posting',
    };
  }

  if (countedLines < totalLines) {
    return {
      valid: false,
      error: 'All lines must be counted before posting',
    };
  }

  if (!reviewedBy) {
    return {
      valid: false,
      error: 'Manager review required before posting',
    };
  }

  return { valid: true };
}

/**
 * Get variance alert level
 *
 * Helper for UI indication.
 *
 * @param variancePercentage - Variance percentage
 * @returns Alert level
 */
export function getVarianceAlertLevel(
  variancePercentage: number
): 'ok' | 'warning' | 'critical' {
  const absVariance = Math.abs(variancePercentage);
  if (absVariance <= 2) return 'ok';
  if (absVariance <= 5) return 'warning';
  return 'critical';
}

/**
 * Format variance display
 *
 * Helper for UI display.
 *
 * @param varianceQty - Variance quantity
 * @param uomCode - UOM code
 * @returns Formatted variance string
 */
export function formatVarianceDisplay(
  varianceQty: number,
  uomCode: string
): string {
  const sign = varianceQty >= 0 ? '+' : '';
  return `${sign}${varianceQty.toFixed(2)} ${uomCode}`;
}

/**
 * Filter significant variances
 *
 * Helper for variance report.
 *
 * @param lines - Count lines
 * @param threshold - Variance threshold percentage
 * @returns Lines with significant variances
 */
export function filterSignificantVariances<
  T extends { varianceQty: number; systemQty: number }
>(lines: T[], threshold: number = 5): T[] {
  return lines.filter((line) => {
    const percentage = calculateVariancePercentage(
      line.varianceQty,
      line.systemQty
    );
    return varianceExceedsThreshold(percentage, threshold);
  });
}
