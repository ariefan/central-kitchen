/**
 * Menu Management contracts for admin module
 *
 * Manages menus for POS, online, and wholesale channels.
 * Controls product visibility and availability by channel and location.
 *
 * CRITICAL: Menu configuration impacts:
 * - Product availability in POS
 * - Online ordering catalog
 * - Wholesale product lists
 * - Location-specific offerings
 *
 * Covers:
 * 1. Menu creation by channel (ADM-005)
 * 2. Menu item management
 * 3. Active date range control
 * 4. Location-specific availability
 *
 * @module @contracts/erp/admin/menus
 * @see FEATURES.md Section 12.5 - Menu Management (ADM-005)
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
} from '../primitives.js';
import { orderChannelSchema } from '../enums.js';

// ============================================================================
// MENU CREATION SCHEMAS
// ============================================================================

/**
 * Menu creation
 *
 * Business Rules (from FEATURES.md ADM-005):
 * - Menu active if is_active = true AND CURRENT_DATE BETWEEN active_from AND active_until
 * - Products shown based on menu availability
 * - Used in POS and online ordering
 *
 * @see FEATURES.md ADM-005 - "Menu creation by channel (POS, online, wholesale)"
 * @see FEATURES.md ADM-005 - "Active date range"
 *
 * @example
 * ```typescript
 * {
 *   code: "MENU-POS-MAIN",
 *   name: "Main POS Menu",
 *   channel: "pos",
 *   activeFrom: "2025-01-01",
 *   activeUntil: "2025-12-31"
 * }
 * ```
 */
export const menuCreateSchema = z.object({
  code: entityCodeSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(200),
  channel: orderChannelSchema, // pos, online, wholesale
  activeFrom: dateInputSchema,
  activeUntil: dateInputSchema.optional(), // null = no end date
  isActive: z.boolean().default(true),
  description: z.string().max(1000).optional(),
});

/**
 * Update menu
 */
export const menuUpdateSchema = menuCreateSchema.partial().omit({ code: true });

export type MenuCreate = z.infer<typeof menuCreateSchema>;
export type MenuUpdate = z.infer<typeof menuUpdateSchema>;

// ============================================================================
// MENU ITEM SCHEMAS
// ============================================================================

/**
 * Add product to menu
 *
 * Business Rules (from FEATURES.md ADM-005):
 * - Display order determines sort in UI
 * - Location-specific availability (null for all locations)
 * - Products can be temporarily unavailable
 *
 * @see FEATURES.md ADM-005 - "Product addition to menu"
 * @see FEATURES.md ADM-005 - "Availability by location"
 * @see FEATURES.md ADM-005 - "Display order configuration"
 *
 * @example
 * ```typescript
 * {
 *   menuId: "menu-123",
 *   productId: "prod-456",
 *   locationId: "loc-789", // null for all locations
 *   displayOrder: 1,
 *   isAvailable: true
 * }
 * ```
 */
export const menuItemCreateSchema = z.object({
  menuId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.optional(), // Specific variant (optional)
  locationId: uuidSchema.optional(), // null for all locations
  displayOrder: z.number().int().nonnegative().default(0),
  isAvailable: z.boolean().default(true),
  description: z.string().max(500).optional(), // Override product description
  imageUrl: z.string().url().optional(), // Override product image
});

/**
 * Update menu item
 */
export const menuItemUpdateSchema = menuItemCreateSchema
  .partial()
  .omit({ menuId: true, productId: true });

/**
 * Bulk add products to menu
 */
export const menuItemBulkCreateSchema = z.object({
  menuId: uuidSchema,
  productIds: z.array(uuidSchema).min(1).max(100),
  locationId: uuidSchema.optional(), // Applied to all products
  isAvailable: z.boolean().default(true),
});

export type MenuItemCreate = z.infer<typeof menuItemCreateSchema>;
export type MenuItemUpdate = z.infer<typeof menuItemUpdateSchema>;
export type MenuItemBulkCreate = z.infer<typeof menuItemBulkCreateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Menu query filters
 */
export const menuFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    code: z.string().optional(), // Search by code
    channel: orderChannelSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Menu query schema
 */
export const menuQuerySchema = baseQuerySchema.merge(menuFiltersSchema);

/**
 * Menu item query filters
 */
export const menuItemFiltersSchema = z.object({
  menuId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  isAvailable: z.boolean().optional(),
});

/**
 * Menu item query schema
 */
export const menuItemQuerySchema = baseQuerySchema.merge(menuItemFiltersSchema);

export type MenuFilters = z.infer<typeof menuFiltersSchema>;
export type MenuQuery = z.infer<typeof menuQuerySchema>;
export type MenuItemFilters = z.infer<typeof menuItemFiltersSchema>;
export type MenuItemQuery = z.infer<typeof menuItemQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Menu item detail schema
 */
