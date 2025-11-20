/**
 * Unit of Measure (UOM) Management contracts for admin module
 *
 * Manages UOMs (kg, g, L, mL, pcs, box) and conversion factors
 * for quantity conversions throughout the system.
 *
 * CRITICAL: UOM conversions impact:
 * - Inventory calculations
 * - Purchase order pricing
 * - Recipe scaling
 * - Sales transactions
 *
 * Covers:
 * 1. UOM definition and management (ADM-003)
 * 2. UOM conversion factor configuration
 * 3. Bi-directional conversion support
 * 4. Automatic quantity conversion
 *
 * @module @contracts/erp/admin/uoms
 * @see FEATURES.md Section 12.3 - UOM Management (ADM-003)
 * @see USER_STORIES.md Epic 12 - System Administration
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  successResponseSchema,
  paginatedResponseSchema,
} from '../common.js';
import {
  uuidSchema,
  entityCodeSchema,
  quantitySchema,
} from '../primitives.js';

// ============================================================================
// UOM CREATION SCHEMAS
// ============================================================================

/**
 * UOM creation
 *
 * Business Rules (from FEATURES.md ADM-003):
 * - UOM code is unique per tenant
 * - UOM type categorizes measurement (weight, volume, count)
 * - Used throughout system for quantity management
 *
 * @see FEATURES.md ADM-003 - "UOM definition (kg, g, L, mL, pcs, box)"
 * @see FEATURES.md ADM-003 - "UOM type (weight, volume, count)"
 *
 * @example
 * ```typescript
 * {
 *   code: "kg",
 *   name: "Kilogram",
 *   uomType: "weight",
 *   symbol: "kg"
 * }
 * ```
 */
export const uomCreateSchema = z.object({
  code: entityCodeSchema, // Unique code (e.g., "kg", "L", "pcs")
  name: z.string().min(1).max(100), // Full name (e.g., "Kilogram")
  uomType: z.enum(['weight', 'volume', 'count', 'length', 'area', 'time']),
  symbol: z.string().max(20).optional(), // Display symbol (e.g., "kg", "L")
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

/**
 * Update UOM
 */
export const uomUpdateSchema = uomCreateSchema.partial().omit({ code: true });

export type UomCreate = z.infer<typeof uomCreateSchema>;
export type UomUpdate = z.infer<typeof uomUpdateSchema>;

// ============================================================================
// UOM CONVERSION SCHEMAS
// ============================================================================

/**
 * UOM conversion creation
 *
 * Business Rules (from FEATURES.md ADM-003):
 * - Conversion factor: from_qty × factor = to_qty
 * - Bi-directional: if kg→g = 1000, then g→kg = 0.001
 * - Used throughout system for quantity conversions
 *
 * @see FEATURES.md ADM-003 - "Conversion factor definition"
 * @see FEATURES.md ADM-003 - "Bi-directional conversion support"
 *
 * @example
 * ```typescript
 * {
 *   fromUomId: "uom-kg",
 *   toUomId: "uom-g",
 *   conversionFactor: 1000 // 1 kg = 1000 g
 * }
 * ```
 */
export const uomConversionCreateSchema = z.object({
  fromUomId: uuidSchema,
  toUomId: uuidSchema,
  conversionFactor: z.number().positive(), // from_qty × factor = to_qty
});

/**
 * Update UOM conversion
 */
export const uomConversionUpdateSchema = z.object({
  conversionFactor: z.number().positive(),
});

/**
 * Convert quantity between UOMs
 *
 * Business Rule: Automatic quantity conversion using conversion factors
 *
 * @example
 * ```typescript
 * {
 *   quantity: 5,
 *   fromUomId: "uom-kg",
 *   toUomId: "uom-g"
 * }
 * // Result: 5000 g
 * ```
 */
export const uomConvertQuantitySchema = z.object({
  quantity: quantitySchema,
  fromUomId: uuidSchema,
  toUomId: uuidSchema,
});

export type UomConversionCreate = z.infer<typeof uomConversionCreateSchema>;
export type UomConversionUpdate = z.infer<typeof uomConversionUpdateSchema>;
export type UomConvertQuantity = z.infer<typeof uomConvertQuantitySchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * UOM query filters
 */
export const uomFiltersSchema = z.object({
  code: z.string().optional(), // Search by code
  name: z.string().optional(), // Search by name
  uomType: z.enum(['weight', 'volume', 'count', 'length', 'area', 'time']).optional(),
  isActive: z.coerce.boolean().optional(), // Coerce string query params to boolean
});

/**
 * Complete UOM query schema
 */
export const uomQuerySchema = baseQuerySchema.merge(uomFiltersSchema);

/**
 * UOM conversion query filters
 */
export const uomConversionFiltersSchema = z.object({
  fromUomId: uuidSchema.optional(),
  toUomId: uuidSchema.optional(),
});

/**
 * UOM conversion query schema
 */
export const uomConversionQuerySchema = baseQuerySchema.merge(uomConversionFiltersSchema);

export type UomFilters = z.infer<typeof uomFiltersSchema>;
export type UomQuery = z.infer<typeof uomQuerySchema>;
export type UomConversionFilters = z.infer<typeof uomConversionFiltersSchema>;
export type UomConversionQuery = z.infer<typeof uomConversionQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * UOM detail schema
 *
 * @see FEATURES.md ADM-003 - UOM structure
 */
export const uomDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique code
  name: z.string(),
  uomType: z.string(), // weight, volume, count, length, area, time
  symbol: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * UOM list item schema
 */
export const uomListItemSchema = uomDetailSchema;

/**
 * UOM conversion detail schema
 */
export const uomConversionDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  fromUomId: uuidSchema,
  toUomId: uuidSchema,
  conversionFactor: z.string(), // Numeric as string for precision

  // Relations
  fromUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    symbol: z.string().nullable(),
  }),

  toUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    symbol: z.string().nullable(),
  }),

  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Quantity conversion result
 */
