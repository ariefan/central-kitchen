/**
 * Temperature Monitoring contracts for quality module
 *
 * Manages temperature and humidity logging for HACCP compliance.
 * Critical for food safety and regulatory compliance.
 *
 * CRITICAL: Out-of-range readings trigger:
 * - Automatic alert generation
 * - Email notifications (high priority)
 * - SMS notifications (critical deviations >10°C)
 * - Photo upload requirement
 * - Compliance documentation
 *
 * Covers:
 * 1. Temperature and humidity logging (QC-001)
 * 2. Automatic sensor integration
 * 3. Out-of-range alert generation
 * 4. HACCP compliance reporting
 * 5. Temperature history charts
 *
 * @module @contracts/erp/quality/temperature
 * @see FEATURES.md QC-001 - Temperature Monitoring
 * @see USER_STORIES.md Epic 8 - Quality Control
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  locationRelationSchema,
  userRelationSchema,
} from '../common.js';
import {
  uuidSchema,
  dateTimeInputSchema,
} from '../primitives.js';

// ============================================================================
// TEMPERATURE LOG SCHEMAS
// ============================================================================

/**
 * Storage area types for temperature monitoring
 *
 * Each area has specific temperature ranges for food safety.
 *
 * @see FEATURES.md QC-001 - "Location area specification"
 */
export const storageAreaSchema = z.enum([
  'walk_in_freezer',
  'walk_in_cooler',
  'reach_in_freezer',
  'reach_in_cooler',
  'display_case_cold',
  'display_case_hot',
  'hot_holding',
  'prep_area',
  'dry_storage',
  'other',
]);

/**
 * Create temperature log
 *
 * Business Rules (from FEATURES.md QC-001):
 * - Readings required every 4 hours (manual) or 30 minutes (automatic)
 * - Temperature in Celsius
 * - Humidity percentage (0-100)
 * - Photo required for out-of-range readings
 * - Alert generated automatically if outside acceptable range
 *
 * @see FEATURES.md QC-001 - "Temperature and humidity logging"
 * @see FEATURES.md QC-001 - "Manual or automatic sensor recording"
 *
 * @example
 * ```typescript
 * {
 *   locationId: "uuid...",
 *   area: "walk_in_freezer",
 *   temperature: -18.5,
 *   humidity: 45.0,
 *   isAutomatic: true,
 *   notes: "Morning reading - all normal"
 * }
 * ```
 */
export const temperatureLogCreateSchema = z.object({
  locationId: uuidSchema,
  area: storageAreaSchema,
  temperature: z.number().min(-50).max(100), // Celsius
  humidity: z.number().min(0).max(100).optional(), // Percentage
  isAutomatic: z.boolean().default(false), // Sensor vs manual
  recordedAt: dateTimeInputSchema.optional(), // Defaults to now
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(), // Required for out-of-range
});

/**
 * Temperature reading range configuration
 *
 * Defines acceptable temperature ranges for each storage area type.
 *
 * @see FEATURES.md QC-001 - "Temperature ranges by area (configurable)"
 */
export const temperatureRangeSchema = z.object({
  area: storageAreaSchema,
  minTemp: z.number(), // Minimum acceptable temperature (°C)
  maxTemp: z.number(), // Maximum acceptable temperature (°C)
  targetTemp: z.number().optional(), // Ideal temperature
  description: z.string().max(200).optional(),
});

export type StorageArea = z.infer<typeof storageAreaSchema>;
export type TemperatureLogCreate = z.infer<typeof temperatureLogCreateSchema>;
export type TemperatureRange = z.infer<typeof temperatureRangeSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Temperature log query filters
 */
