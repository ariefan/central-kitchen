/**
 * Production Waste Tracking contracts
 *
 * Tracks waste and spoilage during production for analysis and improvement.
 * Waste is recorded at production order completion and also via adjustments.
 *
 * CRITICAL: Waste tracking is essential for:
 * - Cost control and reduction
 * - Recipe optimization
 * - Process improvement
 * - Compliance and auditing
 *
 * Covers:
 * 1. Record waste during production (PROD-003)
 * 2. Waste analysis and reporting
 * 3. Waste trend tracking
 * 4. Waste reduction targets
 *
 * @module @contracts/erp/production/waste
 * @see FEATURES.md PROD-003 - Production Waste Tracking
 * @see USER_STORIES.md Epic 5 - Production waste tracking
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  locationRelationSchema,
} from '../common.js';
import {
  quantityNonNegativeSchema,
  moneyAmountSchema,
  uuidSchema,
  dateInputSchema,
} from '../primitives.js';

// ============================================================================
// WASTE RECORDING SCHEMAS
// ============================================================================

/**
 * Record waste for production order
 *
 * Business Rules (from FEATURES.md PROD-003):
 * - Waste reduces actual yield: actual_qty = planned_qty - waste_qty
 * - Waste cost allocated from component consumption
 * - Alert if waste % > threshold (e.g., 10%)
 * - Photo upload for documentation recommended
 *
 * @see FEATURES.md PROD-003 - "Waste quantity recording"
 * @see FEATURES.md PROD-003 - "Waste reason (over-production, spoilage, trimming, burnt)"
 *
 * @example
 * ```typescript
 * {
 *   productionOrderId: "uuid...",
 *   wasteQty: 5.5,
 *   wasteReason: "burnt",
 *   wasteNotes: "Oven temperature too high",
 *   disposalMethod: "discarded",
 *   photoUrls: ["https://..."]
 * }
 * ```
 */
export const productionWasteRecordSchema = z.object({
  productionOrderId: uuidSchema,
  wasteQty: quantityNonNegativeSchema,
  wasteReason: z.enum([
    'over_production', // Made too much
    'spoilage',       // Went bad
    'trimming',       // Trim loss
    'burnt',          // Overcooked/burnt
    'contamination',  // Contaminated
    'breakage',       // Broken/damaged
    'other',          // Other reason
  ]),
  wasteNotes: z.string().max(1000).optional(),
  disposalMethod: z.enum([
    'discarded',      // Thrown away
    'composted',      // Composted
    'recycled',       // Recycled
    'donated',        // Donated
    'other',          // Other method
  ]).optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(), // Photo documentation
});

export type ProductionWasteRecord = z.infer<typeof productionWasteRecordSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Waste report query filters
 *
 * Supports filtering by:
 * - Date range
 * - Location
 * - Product/Recipe
 * - Waste reason
 * - Minimum waste threshold
 *
 * @see FEATURES.md PROD-003 - "Waste trend analysis"
 */