export const quantityConversionResultSchema = z.object({
  originalQuantity: z.string(), // Input quantity
  originalUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),
  convertedQuantity: z.string(), // Output quantity
  convertedUom: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }),
  conversionFactor: z.string(),
});

/**
 * UOM response
 */
export const uomResponseSchema = successResponseSchema(uomDetailSchema);

/**
 * UOMs paginated response
 */
export const uomsResponseSchema = paginatedResponseSchema(uomListItemSchema);

/**
 * UOM conversion response
 */
export const uomConversionResponseSchema = successResponseSchema(uomConversionDetailSchema);

/**
 * UOM conversions response
 */
export const uomConversionsResponseSchema = paginatedResponseSchema(uomConversionDetailSchema);

/**
 * Quantity conversion response
 */
export const quantityConversionResponseSchema = successResponseSchema(
  quantityConversionResultSchema
);

export type UomDetail = z.infer<typeof uomDetailSchema>;
export type UomListItem = z.infer<typeof uomListItemSchema>;
export type UomConversionDetail = z.infer<typeof uomConversionDetailSchema>;
export type QuantityConversionResult = z.infer<typeof quantityConversionResultSchema>;
export type UomResponse = z.infer<typeof uomResponseSchema>;
export type UomsResponse = z.infer<typeof uomsResponseSchema>;
export type UomConversionResponse = z.infer<typeof uomConversionResponseSchema>;
export type UomConversionsResponse = z.infer<typeof uomConversionsResponseSchema>;
export type QuantityConversionResponse = z.infer<typeof quantityConversionResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate unique UOM code per tenant
 *
 * Business Rule (from FEATURES.md ADM-003):
 * UOM code is unique per tenant
 *
 * @param code - UOM code
 * @param existingCodes - List of existing codes in tenant
 * @returns Validation result
 */
export function validateUniqueUomCode(
  code: string,
  existingCodes: string[]
): { valid: boolean; error?: string } {
  if (existingCodes.includes(code.toUpperCase())) {
    return {
      valid: false,
      error: 'UOM code already exists',
    };
  }
  return { valid: true };
}

/**
 * Convert quantity using conversion factor
 *
 * Business Rule (from FEATURES.md ADM-003):
 * Conversion: from_qty × factor = to_qty
 *
 * @param quantity - Quantity in from UOM
 * @param conversionFactor - Conversion factor
 * @returns Converted quantity
 */
export function convertQuantity(
  quantity: number,
  conversionFactor: number
): number {
  return quantity * conversionFactor;
}

/**
 * Calculate reverse conversion factor
 *
 * Business Rule (from FEATURES.md ADM-003):
 * Bi-directional: if kg→g = 1000, then g→kg = 0.001
 *
 * @param forwardFactor - Forward conversion factor
 * @returns Reverse conversion factor
 */
export function calculateReverseConversionFactor(
  forwardFactor: number
): number {
  return 1 / forwardFactor;
}

/**
 * Validate UOM compatibility
 *
 * Business Rule: Can only convert within same UOM type
 *
 * @param fromUomType - Source UOM type
 * @param toUomType - Target UOM type
 * @returns Validation result
 */
export function validateUomCompatibility(
  fromUomType: string,
  toUomType: string
): { valid: boolean; error?: string } {
  if (fromUomType !== toUomType) {
    return {
      valid: false,
      error: `Cannot convert between different UOM types: ${fromUomType} and ${toUomType}`,
    };
  }
  return { valid: true };
}

/**
 * Get standard UOM conversions
 *
 * Business Rule: Common conversion factors
 *
 * @returns Standard UOM conversions
 */
