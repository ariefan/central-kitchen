/**
 * Alert Management contracts for quality module
 *
 * Manages alerts for temperature, expiry, and low stock conditions.
 * Provides centralized alert handling with acknowledgment and resolution workflows.
 *
 * CRITICAL: Alert system triggers:
 * - Email notifications based on priority
 * - SMS for critical alerts
 * - Daily digest emails
 * - Auto-resolution for some alert types
 * - Escalation for unacknowledged alerts
 *
 * Covers:
 * 1. Temperature out-of-range alerts (QC-001)
 * 2. Product expiry alerts (QC-002)
 * 3. Low stock alerts (QC-003)
 * 4. Alert acknowledgment and resolution
 * 5. Alert notification management
 *
 * @module @contracts/erp/quality/alerts
 * @see FEATURES.md QC-001 - Temperature Monitoring
 * @see FEATURES.md QC-002 - Expiry Management
 * @see FEATURES.md QC-003 - Low Stock Alerts
 * @see USER_STORIES.md Epic 8 - Quality Control
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
  userRelationSchema,
  lotRelationSchema,
} from '../common.js';
import {
  uuidSchema,
  dateTimeInputSchema,
  dateInputSchema,
} from '../primitives.js';
import {
  alertTypeSchema,
  alertPrioritySchema,
  alertStatusSchema,
} from '../enums.js';

// ============================================================================
// EXPIRY ALERT SCHEMAS (QC-002)
// ============================================================================

/**
 * Expiry alert thresholds
 *
 * Business Rules (from FEATURES.md QC-002):
 * - High priority: <3 days to expiry
 * - Medium priority: 3-7 days
 * - Low priority: 7-14 days
 *
 * @see FEATURES.md QC-002 - "Alert thresholds"
 */
export const expiryAlertThresholdsSchema = z.object({
  highPriorityDays: z.number().int().positive().default(3),
  mediumPriorityDays: z.number().int().positive().default(7),
  lowPriorityDays: z.number().int().positive().default(14),
});

/**
 * Mark lot for quick sale
 *
 * Business Rules (from FEATURES.md QC-002):
 * - Apply 50% discount (update price book)
 * - Mark lot as quick sale
 * - Notify sales team
 *
 * @see FEATURES.md QC-002 - "Quick sale: apply 50% discount"
 *
 * @example
 * ```typescript
 * {
 *   lotId: "uuid...",
 *   discountPercentage: 50,
 *   notes: "Expires in 2 days - quick sale"
 * }
 * ```
 */
export const lotQuickSaleSchema = z.object({
  lotId: uuidSchema,
  discountPercentage: z.number().min(0).max(100).default(50),
  notes: z.string().max(500).optional(),
});

/**
 * Dispose expired lot
 *
 * Business Rules (from FEATURES.md QC-002):
 * - Create stock adjustment with reason = 'expiry'
 * - Photo required for audit
 * - Disposal certificate generated
 * - Disposal method recorded
 *
 * @see FEATURES.md QC-002 - "Disposal: create stock adjustment"
 * @see FEATURES.md QC-002 - "Disposal photo required for audit"
 *
 * @example
 * ```typescript
 * {
 *   lotId: "uuid...",
 *   quantity: 50,
 *   disposalMethod: "discarded",
 *   photoUrl: "https://...",
 *   authorizedBy: "uuid...",
 *   notes: "Expired on 2025-01-15"
 * }
 * ```
 */