export const menuItemDetailSchema = z.object({
  id: uuidSchema,
  menuId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  locationId: uuidSchema.nullable(),
  displayOrder: z.number(),
  isAvailable: z.boolean(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),

  // Product relation
  product: z.object({
    id: uuidSchema,
    sku: z.string(),
    name: z.string(),
    defaultPrice: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }),

  // Variant relation (if applicable)
  variant: z.object({
    id: uuidSchema,
    variantName: z.string(),
    priceDifferential: z.string(),
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
 * Menu detail schema
 *
 * @see FEATURES.md ADM-005 - Menu structure
 */
export const menuDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique menu code
  name: z.string(),
  channel: z.string(), // pos, online, wholesale
  activeFrom: z.date(),
  activeUntil: z.date().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),

  // Statistics
  totalItems: z.number().int(),
  availableItems: z.number().int(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations (optional)
  items: z.array(menuItemDetailSchema).optional(),
});

/**
 * Menu list item schema (without items)
 */
export const menuListItemSchema = menuDetailSchema.omit({
  items: true,
  description: true,
});

/**
 * Menu response
 */
export const menuResponseSchema = successResponseSchema(menuDetailSchema);

/**
 * Menus paginated response
 */
export const menusResponseSchema = paginatedResponseSchema(menuListItemSchema);

/**
 * Menu item response
 */
export const menuItemResponseSchema = successResponseSchema(menuItemDetailSchema);

/**
 * Menu items response
 */
export const menuItemsResponseSchema = successResponseSchema(
  z.object({
    menuId: uuidSchema,
    items: z.array(menuItemDetailSchema),
  })
);

export type MenuItemDetail = z.infer<typeof menuItemDetailSchema>;
export type MenuDetail = z.infer<typeof menuDetailSchema>;
export type MenuListItem = z.infer<typeof menuListItemSchema>;
export type MenuResponse = z.infer<typeof menuResponseSchema>;
export type MenusResponse = z.infer<typeof menusResponseSchema>;
export type MenuItemResponse = z.infer<typeof menuItemResponseSchema>;
export type MenuItemsResponse = z.infer<typeof menuItemsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate menu code
 *
 * Business Rule: Auto-generated format: MENU-{CHANNEL}-{SEQ}
 *
 * @param channel - Menu channel
 * @param lastSequence - Last used sequence number
 * @returns Next menu code
 */
export function generateNextMenuCode(
  channel: string,
  lastSequence: number
): string {
  const prefix = channel.toUpperCase();
  const sequence = (lastSequence + 1).toString().padStart(3, '0');
  return `MENU-${prefix}-${sequence}`;
}

/**
 * Check if menu is currently active
 *
 * Business Rule (from FEATURES.md ADM-005):
 * Menu active if is_active = true AND CURRENT_DATE BETWEEN active_from AND active_until
 *
 * @param isActive - Menu active flag
 * @param activeFrom - Active from date
 * @param activeUntil - Active until date (null = no end)
 * @param currentDate - Current date (defaults to now)
 * @returns True if menu is active
 */
export function isMenuActive(
  isActive: boolean,
  activeFrom: Date,
  activeUntil: Date | null,
  currentDate: Date = new Date()
): boolean {
  if (!isActive) return false;

  const now = currentDate.getTime();
  if (now < activeFrom.getTime()) return false;
  if (activeUntil && now > activeUntil.getTime()) return false;

  return true;
}

/**
 * Validate date range
 *
 * Business Rule: activeFrom must be before activeUntil
 *
 * @param activeFrom - Active from date
 * @param activeUntil - Active until date
 * @returns Validation result
 */
export function validateMenuDateRange(
  activeFrom: Date,
  activeUntil: Date | null
): { valid: boolean; error?: string } {
  if (activeUntil && activeFrom >= activeUntil) {
    return {
      valid: false,
      error: 'Active from date must be before active until date',
    };
  }
  return { valid: true };
}

/**
 * Sort menu items by display order
 *
 * Helper for UI display.
 *
 * @param items - Menu items
 * @returns Sorted items
 */
export function sortMenuItemsByDisplayOrder<T extends { displayOrder: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Filter available menu items
 *
 * Helper for active menu display.
 *
 * @param items - Menu items
 * @param locationId - Current location (optional)
 * @returns Available items
 */
export function filterAvailableMenuItems<
  T extends { isAvailable: boolean; locationId: string | null }
>(items: T[], locationId?: string): T[] {
  return items.filter((item) => {
    if (!item.isAvailable) return false;
    if (item.locationId && locationId && item.locationId !== locationId) return false;
    return true;
  });
}

/**
 * Get menu channel display
 *
 * Helper for UI display.
 *
 * @param channel - Menu channel
 * @returns Display name
 */
export function getMenuChannelDisplay(channel: string): string {
  const displays: Record<string, string> = {
    pos: 'POS',
    online: 'Online',
    wholesale: 'Wholesale',
  };
  return displays[channel] || channel;
}

/**
 * Format menu display name
 *
 * Helper for UI display.
 *
 * @param name - Menu name
 * @param channel - Menu channel
 * @returns Formatted display name
 */
export function formatMenuDisplayName(name: string, channel: string): string {
  return `${name} (${getMenuChannelDisplay(channel)})`;
}

/**
 * Calculate menu completeness
 *
 * Helper for menu setup progress.
 *
 * @param totalItems - Total menu items
 * @param targetItems - Target number of items
 * @returns Completeness percentage (0-100)
 */
export function calculateMenuCompleteness(
  totalItems: number,
  targetItems: number
): number {
  if (targetItems === 0) return 0;
  return Math.min(100, Math.round((totalItems / targetItems) * 100));
}