export const temperatureLogFiltersSchema = z
  .object({
    area: storageAreaSchema.optional(),
    isAutomatic: z.boolean().optional(),
    isOutOfRange: z.boolean().optional(), // Filter readings outside acceptable range
    minTemperature: z.number().optional(),
    maxTemperature: z.number().optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Temperature Log query schema
 */
export const temperatureLogQuerySchema = baseQuerySchema.merge(
  temperatureLogFiltersSchema
);

export type TemperatureLogFilters = z.infer<typeof temperatureLogFiltersSchema>;
export type TemperatureLogQuery = z.infer<typeof temperatureLogQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Temperature log detail schema
 *
 * @see FEATURES.md QC-001 - Temperature log structure
 */
export const temperatureLogDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  locationId: uuidSchema,
  area: z.string(),
  temperature: z.string(), // Numeric from DB
  humidity: z.string().nullable(), // Numeric from DB
  isAutomatic: z.boolean(),
  recordedAt: z.date(),
  recordedBy: uuidSchema,

  // Range validation
  isOutOfRange: z.boolean(),
  expectedMinTemp: z.number().nullable(),
  expectedMaxTemp: z.number().nullable(),
  deviation: z.number().nullable(), // How far from acceptable range

  // Alert reference
  alertId: uuidSchema.nullable(), // If alert was generated

  // Documentation
  notes: z.string().nullable(),
  photoUrl: z.string().nullable(),

  // System fields
  createdAt: z.date(),

  // Relations
  location: locationRelationSchema.nullable(),
  recordedByUser: userRelationSchema.nullable(),
});

/**
 * Temperature log list item schema
 */
export const temperatureLogListItemSchema = temperatureLogDetailSchema;

/**
 * Temperature chart data point
 *
 * Used for temperature history charts.
 *
 * @see FEATURES.md QC-001 - "Temperature history charts"
 */
export const temperatureChartDataPointSchema = z.object({
  timestamp: z.date(),
  temperature: z.number(),
  humidity: z.number().nullable(),
  isOutOfRange: z.boolean(),
  area: z.string(),
});

/**
 * Temperature chart response
 *
 * Returns time-series data for charting.
 *
 * @see FEATURES.md QC-001 - "Temperature history charts"
 */
export const temperatureChartResponseSchema = successResponseSchema(
  z.object({
    locationId: uuidSchema,
    locationName: z.string(),
    area: z.string().optional(),
    period: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    expectedRange: z.object({
      minTemp: z.number(),
      maxTemp: z.number(),
    }).nullable(),
    dataPoints: z.array(temperatureChartDataPointSchema),
    summary: z.object({
      totalReadings: z.number().int(),
      outOfRangeCount: z.number().int(),
      averageTemp: z.number(),
      minTemp: z.number(),
      maxTemp: z.number(),
      complianceRate: z.number(), // Percentage in range
    }),
  })
);

/**
 * Temperature log detail response
 */
export const temperatureLogResponseSchema = successResponseSchema(
  temperatureLogDetailSchema
);

/**
 * Temperature logs paginated response
 */
export const temperatureLogsResponseSchema = paginatedResponseSchema(
  temperatureLogListItemSchema
);

export type TemperatureLogDetail = z.infer<typeof temperatureLogDetailSchema>;
export type TemperatureLogListItem = z.infer<typeof temperatureLogListItemSchema>;
export type TemperatureChartDataPoint = z.infer<typeof temperatureChartDataPointSchema>;
export type TemperatureChartResponse = z.infer<typeof temperatureChartResponseSchema>;
export type TemperatureLogResponse = z.infer<typeof temperatureLogResponseSchema>;
export type TemperatureLogsResponse = z.infer<typeof temperatureLogsResponseSchema>;

// ============================================================================
// COMPLIANCE REPORT SCHEMAS
// ============================================================================

/**
 * HACCP compliance report
 *
 * Generates compliance documentation for audits.
 *
 * @see FEATURES.md QC-001 - "Compliance report generation"
 * @see FEATURES.md QC-001 - "CSV export for audits"
 */