export const lotDisposalSchema = z.object({
  lotId: uuidSchema,
  quantity: z.number().positive(),
  disposalMethod: z.enum([
    'discarded',
    'composted',
    'donated',
    'returned_to_supplier',
    'other',
  ]),
  photoUrl: z.string().url(), // Required for audit
  authorizedBy: uuidSchema, // Manager who authorized disposal
  disposalDate: dateInputSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type ExpiryAlertThresholds = z.infer<typeof expiryAlertThresholdsSchema>;
export type LotQuickSale = z.infer<typeof lotQuickSaleSchema>;
export type LotDisposal = z.infer<typeof lotDisposalSchema>;

// ============================================================================
// LOW STOCK ALERT SCHEMAS (QC-003)
// ============================================================================

/**
 * Reorder point configuration
 *
 * Business Rules (from FEATURES.md QC-003):
 * - Reorder point: qty level that triggers alert
 * - Maximum stock: target inventory level
 * - Safety stock: buffer for demand variability
 * - Alert when current qty < reorder point
 *
 * @see FEATURES.md QC-003 - "Reorder point configuration per product/location"
 *
 * @example
 * ```typescript
 * {
 *   productId: "uuid...",
 *   locationId: "uuid...",
 *   reorderPoint: 100,
 *   maximumStock: 500,
 *   safetyStock: 50,
 *   leadTimeDays: 7
 * }
 * ```
 */
export const reorderPointConfigSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  reorderPoint: z.number().int().nonnegative(), // Alert threshold
  maximumStock: z.number().int().positive(), // Target max level
  safetyStock: z.number().int().nonnegative(), // Safety buffer
  leadTimeDays: z.number().int().positive().optional(), // Supplier lead time
  notes: z.string().max(500).optional(),
});

/**
 * Suggested order quantity calculation
 *
 * Helper schema for order quantity suggestions.
 *
 * @see FEATURES.md QC-003 - "Suggested order quantity calculation"
 */
export const suggestedOrderQuantitySchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  currentStock: z.number(),
  reorderPoint: z.number(),
  maximumStock: z.number(),
  suggestedQuantity: z.number().int().positive(), // maximumStock - currentStock
  averageDailyUsage: z.number().nullable(),
  daysOfStockRemaining: z.number().nullable(),
});

export type ReorderPointConfig = z.infer<typeof reorderPointConfigSchema>;
export type SuggestedOrderQuantity = z.infer<typeof suggestedOrderQuantitySchema>;

// ============================================================================
// ALERT MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Acknowledge alert
 *
 * Business Rules (from FEATURES.md QC-001):
 * - User acknowledges they've seen the alert
 * - Status changes to 'acknowledged'
 * - Stops escalation
 *
 * @see FEATURES.md QC-001 - "Alert acknowledgment and resolution"
 *
 * @example
 * ```typescript
 * {
 *   alertId: "uuid...",
 *   notes: "Investigating the temperature spike"
 * }
 * ```
 */