export function getStandardConversions(): Array<{
  fromCode: string;
  toCode: string;
  factor: number;
  description: string;
}> {
  return [
    // Weight conversions
    { fromCode: 'kg', toCode: 'g', factor: 1000, description: '1 kg = 1000 g' },
    { fromCode: 'g', toCode: 'mg', factor: 1000, description: '1 g = 1000 mg' },
    { fromCode: 'kg', toCode: 'lb', factor: 2.20462, description: '1 kg = 2.20462 lb' },
    { fromCode: 'lb', toCode: 'oz', factor: 16, description: '1 lb = 16 oz' },

    // Volume conversions
    { fromCode: 'L', toCode: 'mL', factor: 1000, description: '1 L = 1000 mL' },
    { fromCode: 'L', toCode: 'gal', factor: 0.264172, description: '1 L = 0.264172 gal' },
    { fromCode: 'gal', toCode: 'qt', factor: 4, description: '1 gal = 4 qt' },
    { fromCode: 'qt', toCode: 'pt', factor: 2, description: '1 qt = 2 pt' },
    { fromCode: 'pt', toCode: 'cup', factor: 2, description: '1 pt = 2 cups' },
    { fromCode: 'cup', toCode: 'tbsp', factor: 16, description: '1 cup = 16 tbsp' },
    { fromCode: 'tbsp', toCode: 'tsp', factor: 3, description: '1 tbsp = 3 tsp' },

    // Count conversions
    { fromCode: 'doz', toCode: 'pcs', factor: 12, description: '1 dozen = 12 pieces' },
    { fromCode: 'box', toCode: 'pcs', factor: 24, description: '1 box = 24 pieces (configurable)' },
    { fromCode: 'case', toCode: 'box', factor: 12, description: '1 case = 12 boxes (configurable)' },

    // Length conversions
    { fromCode: 'm', toCode: 'cm', factor: 100, description: '1 m = 100 cm' },
    { fromCode: 'cm', toCode: 'mm', factor: 10, description: '1 cm = 10 mm' },
    { fromCode: 'm', toCode: 'ft', factor: 3.28084, description: '1 m = 3.28084 ft' },
    { fromCode: 'ft', toCode: 'in', factor: 12, description: '1 ft = 12 in' },
  ];
}

/**
 * Format UOM display
 *
 * Helper for UI display.
 *
 * @param code - UOM code
 * @param name - UOM name
 * @param symbol - UOM symbol (optional)
 * @returns Formatted display
 */
export function formatUomDisplay(
  code: string,
  name: string,
  symbol?: string | null
): string {
  if (symbol) {
    return `${name} (${symbol})`;
  }
  return `${name} (${code})`;
}

/**
 * Format quantity with UOM
 *
 * Helper for UI display.
 *
 * @param quantity - Quantity value
 * @param uomSymbol - UOM symbol or code
 * @returns Formatted quantity string
 */
export function formatQuantityWithUom(
  quantity: number,
  uomSymbol: string
): string {
  return `${quantity.toFixed(2)} ${uomSymbol}`;
}

/**
 * Get UOM type display
 *
 * Helper for UI display.
 *
 * @param uomType - UOM type
 * @returns Display name
 */
export function getUomTypeDisplay(uomType: string): string {
  const displays: Record<string, string> = {
    weight: 'Weight',
    volume: 'Volume',
    count: 'Count/Pieces',
    length: 'Length',
    area: 'Area',
    time: 'Time',
  };
  return displays[uomType] || uomType;
}

/**
 * Check if conversion path exists
 *
 * Business Rule: Direct or chained conversion must exist
 *
 * @param fromUomId - Source UOM ID
 * @param toUomId - Target UOM ID
 * @param conversions - Available conversions
 * @returns True if conversion possible
 */
export function hasConversionPath(
  fromUomId: string,
  toUomId: string,
  conversions: Array<{ fromUomId: string; toUomId: string }>
): boolean {
  // Same UOM
  if (fromUomId === toUomId) return true;

  // Direct conversion
  const directConversion = conversions.find(
    (c) => c.fromUomId === fromUomId && c.toUomId === toUomId
  );
  if (directConversion) return true;

  // Reverse conversion
  const reverseConversion = conversions.find(
    (c) => c.fromUomId === toUomId && c.toUomId === fromUomId
  );
  if (reverseConversion) return true;

  // TODO: Implement chained conversion path finding
  return false;
}

/**
 * Validate conversion factor
 *
 * Business Rule: Conversion factor must be positive
 *
 * @param factor - Conversion factor
 * @returns Validation result
 */
export function validateConversionFactor(
  factor: number
): { valid: boolean; error?: string } {
  if (factor <= 0) {
    return {
      valid: false,
      error: 'Conversion factor must be positive',
    };
  }
  if (factor === 1) {
    return {
      valid: false,
      error: 'Conversion factor of 1 indicates same UOM, conversion not needed',
    };
  }
  return { valid: true };
}