export const complianceReportSchema = successResponseSchema(
  z.object({
    reportPeriod: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    locationId: uuidSchema,
    locationName: z.string(),
    areas: z.array(z.object({
      area: z.string(),
      expectedRange: z.object({
        minTemp: z.number(),
        maxTemp: z.number(),
      }),
      totalReadings: z.number().int(),
      compliantReadings: z.number().int(),
      outOfRangeReadings: z.number().int(),
      complianceRate: z.number(), // Percentage
      averageTemp: z.number(),
      incidents: z.array(z.object({
        timestamp: z.date(),
        temperature: z.number(),
        deviation: z.number(),
        correctiveAction: z.string().nullable(),
      })),
    })),
    overallCompliance: z.number(), // Percentage across all areas
    totalIncidents: z.number().int(),
    generatedAt: z.date(),
    generatedBy: uuidSchema,
  })
);

export type ComplianceReport = z.infer<typeof complianceReportSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Default temperature ranges by storage area
 *
 * Business Rules (from FEATURES.md QC-001):
 * - Freezer: -18°C to -20°C
 * - Refrigerator: 0°C to 4°C
 * - Hot holding: >60°C
 *
 * @see FEATURES.md QC-001 - "Temperature ranges by area (configurable)"
 */
export const DEFAULT_TEMPERATURE_RANGES: Record<
  StorageArea,
  { minTemp: number; maxTemp: number; targetTemp: number }
> = {
  walk_in_freezer: { minTemp: -20, maxTemp: -18, targetTemp: -19 },
  walk_in_cooler: { minTemp: 0, maxTemp: 4, targetTemp: 2 },
  reach_in_freezer: { minTemp: -20, maxTemp: -18, targetTemp: -19 },
  reach_in_cooler: { minTemp: 0, maxTemp: 4, targetTemp: 2 },
  display_case_cold: { minTemp: 0, maxTemp: 4, targetTemp: 2 },
  display_case_hot: { minTemp: 60, maxTemp: 80, targetTemp: 65 },
  hot_holding: { minTemp: 60, maxTemp: 80, targetTemp: 65 },
  prep_area: { minTemp: 15, maxTemp: 25, targetTemp: 20 },
  dry_storage: { minTemp: 10, maxTemp: 25, targetTemp: 18 },
  other: { minTemp: -50, maxTemp: 100, targetTemp: 20 }, // Wide range for custom areas
};

/**
 * Check if temperature is out of acceptable range
 *
 * @param temperature - Recorded temperature
 * @param area - Storage area type
 * @param customRanges - Optional custom ranges (overrides defaults)
 * @returns True if out of range
 */
export function isTemperatureOutOfRange(
  temperature: number,
  area: StorageArea,
  customRanges?: Record<StorageArea, { minTemp: number; maxTemp: number }>
): boolean {
  const ranges = customRanges || DEFAULT_TEMPERATURE_RANGES;
  const range = ranges[area];
  return temperature < range.minTemp || temperature > range.maxTemp;
}

/**
 * Calculate temperature deviation from acceptable range
 *
 * Business Rule (from FEATURES.md QC-001):
 * Returns how far the temperature is outside the acceptable range.
 * Positive = too hot, Negative = too cold, 0 = within range
 *
 * @param temperature - Recorded temperature
 * @param area - Storage area type
 * @param customRanges - Optional custom ranges
 * @returns Deviation in degrees (0 if within range)
 */
export function calculateTemperatureDeviation(
  temperature: number,
  area: StorageArea,
  customRanges?: Record<StorageArea, { minTemp: number; maxTemp: number }>
): number {
  const ranges = customRanges || DEFAULT_TEMPERATURE_RANGES;
  const range = ranges[area];

  if (temperature < range.minTemp) {
    return temperature - range.minTemp; // Negative (too cold)
  }
  if (temperature > range.maxTemp) {
    return temperature - range.maxTemp; // Positive (too hot)
  }
  return 0; // Within range
}

