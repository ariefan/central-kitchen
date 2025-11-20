/**
 * Location Management contracts for admin module
 *
 * Manages physical locations including central kitchens, outlets,
 * and warehouses. Locations are used for inventory segregation and
 * user access control.
 *
 * CRITICAL: Locations impact:
 * - Inventory segregation
 * - User access control
 * - Stock transfers
 * - Multi-location reporting
 *
 * Covers:
 * 1. Location setup and management (ADM-004)
 * 2. Location types (central_kitchen, outlet, warehouse)
 * 3. Active/inactive status
 *
 * @module @contracts/erp/admin/locations
 * @see FEATURES.md Section 12.4 - Location Management (ADM-004)
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
  emailSchema,
  phoneSchema,
  entityCodeSchema,
  postalCodeSchema,
  latitudeSchema,
  longitudeSchema,
  booleanQueryParamSchema,
} from '../primitives.js';
import { locationTypeSchema } from '../enums.js';

// ============================================================================
// LOCATION CREATION SCHEMAS
// ============================================================================

/**
 * Location creation
 *
 * Business Rules (from FEATURES.md ADM-004):
 * - Location code is unique per tenant
 * - Inactive locations not available for transactions
 * - Used for inventory segregation
 * - Used for user access control
 *
 * @see FEATURES.md ADM-004 - "Location setup with code and name"
 * @see FEATURES.md ADM-004 - "Location types (central_kitchen, outlet, warehouse)"
 *
 * @example
 * ```typescript
 * {
 *   code: "LOC-CK01",
 *   name: "Central Kitchen - Main",
 *   locationType: "central_kitchen",
 *   address: "123 Industrial Rd",
 *   city: "Singapore",
 *   postalCode: "123456",
 *   phone: "+6512345678"
 * }
 * ```
 */
export const locationCreateSchema = z.object({
  code: entityCodeSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(200),
  locationType: locationTypeSchema, // central_kitchen, outlet, warehouse

  // Address
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postalCode: postalCodeSchema.optional(),
  country: z.string().max(100).default('Singapore'),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),

  // Contact
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  managerName: z.string().max(100).optional(),

  // Operating hours (JSON)
  operatingHours: z.any().optional(), // { monday: { open: "09:00", close: "18:00" }, ... }

  // Status
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

/**
 * Update location
 */
export const locationUpdateSchema = locationCreateSchema.partial().omit({ code: true });

export type LocationCreate = z.infer<typeof locationCreateSchema>;
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Location query filters
 */
export const locationFiltersSchema = z.object({
  name: z.string().optional(), // Search by name
  code: z.string().optional(), // Search by code
  locationType: locationTypeSchema.optional(),
  isActive: booleanQueryParamSchema.optional(), // Boolean from string query param
  city: z.string().optional(),
});

/**
 * Complete Location query schema
 */
export const locationQuerySchema = baseQuerySchema.merge(locationFiltersSchema);

export type LocationFilters = z.infer<typeof locationFiltersSchema>;
export type LocationQuery = z.infer<typeof locationQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Location detail schema
 *
 * @see FEATURES.md ADM-004 - Location structure
 */
export const locationDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique location code
  name: z.string(),
  locationType: z.string(), // central_kitchen, outlet, warehouse

  // Address
  address: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),

  // Contact
  phone: z.string().nullable(),
  email: z.string().nullable(),
  managerName: z.string().nullable(),

  // Operating hours
  operatingHours: z.any().nullable(),

  // Status
  isActive: z.boolean(),
  notes: z.string().nullable(),

  // Statistics
  totalUsers: z.number().int(), // Users assigned to this location
  totalOnHandValue: z.string(), // Money amount
  totalProducts: z.number().int(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Location list item schema
 */
export const locationListItemSchema = locationDetailSchema.omit({
  notes: true,
  operatingHours: true,
});

/**
 * Location response
 */
export const locationResponseSchema = successResponseSchema(locationDetailSchema);

/**
 * Locations paginated response
 */
export const locationsResponseSchema = paginatedResponseSchema(locationListItemSchema);

export type LocationDetail = z.infer<typeof locationDetailSchema>;
export type LocationListItem = z.infer<typeof locationListItemSchema>;
export type LocationResponse = z.infer<typeof locationResponseSchema>;
export type LocationsResponse = z.infer<typeof locationsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate location code
 *
 * Business Rule (from FEATURES.md ADM-004):
 * Auto-generated format: LOC-{TYPE}-{SEQ}
 *
 * @param locationType - Location type
 * @param lastSequence - Last used sequence number
 * @returns Next location code
 */
export function generateNextLocationCode(
  locationType: string,
  lastSequence: number
): string {
  const prefixes: Record<string, string> = {
    central_kitchen: 'CK',
    outlet: 'OUT',
    warehouse: 'WH',
  };

  const prefix = prefixes[locationType] || 'LOC';
  const sequence = (lastSequence + 1).toString().padStart(3, '0');
  return `LOC-${prefix}-${sequence}`;
}

/**
 * Validate unique location code per tenant
 *
 * Business Rule (from FEATURES.md ADM-004):
 * Location code is unique per tenant
 *
 * @param code - Location code
 * @param existingCodes - List of existing codes in tenant
 * @returns Validation result
 */
export function validateUniqueLocationCode(
  code: string,
  existingCodes: string[]
): { valid: boolean; error?: string } {
  if (existingCodes.includes(code.toUpperCase())) {
    return {
      valid: false,
      error: 'Location code already exists',
    };
  }
  return { valid: true };
}

/**
 * Check if location can have transactions
 *
 * Business Rule (from FEATURES.md ADM-004):
 * Inactive locations not available for transactions
 *
 * @param isActive - Location active status
 * @returns True if can have transactions
 */
export function canHaveTransactions(isActive: boolean): boolean {
  return isActive;
}

/**
 * Get location type display
 *
 * Helper for UI display.
 *
 * @param locationType - Location type
 * @returns Display name
 */
export function getLocationTypeDisplay(locationType: string): string {
  const displays: Record<string, string> = {
    central_kitchen: 'Central Kitchen',
    outlet: 'Outlet',
    warehouse: 'Warehouse',
  };
  return displays[locationType] || locationType;
}

/**
 * Format location display name
 *
 * Helper for UI display.
 *
 * @param name - Location name
 * @param code - Location code
 * @returns Formatted display name
 */
export function formatLocationDisplayName(name: string, code: string): string {
  return `${name} (${code})`;
}

/**
 * Calculate distance between locations
 *
 * Helper for delivery and transfer planning.
 * Uses Haversine formula.
 *
 * @param lat1 - Latitude of location 1
 * @param lon1 - Longitude of location 1
 * @param lat2 - Latitude of location 2
 * @param lon2 - Longitude of location 2
 * @returns Distance in kilometers
 */
export function calculateLocationDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if location is currently open
 *
 * Business Rule: Based on operating hours and current time
 *
 * @param operatingHours - Operating hours configuration
 * @param currentDate - Current date/time (defaults to now)
 * @returns True if currently open
 */
export function isLocationOpen(
  operatingHours: any,
  currentDate: Date = new Date()
): boolean {
  if (!operatingHours) return true; // Assume 24/7 if not specified

  const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hours = operatingHours[dayOfWeek];

  if (!hours || !hours.open || !hours.close) return false;

  const currentTime = currentDate.toTimeString().substring(0, 5); // "HH:MM"
  return currentTime >= hours.open && currentTime <= hours.close;
}
