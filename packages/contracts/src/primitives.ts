/**
 * Domain primitives and specialized validation schemas
 *
 * This module provides validated primitives for common business concepts
 * like money, quantities, and measurements used throughout the ERP system.
 *
 * @module @contracts/erp/primitives
 */

import { z } from 'zod';

// ============================================================================
// MONEY & CURRENCY
// ============================================================================

/**
 * Money amount stored as string to avoid floating point precision issues
 *
 * Pattern: Decimal number with up to 2 decimal places
 * Storage: Always as string in database (NUMERIC type)
 *
 * @example "1234.56", "0.99", "1000000.00"
 *
 * @see FEATURES.md - All financial calculations use this format
 */
export const moneyAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid money format (must be decimal with max 2 decimal places)')
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Money amount must be non-negative');

/**
 * Money amount for API input (accepts number or string, converts to string)
 *
 * Use this for request schemas where users might send numbers.
 * Automatically formats to 2 decimal places.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   price: moneyInputSchema, // Accepts 123.4 or "123.40"
 * });
 * ```
 */
export const moneyInputSchema = z
  .union([z.number(), z.string()])
  .transform((val) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Invalid money amount');
    }
    return num.toFixed(2); // Always return as string with 2 decimals
  });

/**
 * Currency code (ISO 4217)
 *
 * @see FEATURES.md - Multi-currency support
 */
export const currencySchema = z.enum([
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'IDR', // Indonesian Rupiah
  'SGD', // Singapore Dollar
  'MYR', // Malaysian Ringgit
  'THB', // Thai Baht
  'PHP', // Philippine Peso
  'VND', // Vietnamese Dong
]);

/**
 * Tax rate (0-100%)
 *
 * Stored as percentage, not decimal.
 * Example: 10 means 10%, not 0.10
 *
 * @see FEATURES.md PROC-001 - Tax calculation
 */
export const taxRateSchema = z
  .number()
  .min(0, 'Tax rate cannot be negative')
  .max(100, 'Tax rate cannot exceed 100%');

/**
 * Discount rate (0-100%)
 *
 * Stored as percentage, not decimal.
 * Example: 15 means 15% off, not 0.15
 */
export const discountRateSchema = z
  .number()
  .min(0, 'Discount cannot be negative')
  .max(100, 'Discount cannot exceed 100%');

/**
 * Fixed discount amount
 *
 * Must not exceed the item/order total (validated in business logic)
 */
export const discountAmountSchema = z
  .number()
  .nonnegative('Discount amount cannot be negative');

export type MoneyAmount = string; // Always stored as string
export type Currency = z.infer<typeof currencySchema>;
export type TaxRate = number; // 0-100
export type DiscountRate = number; // 0-100

// ============================================================================
// QUANTITIES & MEASUREMENTS
// ============================================================================

/**
 * Positive quantity (for orders, transfers, production, etc.)
 *
 * Used when quantity must be greater than zero.
 *
 * @see FEATURES.md - All document line items require positive quantities
 */
export const quantitySchema = z
  .number()
  .positive('Quantity must be positive')
  .finite('Quantity must be finite');

/**
 * Non-negative quantity (for adjustments, counts where 0 is allowed)
 *
 * Used for stock adjustments, waste, and variance calculations.
 */
export const quantityNonNegativeSchema = z
  .number()
  .nonnegative('Quantity cannot be negative')
  .finite('Quantity must be finite');

/**
 * Stock quantity stored as string for precision
 *
 * Database stores quantities as NUMERIC(16,6) to handle fractional units.
 * Always returned as string from database to avoid precision loss.
 *
 * @see FEATURES.md INV-001 - Inventory on-hand quantities
 *
 * @example "123.456", "-50.25" (for deltas), "1000.000"
 */
export const stockQuantitySchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Invalid quantity format');

/**
 * Quantity delta (can be positive or negative)
 *
 * Used for:
 * - Stock adjustments (increase/decrease)
 * - Variance calculations
 * - Production waste
 *
 * @see FEATURES.md INV-003 - Stock adjustments
 */
export const quantityDeltaSchema = z
  .number()
  .finite('Quantity delta must be finite');

/**
 * Weight in grams
 *
 * Base unit for all weight measurements.
 * Convert to kg, lb, oz in presentation layer.
 */
export const weightGramsSchema = z
  .number()
  .positive('Weight must be positive');