export const alertAcknowledgeSchema = z.object({
  alertId: uuidSchema,
  acknowledgedBy: uuidSchema,
  acknowledgedAt: dateTimeInputSchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Resolve alert
 *
 * Business Rules (from FEATURES.md QC-001):
 * - Alert issue has been resolved
 * - Resolution notes required
 * - Status changes to 'resolved'
 *
 * @see FEATURES.md QC-001 - "Alert acknowledgment and resolution"
 * @see FEATURES.md QC-001 - "Resolution notes"
 *
 * @example
 * ```typescript
 * {
 *   alertId: "uuid...",
 *   resolutionNotes: "Fixed thermostat - temperature back to normal",
 *   correctiveAction: "Replaced thermostat battery"
 * }
 * ```
 */
export const alertResolveSchema = z.object({
  alertId: uuidSchema,
  resolvedBy: uuidSchema,
  resolvedAt: dateTimeInputSchema.optional(),
  resolutionNotes: z.string().min(1).max(1000),
  correctiveAction: z.string().max(1000).optional(), // What was done to fix
});

export type AlertAcknowledge = z.infer<typeof alertAcknowledgeSchema>;
export type AlertResolve = z.infer<typeof alertResolveSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Alert query filters
 */
export const alertFiltersSchema = z
  .object({
    type: alertTypeSchema.optional(), // temperature, expiry, low_stock
    priority: alertPrioritySchema.optional(),
    status: alertStatusSchema.optional(),
    productId: uuidSchema.optional(),
    isUnacknowledged: z.boolean().optional(), // Active + not acknowledged
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Alert query schema
 */
export const alertQuerySchema = baseQuerySchema.merge(alertFiltersSchema);

/**
 * Expiry dashboard filters
 */
export const expiryDashboardFiltersSchema = z
  .object({
    productId: uuidSchema.optional(),
    maxDaysToExpiry: z.number().int().positive().optional(), // e.g., 14 days
  })
  .merge(locationFilterSchema);

export type AlertFilters = z.infer<typeof alertFiltersSchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;
export type ExpiryDashboardFilters = z.infer<typeof expiryDashboardFiltersSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Alert detail schema
 *
 * @see FEATURES.md QC-001 - Alert structure
 */
export const alertDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  type: z.string(), // temperature, expiry, low_stock
  priority: z.string(), // low, medium, high, critical
  status: z.string(), // active, acknowledged, resolved, auto_resolved

  // Alert content
  message: z.string(),
  referenceId: uuidSchema.nullable(), // temperature_log_id, lot_id, etc.
  referenceType: z.string().nullable(), // temperature_log, lot, inventory

  // Timestamps
  triggeredAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),

  // Users
  acknowledgedBy: uuidSchema.nullable(),
  resolvedBy: uuidSchema.nullable(),

  // Notes
  notes: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  correctiveAction: z.string().nullable(),

  // Notification
  emailSent: z.boolean(),
  smsSent: z.boolean(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  acknowledgedByUser: userRelationSchema.nullable(),
  resolvedByUser: userRelationSchema.nullable(),
});

/**
 * Alert list item schema
 */
export const alertListItemSchema = alertDetailSchema;

/**
 * Expiry alert item
 *
 * Specific alert format for expiring lots.
 */
export const expiryAlertItemSchema = z.object({
  alertId: uuidSchema,
  lotId: uuidSchema,
  productId: uuidSchema,
  productName: z.string(),
  locationId: uuidSchema,
  locationName: z.string(),
  lotNumber: z.string(),
  expiryDate: z.date(),
  daysToExpiry: z.number().int(),
  currentQuantity: z.string(),
  uomCode: z.string(),
  priority: z.string(),
  status: z.string(),
  triggeredAt: z.date(),
});

/**
 * Low stock alert item
 *
 * Specific alert format for low stock.
 */
export const lowStockAlertItemSchema = z.object({
  alertId: uuidSchema,
  productId: uuidSchema,
  productName: z.string(),
  locationId: uuidSchema,
  locationName: z.string(),
  currentStock: z.string(),
  reorderPoint: z.string(),
  suggestedOrderQty: z.number().int(),
  uomCode: z.string(),
  priority: z.string(),
  status: z.string(),
  triggeredAt: z.date(),
});

/**
 * Expiry dashboard response
 *
 * @see FEATURES.md QC-002 - "Expiry dashboard"
 */
export const expiryDashboardResponseSchema = successResponseSchema(
  z.object({
    summary: z.object({
      totalExpiringLots: z.number().int(),
      highPriorityCount: z.number().int(),
      mediumPriorityCount: z.number().int(),
      lowPriorityCount: z.number().int(),
      totalQuantityAtRisk: z.string(),
      estimatedValueAtRisk: z.string(), // Cost value
    }),
    expiringLots: z.array(expiryAlertItemSchema),
    byLocation: z.array(z.object({
      locationId: uuidSchema,
      locationName: z.string(),
      expiringCount: z.number().int(),
      totalQuantity: z.string(),
    })),
    byProduct: z.array(z.object({
      productId: uuidSchema,
      productName: z.string(),
      expiringCount: z.number().int(),
      totalQuantity: z.string(),
    })),
  })
);

/**
 * Low stock dashboard response
 *
 * @see FEATURES.md QC-003 - "Low stock dashboard"
 */
export const lowStockDashboardResponseSchema = successResponseSchema(
  z.object({
    summary: z.object({
      totalLowStockItems: z.number().int(),
      criticalStockCount: z.number().int(),
      locationCount: z.number().int(),
      totalSuggestedOrderValue: z.string(), // Estimated cost
    }),
    lowStockItems: z.array(lowStockAlertItemSchema),
    byLocation: z.array(z.object({
      locationId: uuidSchema,
      locationName: z.string(),
      lowStockCount: z.number().int(),
    })),
    byCategory: z.array(z.object({
      categoryId: uuidSchema.nullable(),
      categoryName: z.string(),
      lowStockCount: z.number().int(),
    })),
  })
);

/**
 * Disposal certificate response
 *
 * @see FEATURES.md QC-002 - "Disposal certificate generation"
 */
export const disposalCertificateResponseSchema = successResponseSchema(
  z.object({
    certificateNumber: z.string(),
    lotId: uuidSchema,
    lotNumber: z.string(),
    productId: uuidSchema,
    productName: z.string(),
    quantity: z.string(),
    uomCode: z.string(),
    expiryDate: z.date(),
    disposalDate: z.date(),
    disposalMethod: z.string(),
    authorizedBy: uuidSchema,
    authorizedByName: z.string(),
    locationId: uuidSchema,
    locationName: z.string(),
    photoUrl: z.string(),
    notes: z.string().nullable(),
    generatedAt: z.date(),
  })
);

/**
 * Alert detail response
 */
export const alertResponseSchema = successResponseSchema(alertDetailSchema);

/**
 * Alerts paginated response
 */
export const alertsResponseSchema = paginatedResponseSchema(alertListItemSchema);

/**
 * Expiry alerts paginated response
 */
export const expiryAlertsResponseSchema = paginatedResponseSchema(
  expiryAlertItemSchema
);

/**
 * Low stock alerts paginated response
 */
export const lowStockAlertsResponseSchema = paginatedResponseSchema(
  lowStockAlertItemSchema
);

export type AlertDetail = z.infer<typeof alertDetailSchema>;
export type AlertListItem = z.infer<typeof alertListItemSchema>;
export type ExpiryAlertItem = z.infer<typeof expiryAlertItemSchema>;
export type LowStockAlertItem = z.infer<typeof lowStockAlertItemSchema>;
export type ExpiryDashboardResponse = z.infer<typeof expiryDashboardResponseSchema>;
export type LowStockDashboardResponse = z.infer<typeof lowStockDashboardResponseSchema>;
export type DisposalCertificateResponse = z.infer<typeof disposalCertificateResponseSchema>;
export type AlertResponse = z.infer<typeof alertResponseSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type ExpiryAlertsResponse = z.infer<typeof expiryAlertsResponseSchema>;
export type LowStockAlertsResponse = z.infer<typeof lowStockAlertsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Calculate days to expiry from expiry date
 *
 * @param expiryDate - Product expiry date
 * @param currentDate - Current date (defaults to now)
 * @returns Days until expiry (negative if expired)
 */
export function calculateDaysToExpiryFromDate(
  expiryDate: Date,
  currentDate: Date = new Date()
): number {
  const timeDiff = expiryDate.getTime() - currentDate.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Determine expiry alert priority
 *
 * Business Rule (from FEATURES.md QC-002):
 * - High priority: <3 days to expiry
 * - Medium priority: 3-7 days
 * - Low priority: 7-14 days
 *
 * @param daysToExpiry - Days until expiry
 * @param thresholds - Optional custom thresholds
 * @returns Alert priority
 */
export function getExpiryAlertPriority(
  daysToExpiry: number,
  thresholds?: ExpiryAlertThresholds
): 'low' | 'medium' | 'high' {
  const t = thresholds || {
    highPriorityDays: 3,
    mediumPriorityDays: 7,
    lowPriorityDays: 14,
  };

  if (daysToExpiry < t.highPriorityDays) return 'high';
  if (daysToExpiry < t.mediumPriorityDays) return 'medium';
  return 'low';
}

/**
 * Check if lot should be alerted for expiry
 *
 * Business Rule: Alert if within configured threshold days
 *
 * @param daysToExpiry - Days until expiry
 * @param alertThreshold - Maximum days for alert (default 14)
 * @returns True if should alert
 */
export function shouldAlertForExpiry(
  daysToExpiry: number,
  alertThreshold: number = 14
): boolean {
  return daysToExpiry >= 0 && daysToExpiry <= alertThreshold;
}

/**
 * Calculate suggested order quantity
 *
 * Business Rule (from FEATURES.md QC-003):
 * Suggested qty = maximum_stock - current_stock
 *
 * @param currentStock - Current inventory quantity
 * @param maximumStock - Target maximum stock level
 * @param reorderPoint - Reorder point threshold
 * @returns Suggested order quantity
 */
export function calculateSuggestedOrderQuantity(
  currentStock: number,
  maximumStock: number,
  reorderPoint: number
): number {
  // Order enough to reach maximum stock
  const suggestedQty = maximumStock - currentStock;
  return Math.max(0, suggestedQty);
}

/**
 * Check if stock is below reorder point
 *
 * Business Rule (from FEATURES.md QC-003):
 * Alert when qty < reorder point
 *
 * @param currentStock - Current inventory quantity
 * @param reorderPoint - Reorder point threshold
 * @returns True if should alert
 */
export function isBelowReorderPoint(
  currentStock: number,
  reorderPoint: number
): boolean {
  return currentStock < reorderPoint;
}

/**
 * Calculate days of stock remaining
 *
 * Business Rule: Based on average daily usage
 *
 * @param currentStock - Current inventory quantity
 * @param averageDailyUsage - Average quantity used per day
 * @returns Days of stock remaining
 */
export function calculateDaysOfStockRemaining(
  currentStock: number,
  averageDailyUsage: number
): number | null {
  if (averageDailyUsage === 0) return null;
  return currentStock / averageDailyUsage;
}

/**
 * Determine low stock alert priority
 *
 * Business Rule: Based on days of stock remaining
 *
 * @param daysRemaining - Days of stock remaining
 * @returns Alert priority
 */
export function getLowStockAlertPriority(
  daysRemaining: number | null
): 'low' | 'medium' | 'high' {
  if (daysRemaining === null) return 'medium';
  if (daysRemaining < 3) return 'high'; // Critical - less than 3 days
  if (daysRemaining < 7) return 'medium';
  return 'low';
}

/**
 * Check if alert needs escalation
 *
 * Business Rule: Escalate if unacknowledged for too long
 *
 * @param triggeredAt - When alert was triggered
 * @param priority - Alert priority
 * @param acknowledgedAt - When acknowledged (null if not acknowledged)
 * @param currentTime - Current time (defaults to now)
 * @returns True if needs escalation
 */
export function needsEscalation(
  triggeredAt: Date,
  priority: string,
  acknowledgedAt: Date | null,
  currentTime: Date = new Date()
): boolean {
  if (acknowledgedAt) return false; // Already acknowledged

  const hoursUnacknowledged =
    (currentTime.getTime() - triggeredAt.getTime()) / (1000 * 60 * 60);

  // Escalation thresholds by priority
  const thresholds: Record<string, number> = {
    critical: 0.5, // 30 minutes
    high: 2, // 2 hours
    medium: 8, // 8 hours
    low: 24, // 24 hours
  };

  const threshold = thresholds[priority] || 24;
  return hoursUnacknowledged > threshold;
}

/**
 * Generate alert message for expiry
 *
 * Helper to create human-readable alert message.
 *
 * @param productName - Product name
 * @param lotNumber - Lot number
 * @param daysToExpiry - Days until expiry
 * @param quantity - Quantity at risk
 * @param uomCode - Unit of measure
 * @returns Alert message
 */
export function generateExpiryAlertMessage(
  productName: string,
  lotNumber: string,
  daysToExpiry: number,
  quantity: number,
  uomCode: string
): string {
  if (daysToExpiry <= 0) {
    return `EXPIRED: ${productName} (Lot ${lotNumber}) - ${quantity} ${uomCode} has expired`;
  }
  if (daysToExpiry === 1) {
    return `URGENT: ${productName} (Lot ${lotNumber}) - ${quantity} ${uomCode} expires tomorrow`;
  }
  return `${productName} (Lot ${lotNumber}) - ${quantity} ${uomCode} expires in ${daysToExpiry} days`;
}

/**
 * Generate alert message for low stock
 *
 * Helper to create human-readable alert message.
 *
 * @param productName - Product name
 * @param currentStock - Current stock level
 * @param reorderPoint - Reorder point
 * @param uomCode - Unit of measure
 * @returns Alert message
 */
export function generateLowStockAlertMessage(
  productName: string,
  currentStock: number,
  reorderPoint: number,
  uomCode: string
): string {
  return `Low stock: ${productName} - ${currentStock} ${uomCode} (reorder at ${reorderPoint} ${uomCode})`;
}