export const wasteReportFiltersSchema = z
  .object({
    productId: uuidSchema.optional(), // Finished good
    recipeId: uuidSchema.optional(),
    recipeCode: z.string().optional(),
    wasteReason: z.string().optional(),
    minWastePercentage: z.number().min(0).max(100).optional(), // Show only high waste
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete waste report query schema
 */
export const wasteReportQuerySchema = baseQuerySchema.merge(
  wasteReportFiltersSchema
);

export type WasteReportFilters = z.infer<typeof wasteReportFiltersSchema>;
export type WasteReportQuery = z.infer<typeof wasteReportQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Waste entry detail
 *
 * Represents a single waste recording from a production order.
 */
export const wasteEntrySchema = z.object({
  id: uuidSchema,
  productionOrderId: uuidSchema,
  docNo: z.string(), // Production order number
  recipeId: uuidSchema,
  recipeCode: z.string(),
  productId: uuidSchema, // Finished good
  locationId: uuidSchema,

  // Quantities
  plannedQty: z.string(),
  actualQty: z.string(),
  wasteQty: z.string(),
  wastePercentage: z.string(), // (waste / planned) × 100

  // Cost
  wasteCost: moneyAmountSchema.nullable(), // Allocated from component cost

  // Waste details
  wasteReason: z.string(),
  wasteNotes: z.string().nullable(),
  disposalMethod: z.string().nullable(),
  photoUrls: z.array(z.string()).nullable(),

  // Dates
  productionDate: z.date(),
  recordedAt: z.date(),
  recordedBy: uuidSchema,

  // Relations
  product: productRelationSchema.nullable(),
  location: locationRelationSchema.nullable(),
});

/**
 * Waste entries paginated response
 */
export const wasteEntriesResponseSchema = paginatedResponseSchema(
  wasteEntrySchema
);

export type WasteEntry = z.infer<typeof wasteEntrySchema>;
export type WasteEntriesResponse = z.infer<typeof wasteEntriesResponseSchema>;

// ============================================================================
// WASTE ANALYSIS SCHEMAS
// ============================================================================

/**
 * Waste analysis summary
 *
 * Provides aggregated waste statistics for a period.
 *
 * @see FEATURES.md PROD-003 - "Waste trend analysis"
 * @see FEATURES.md PROD-003 - "Waste percentage by recipe"
 */
export const wasteAnalysisSummarySchema = successResponseSchema(
  z.object({
    period: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    totalProductionOrders: z.number().int(),
    ordersWithWaste: z.number().int(),
    totalPlannedQty: z.string(),
    totalActualQty: z.string(),
    totalWasteQty: z.string(),
    averageWastePercentage: z.number(), // Average across all orders
    totalWasteCost: moneyAmountSchema,

    // Breakdown by reason
    byReason: z.array(z.object({
      wasteReason: z.string(),
      count: z.number().int(),
      totalWasteQty: z.string(),
      totalWasteCost: moneyAmountSchema,
      percentage: z.number(), // % of total waste
    })),

    // Breakdown by recipe
    byRecipe: z.array(z.object({
      recipeId: uuidSchema,
      recipeCode: z.string(),
      productName: z.string(),
      totalProductions: z.number().int(),
      totalPlannedQty: z.string(),
      totalWasteQty: z.string(),
      wastePercentage: z.number(),
      totalWasteCost: moneyAmountSchema,
    })),

    // Breakdown by location
    byLocation: z.array(z.object({
      locationId: uuidSchema,
      locationName: z.string(),
      totalProductions: z.number().int(),
      totalWasteQty: z.string(),
      wastePercentage: z.number(),
      totalWasteCost: moneyAmountSchema,
    })),

    // High waste items (alert)
    highWasteRecipes: z.array(z.object({
      recipeCode: z.string(),
      productName: z.string(),
      wastePercentage: z.number(),
      occurrences: z.number().int(),
      exceedsThreshold: z.boolean(),
    })),
  })
);

export type WasteAnalysisSummary = z.infer<typeof wasteAnalysisSummarySchema>;

// ============================================================================
// WASTE TREND SCHEMAS
// ============================================================================

/**
 * Waste trend over time
 *
 * Shows waste trends by day/week/month for tracking improvement.
 *
 * @see FEATURES.md PROD-003 - "Waste trend analysis"
 */
export const wasteTrendSchema = successResponseSchema(
  z.object({
    period: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    groupBy: z.enum(['day', 'week', 'month']),
    dataPoints: z.array(z.object({
      date: z.date(),
      totalProductions: z.number().int(),
      totalWasteQty: z.string(),
      wastePercentage: z.number(),
      wasteCost: moneyAmountSchema,
    })),
    trend: z.enum(['improving', 'stable', 'worsening']), // Based on linear regression
    averageWastePercentage: z.number(),
    targetWastePercentage: z.number().nullable(), // Company target if set
  })
);

export type WasteTrend = z.infer<typeof wasteTrendSchema>;

// ============================================================================
// WASTE REDUCTION TARGET SCHEMAS
// ============================================================================

/**
 * Set waste reduction target
 *
 * @see FEATURES.md PROD-003 - "Waste reduction targets"
 */
export const wasteReductionTargetSchema = z.object({
  recipeId: uuidSchema.optional(), // Specific recipe or all
  locationId: uuidSchema.optional(), // Specific location or all
  targetPercentage: z.number().min(0).max(100), // Target waste %
  targetPeriod: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  notes: z.string().max(500).optional(),
});

/**
 * Waste reduction target response
 */
export const wasteReductionTargetResponseSchema = successResponseSchema(
  z.object({
    id: uuidSchema,
    recipeId: uuidSchema.nullable(),
    locationId: uuidSchema.nullable(),
    targetPercentage: z.number(),
    currentPercentage: z.number(),
    targetPeriod: z.string(),
    isOnTrack: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
);

export type WasteReductionTarget = z.infer<typeof wasteReductionTargetSchema>;
export type WasteReductionTargetResponse = z.infer<typeof wasteReductionTargetResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Calculate waste percentage
 *
 * Business Rule (from FEATURES.md PROD-003):
 * Waste % = waste_qty / planned_qty × 100
 *
 * @param wasteQty - Waste quantity
 * @param plannedQty - Planned quantity
 * @returns Waste percentage
 */
export function calculateWastePercentage(
  wasteQty: number,
  plannedQty: number
): number {
  if (plannedQty === 0) return 0;
  return (wasteQty / plannedQty) * 100;
}

/**
 * Check if waste exceeds threshold
 *
 * Business Rule (from FEATURES.md PROD-003):
 * Alert if waste % > threshold (e.g., 10%)
 *
 * @param wastePercentage - Waste percentage
 * @param threshold - Alert threshold (default 10%)
 * @returns True if waste exceeds threshold
 */
export function exceedsWasteThreshold(
  wastePercentage: number,
  threshold: number = 10
): boolean {
  return wastePercentage > threshold;
}

/**
 * Calculate waste cost allocation
 *
 * Business Rule (from FEATURES.md PROD-003):
 * Waste cost allocated from component consumption
 *
 * @param componentCost - Total component cost
 * @param actualQty - Actual produced quantity
 * @param wasteQty - Waste quantity
 * @returns Waste cost
 */
export function calculateWasteCost(
  componentCost: number,
  actualQty: number,
  wasteQty: number
): number {
  const totalYield = actualQty + wasteQty;
  if (totalYield === 0) return 0;

  // Cost per unit (including waste)
  const costPerUnit = componentCost / totalYield;

  // Allocate to waste
  return costPerUnit * wasteQty;
}

/**
 * Determine waste trend
 *
 * Analyzes trend based on historical data points.
 *
 * @param dataPoints - Historical waste percentages
 * @returns Trend direction
 */
export function determineWasteTrend(
  dataPoints: number[]
): 'improving' | 'stable' | 'worsening' {
  if (dataPoints.length < 2) return 'stable';

  // Simple linear regression to determine trend
  const n = dataPoints.length;
  const xMean = (n - 1) / 2;
  const yMean = dataPoints.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = dataPoints[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Threshold for considering trend (e.g., 0.1% change per period)
  const threshold = 0.1;

  if (slope < -threshold) return 'improving'; // Decreasing waste
  if (slope > threshold) return 'worsening'; // Increasing waste
  return 'stable';
}

/**
 * Check if on track for waste reduction target
 *
 * @param currentPercentage - Current waste percentage
 * @param targetPercentage - Target waste percentage
 * @param tolerance - Acceptable tolerance (default 1%)
 * @returns True if on track
 */
export function isOnTrackForTarget(
  currentPercentage: number,
  targetPercentage: number,
  tolerance: number = 1
): boolean {
  return currentPercentage <= targetPercentage + tolerance;
}

/**
 * Suggest waste reduction actions
 *
 * Based on waste reason, suggest potential improvements.
 *
 * @param wasteReason - Reason for waste
 * @returns Suggested actions
 */
export function suggestWasteReductionActions(
  wasteReason: string
): string[] {
  const suggestions: Record<string, string[]> = {
    over_production: [
      'Review production planning accuracy',
      'Implement demand forecasting',
      'Adjust batch sizes',
    ],
    spoilage: [
      'Review storage conditions',
      'Check FEFO compliance',
      'Reduce production lead time',
      'Improve quality control',
    ],
    trimming: [
      'Review recipe specifications',
      'Train staff on portioning',
      'Optimize ingredient preparation',
    ],
    burnt: [
      'Review cooking temperatures',
      'Implement timers and monitoring',
      'Staff training on equipment',
    ],
    contamination: [
      'Review hygiene procedures',
      'Implement cross-contamination prevention',
      'Staff training on food safety',
    ],
    breakage: [
      'Review handling procedures',
      'Improve packaging',
      'Staff training on careful handling',
    ],
  };

  return suggestions[wasteReason] || ['Review production procedures'];
}

/**
 * Group waste entries by reason for analysis
 *
 * @param wasteEntries - Array of waste entries
 * @returns Grouped by reason with totals
 */
export function groupWasteByReason(
  wasteEntries: Array<{
    wasteReason: string;
    wasteQty: number;
    wasteCost: number;
  }>
): Record<string, {
  count: number;
  totalQty: number;
  totalCost: number;
  percentage: number;
}> {
  const totalWaste = wasteEntries.reduce((sum, entry) => sum + entry.wasteQty, 0);

  return wasteEntries.reduce((acc, entry) => {
    if (!acc[entry.wasteReason]) {
      acc[entry.wasteReason] = {
        count: 0,
        totalQty: 0,
        totalCost: 0,
        percentage: 0,
      };
    }

    acc[entry.wasteReason].count++;
    acc[entry.wasteReason].totalQty += entry.wasteQty;
    acc[entry.wasteReason].totalCost += entry.wasteCost;
    acc[entry.wasteReason].percentage = totalWaste > 0
      ? (acc[entry.wasteReason].totalQty / totalWaste) * 100
      : 0;

    return acc;
  }, {} as Record<string, { count: number; totalQty: number; totalCost: number; percentage: number }>);
}