/**
 * Volume in milliliters
 *
 * Base unit for all volume measurements.
 * Convert to L, gal, oz in presentation layer.
 */
export const volumeMillilitersSchema = z
  .number()
  .positive('Volume must be positive');

/**
 * Temperature in Celsius
 *
 * @see FEATURES.md QC-001 - Temperature monitoring
 */
export const temperatureCelsiusSchema = z
  .number()
  .min(-50, 'Temperature too low')
  .max(200, 'Temperature too high');

/**
 * Humidity percentage (0-100%)
 *
 * @see FEATURES.md QC-001 - Humidity monitoring
 */
export const humidityPercentSchema = z
  .number()
  .min(0, 'Humidity cannot be negative')
  .max(100, 'Humidity cannot exceed 100%');

export type Quantity = number;
export type StockQuantity = string; // Precision decimal as string
export type QuantityDelta = number; // Can be negative
export type WeightGrams = number;
export type VolumeMilliliters = number;
export type TemperatureCelsius = number;
export type HumidityPercent = number;

// ============================================================================
// IDENTIFIERS & CODES
// ============================================================================

/**
 * UUID validation with custom error message
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Document number format
 *
 * Pattern: PREFIX-YYYYMM-00001
 * Auto-generated by database function generate_doc_sequence()
 *
 * @see FEATURES.md - Auto-numbering pattern
 *
 * @example "PO-202501-00123", "GR-202501-00045", "XFER-202501-00078"
 */
export const documentNumberSchema = z
  .string()
  .regex(
    /^[A-Z]+-\d{6}-\d{5}$/,
    'Invalid document number format (expected: PREFIX-YYYYMM-00001)'
  );

/**
 * Product SKU format
 *
 * Alphanumeric with optional hyphens and underscores
 *
 * @example "PROD-001", "RAW_MAT_123", "FG12345"
 */
export const skuSchema = z
  .string()
  .min(1, 'SKU cannot be empty')
  .max(50, 'SKU too long (max 50 characters)')
  .regex(/^[A-Z0-9_-]+$/i, 'SKU must be alphanumeric with optional hyphens/underscores');

/**
 * Entity code format (for products, locations, suppliers, etc.)
 *
 * Used for human-readable codes that must be unique per tenant.
 */
export const entityCodeSchema = z
  .string()
  .min(1, 'Code cannot be empty')
  .max(50, 'Code too long (max 50 characters)')
  .regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric with optional hyphens/underscores');

/**
 * Barcode format
 *
 * Supports various barcode standards (EAN-13, UPC, Code 128, etc.)
 */
export const barcodeSchema = z
  .string()
  .min(8, 'Barcode too short')
  .max(100, 'Barcode too long')
  .regex(/^[A-Z0-9]+$/i, 'Barcode must be alphanumeric');

/**
 * Lot number format
 *
 * @see FEATURES.md PROC-005 - Lot tracking
 *
 * @example "LOT-2025-001", "BATCH-A123", "20250118-001"
 */
export const lotNumberSchema = z
  .string()
  .min(1, 'Lot number cannot be empty')
  .max(100, 'Lot number too long (max 100 characters)');

export type UUID = string;
export type DocumentNumber = string;
export type SKU = string;
export type EntityCode = string;
export type Barcode = string;
export type LotNumber = string;

// ============================================================================
// DATES & TIMES
// ============================================================================

/**
 * ISO 8601 datetime string for input
 *
 * @example "2025-01-18T10:30:00Z", "2025-01-18T10:30:00+07:00"
 */
export const dateTimeInputSchema = z
  .string()
  .datetime('Invalid datetime format (must be ISO 8601)');

/**
 * Date-only string for input (YYYY-MM-DD)
 *
 * @example "2025-01-18"
 */
export const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

/**
 * Time-only string (HH:MM:SS or HH:MM)
 *
 * @example "10:30:00", "14:45"
 */
export const timeInputSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (expected HH:MM or HH:MM:SS)');

/**
 * Date range validation
 *
 * Ensures dateFrom is before dateTo if both are provided.
 */