/**
 * Determine alert priority based on deviation
 *
 * Business Rule (from FEATURES.md QC-001):
 * - High priority: >5°C deviation
 * - Medium priority: 2-5°C deviation
 * - Low priority: <2°C deviation
 *
 * @see FEATURES.md QC-001 - "Priority based on deviation"
 *
 * @param deviation - Temperature deviation
 * @returns Alert priority
 */
export function getTemperatureAlertPriority(
  deviation: number
): 'low' | 'medium' | 'high' | 'critical' {
  const absDeviation = Math.abs(deviation);

  if (absDeviation > 10) return 'critical'; // SMS notification
  if (absDeviation > 5) return 'high'; // Email notification
  if (absDeviation >= 2) return 'medium';
  return 'low';
}

/**
 * Check if photo is required for reading
 *
 * Business Rule (from FEATURES.md QC-001):
 * Photo required for out-of-range readings
 *
 * @param isOutOfRange - Whether reading is out of range
 * @returns True if photo required
 */
export function isPhotoRequired(isOutOfRange: boolean): boolean {
  return isOutOfRange;
}

/**
 * Calculate compliance rate
 *
 * Business Rule: Percentage of readings within acceptable range
 *
 * @param totalReadings - Total number of readings
 * @param outOfRangeReadings - Number of out-of-range readings
 * @returns Compliance rate percentage
 */
export function calculateComplianceRate(
  totalReadings: number,
  outOfRangeReadings: number
): number {
  if (totalReadings === 0) return 100;
  const compliantReadings = totalReadings - outOfRangeReadings;
  return (compliantReadings / totalReadings) * 100;
}

/**
 * Check if reading frequency is adequate
 *
 * Business Rule (from FEATURES.md QC-001):
 * - Manual readings: every 4 hours
 * - Automatic readings: every 30 minutes
 *
 * @param lastReadingTime - Timestamp of last reading
 * @param isAutomatic - Whether using automatic sensors
 * @param currentTime - Current time (defaults to now)
 * @returns True if overdue for reading
 */
export function isReadingOverdue(
  lastReadingTime: Date,
  isAutomatic: boolean,
  currentTime: Date = new Date()
): boolean {
  const requiredIntervalMinutes = isAutomatic ? 30 : 240; // 30 min or 4 hours
  const timeSinceLastReading =
    (currentTime.getTime() - lastReadingTime.getTime()) / (1000 * 60);
  return timeSinceLastReading > requiredIntervalMinutes;
}

/**
 * Generate compliance summary
 *
 * Helper to summarize compliance data for reporting.
 *
 * @param readings - Array of temperature readings
 * @returns Compliance summary
 */
export function generateComplianceSummary(
  readings: Array<{
    temperature: number;
    isOutOfRange: boolean;
    recordedAt: Date;
  }>
): {
  totalReadings: number;
  outOfRangeCount: number;
  complianceRate: number;
  averageTemp: number;
  minTemp: number;
  maxTemp: number;
} {
  if (readings.length === 0) {
    return {
      totalReadings: 0,
      outOfRangeCount: 0,
      complianceRate: 100,
      averageTemp: 0,
      minTemp: 0,
      maxTemp: 0,
    };
  }

  const totalReadings = readings.length;
  const outOfRangeCount = readings.filter((r) => r.isOutOfRange).length;
  const complianceRate = calculateComplianceRate(totalReadings, outOfRangeCount);

  const temperatures = readings.map((r) => r.temperature);
  const averageTemp =
    temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);

  return {
    totalReadings,
    outOfRangeCount,
    complianceRate,
    averageTemp,
    minTemp,
    maxTemp,
  };
}

/**
 * Format temperature for display
 *
 * Helper to format temperature with unit.
 *
 * @param temperature - Temperature value
 * @param unit - Temperature unit (default 'C')
 * @returns Formatted temperature string
 */
export function formatTemperature(
  temperature: number,
  unit: 'C' | 'F' = 'C'
): string {
  const temp = unit === 'F' ? (temperature * 9) / 5 + 32 : temperature;
  return `${temp.toFixed(1)}°${unit}`;
}