export const dateRangeSchema = z
  .object({
    dateFrom: dateTimeInputSchema.optional(),
    dateTo: dateTimeInputSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    { message: 'dateFrom must be before or equal to dateTo' }
  );

/**
 * Duration in minutes
 *
 * Used for prep time, cook time, delivery time, etc.
 */
export const durationMinutesSchema = z
  .number()
  .int('Duration must be a whole number')
  .nonnegative('Duration cannot be negative');

export type DateTimeInput = string;
export type DateInput = string;
export type TimeInput = string;
export type DurationMinutes = number;

// ============================================================================
// CONTACT INFORMATION
// ============================================================================

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long');

/**
 * Phone number validation (international format)
 *
 * Allows various formats, doesn't enforce strict pattern due to international variety.
 */
export const phoneSchema = z
  .string()
  .min(8, 'Phone number too short')
  .max(20, 'Phone number too long')
  .regex(/^[0-9+\-() ]+$/, 'Phone number contains invalid characters');

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export type Email = string;
export type Phone = string;
export type URL = string;

// ============================================================================
// PERCENTAGES & RATIOS
// ============================================================================

/**
 * Percentage (0-100)
 *
 * Generic percentage validator.
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

/**
 * Ratio (0-1)
 *
 * Decimal representation of percentage.
 */
export const ratioSchema = z
  .number()
  .min(0, 'Ratio cannot be negative')
  .max(1, 'Ratio cannot exceed 1');

/**
 * Variance percentage (can be negative for decreases)
 *
 * @see FEATURES.md - Variance tracking in GR, Transfers, Stock Counts
 *
 * @example 15.5 (15.5% increase), -10.2 (10.2% decrease)
 */
export const variancePercentSchema = z
  .number()
  .finite('Variance percentage must be finite');

export type Percentage = number; // 0-100
export type Ratio = number; // 0-1
export type VariancePercent = number; // Can be negative

// ============================================================================
// GEOGRAPHIC
// ============================================================================

/**
 * Latitude (-90 to 90)
 */
export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude out of range')
  .max(90, 'Latitude out of range');

/**
 * Longitude (-180 to 180)
 */
export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude out of range')
  .max(180, 'Longitude out of range');

/**
 * Postal code (flexible international format)
 */
export const postalCodeSchema = z
  .string()
  .min(3, 'Postal code too short')
  .max(20, 'Postal code too long')
  .regex(/^[A-Z0-9\s-]+$/i, 'Invalid postal code format');

export type Latitude = number;
export type Longitude = number;
export type PostalCode = string;

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

/**
 * Boolean query parameter schema
 *
 * Properly handles string "true" and "false" from URL query parameters.
 * Unlike z.coerce.boolean() which converts any non-empty string to true,
 * this schema correctly parses "false" as boolean false.
 *
 * @example
 * ```typescript
 * const filterSchema = z.object({
 *   isActive: booleanQueryParamSchema.optional(),
 * });
 * // ?isActive=true -> true
 * // ?isActive=false -> false
 * // ?isActive=1 -> true
 * // ?isActive=0 -> false
 * ```
 */
export const booleanQueryParamSchema = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0'), z.boolean()])
  .transform((val) => val === 'true' || val === '1' || val === true);

export type BooleanQueryParam = boolean;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Create a future date validator
 *
 * Ensures date is after current date.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   expectedDelivery: futureDateSchema(),
 * });
 * ```
 */
export function futureDateSchema() {
  return dateTimeInputSchema.refine(
    (date) => new Date(date) > new Date(),
    { message: 'Date must be in the future' }
  );
}

/**
 * Create a past date validator
 *
 * Ensures date is before current date.
 */
export function pastDateSchema() {
  return dateTimeInputSchema.refine(
    (date) => new Date(date) < new Date(),
    { message: 'Date must be in the past' }
  );
}

/**
 * Create a minimum value validator with custom message
 *
 * @param min - Minimum allowed value
 * @param message - Custom error message
 */
export function minValue(min: number, message?: string) {
  return z.number().min(min, message || `Value must be at least ${min}`);
}

/**
 * Create a maximum value validator with custom message
 *
 * @param max - Maximum allowed value
 * @param message - Custom error message
 */
export function maxValue(max: number, message?: string) {
  return z.number().max(max, message || `Value cannot exceed ${max}`);
}

/**
 * Create a range validator
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param message - Custom error message
 */
export function rangeValue(min: number, max: number, message?: string) {
  return z
    .number()
    .min(min)
    .max(max)
    .refine((val) => val >= min && val <= max, {
      message: message || `Value must be between ${min} and ${max}`,
    });
}
