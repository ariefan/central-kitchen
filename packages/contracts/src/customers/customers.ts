/**
 * Customer Management contracts for customers module
 *
 * Manages customer registration, profiles, and delivery addresses.
 * Integrates with loyalty program and voucher systems.
 *
 * CRITICAL: Customer registration triggers:
 * - Email verification workflow
 * - Automatic loyalty account creation
 * - Welcome voucher issuance ($5 off)
 * - Customer code auto-generation (CUST-00001)
 *
 * Covers:
 * 1. Customer registration with email verification (CUS-001)
 * 2. Profile management
 * 3. Multiple delivery address management
 * 4. Customer segmentation
 *
 * @module @contracts/erp/customers/customers
 * @see FEATURES.md CUS-001 - Customer Management
 * @see USER_STORIES.md Epic 9 - Customer & Loyalty
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
  emailSchema,
  phoneSchema,
  dateInputSchema,
  latitudeSchema,
  longitudeSchema,
  postalCodeSchema,
} from '../primitives.js';

// ============================================================================
// CUSTOMER REGISTRATION SCHEMAS
// ============================================================================

/**
 * Customer registration
 *
 * Business Rules (from FEATURES.md CUS-001):
 * - Email must be unique per tenant
 * - Customer code auto-generated (CUST-00001)
 * - Email verification required before first order
 * - Welcome voucher ($5 off) issued on registration
 * - Loyalty account created automatically
 * - Starting tier: bronze
 *
 * @see FEATURES.md CUS-001 - "Customer registration with email verification"
 * @see FEATURES.md CUS-001 - "Auto-generated customer code"
 * @see FEATURES.md CUS-001 - "Welcome voucher issuance"
 *
 * @example
 * ```typescript
 * {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   phone: "+1234567890",
 *   password: "SecureP@ssw0rd",
 *   dateOfBirth: "1990-05-15"
 * }
 * ```
 */
export const customerRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: z.string().min(8).max(100), // Will be hashed
  dateOfBirth: dateInputSchema.optional(), // For birthday promotions
  photoUrl: z.string().url().optional(),
});

/**
 * Email verification
 *
 * Business Rules (from FEATURES.md CUS-001):
 * - Email verification required before first order
 * - Verification token expires in 24 hours
 *
 * @see FEATURES.md CUS-001 - "Email verification required before first order"
 */
export const emailVerificationSchema = z.object({
  customerId: uuidSchema,
  verificationToken: z.string().min(1).max(100),
});

/**
 * Customer login
 */
export const customerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(100),
});

export type CustomerRegister = z.infer<typeof customerRegisterSchema>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;
export type CustomerLogin = z.infer<typeof customerLoginSchema>;

// ============================================================================
// CUSTOMER PROFILE SCHEMAS
// ============================================================================

/**
 * Update customer profile
 *
 * Business Rules (from FEATURES.md CUS-001):
 * - Cannot change email (use separate endpoint for email change)
 * - Phone number updates allowed
 * - Photo updates allowed
 *
 * @see FEATURES.md CUS-001 - "Profile management (name, photo, phone)"
 */
export const customerProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  photoUrl: z.string().url().optional(),
  dateOfBirth: dateInputSchema.optional(),
  communicationPreferences: z.object({
    emailMarketing: z.boolean().optional(),
    smsMarketing: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
  }).optional(),
});

/**
 * Change customer email
 *
 * Requires verification of both old and new email.
 */
export const customerEmailChangeSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1).max(100), // Confirm identity
});

/**
 * Change customer password
 */
export const customerPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(8).max(100),
});

export type CustomerProfileUpdate = z.infer<typeof customerProfileUpdateSchema>;
export type CustomerEmailChange = z.infer<typeof customerEmailChangeSchema>;
export type CustomerPasswordChange = z.infer<typeof customerPasswordChangeSchema>;

// ============================================================================
// DELIVERY ADDRESS SCHEMAS
// ============================================================================

/**
 * Add delivery address
 *
 * Business Rules (from FEATURES.md CUS-001):
 * - Only one default address per customer
 * - GPS coordinates from mobile device or geocoded from address
 * - Address validation via Google Maps API
 *
 * @see FEATURES.md CUS-001 - "Multiple delivery address management"
 * @see FEATURES.md CUS-001 - "Default address designation"
 * @see FEATURES.md CUS-001 - "GPS coordinate capture"
 *
 * @example
 * ```typescript
 * {
 *   label: "Home",
 *   addressLine1: "123 Main St",
 *   addressLine2: "Apt 4B",
 *   city: "Singapore",
 *   postalCode: "123456",
 *   country: "Singapore",
 *   latitude: 1.234567,
 *   longitude: 103.123456,
 *   isDefault: true
 * }
 * ```
 */
export const customerAddressCreateSchema = z.object({
  label: z.string().max(50).optional(), // e.g., "Home", "Office"
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postalCode: postalCodeSchema,
  country: z.string().min(1).max(100).default('Singapore'),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  deliveryInstructions: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

/**
 * Update delivery address
 */
export const customerAddressUpdateSchema = customerAddressCreateSchema.partial();

export type CustomerAddressCreate = z.infer<typeof customerAddressCreateSchema>;
export type CustomerAddressUpdate = z.infer<typeof customerAddressUpdateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Customer query filters (admin/staff use)
 */
export const customerFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    email: z.string().optional(), // Search by email
    phone: z.string().optional(), // Search by phone
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
    loyaltyTier: z.enum(['bronze', 'silver', 'gold']).optional(),
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete Customer query schema
 */
export const customerQuerySchema = baseQuerySchema.merge(customerFiltersSchema);

export type CustomerFilters = z.infer<typeof customerFiltersSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Delivery address response
 */
export const addressDetailSchema = z.object({
  id: uuidSchema,
  customerId: uuidSchema,
  label: z.string().nullable(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  deliveryInstructions: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Customer profile detail schema
 *
 * @see FEATURES.md CUS-001 - Customer structure
 */
export const customerDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Auto-generated: CUST-00001
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  dateOfBirth: z.date().nullable(),

  // Status
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),

  // Communication preferences
  communicationPreferences: z.object({
    emailMarketing: z.boolean(),
    smsMarketing: z.boolean(),
    pushNotifications: z.boolean(),
  }).nullable(),

  // Loyalty info (summary)
  loyaltyAccount: z.object({
    id: uuidSchema,
    pointsBalance: z.string(),
    lifetimePoints: z.string(),
    tier: z.string(),
  }).nullable(),

  // Statistics
  totalOrders: z.number().int(),
  totalSpent: z.string(), // Money amount
  lastOrderDate: z.date().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  addresses: z.array(addressDetailSchema),
});

/**
 * Customer list item schema (without addresses)
 */
export const customerListItemSchema = customerDetailSchema.omit({
  addresses: true,
  communicationPreferences: true,
  metadata: true,
});

/**
 * Customer registration response
 *
 * Includes verification token for email verification.
 */
export const customerRegisterResponseSchema = successResponseSchema(
  z.object({
    customerId: uuidSchema,
    customerCode: z.string(),
    email: z.string(),
    verificationEmailSent: z.boolean(),
    welcomeVoucherIssued: z.boolean(),
    loyaltyAccountCreated: z.boolean(),
  })
);

/**
 * Customer profile response
 */
export const customerResponseSchema = successResponseSchema(customerDetailSchema);

/**
 * Customers paginated response
 */
export const customersResponseSchema = paginatedResponseSchema(customerListItemSchema);

/**
 * Address response
 */
export const addressResponseSchema = successResponseSchema(addressDetailSchema);

/**
 * Addresses list response
 */
export const addressesResponseSchema = successResponseSchema(
  z.object({
    addresses: z.array(addressDetailSchema),
    defaultAddressId: uuidSchema.nullable(),
  })
);

export type AddressDetail = z.infer<typeof addressDetailSchema>;
export type CustomerDetail = z.infer<typeof customerDetailSchema>;
export type CustomerListItem = z.infer<typeof customerListItemSchema>;
export type CustomerRegisterResponse = z.infer<typeof customerRegisterResponseSchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
export type CustomersResponse = z.infer<typeof customersResponseSchema>;
export type AddressResponse = z.infer<typeof addressResponseSchema>;
export type AddressesResponse = z.infer<typeof addressesResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate customer code
 *
 * Business Rule (from FEATURES.md CUS-001):
 * Auto-generated format: CUST-00001
 *
 * @param lastCode - Last used customer code (e.g., "CUST-00050")
 * @returns Next customer code (e.g., "CUST-00051")
 */
export function generateNextCustomerCode(lastCode: string): string {
  const match = lastCode.match(/^CUST-(\d+)$/);
  if (!match || !match[1]) return 'CUST-00001';

  const nextNumber = parseInt(match[1], 10) + 1;
  return `CUST-${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Validate password strength
 *
 * Business Rule: Password must be at least 8 characters
 * Recommended: Include uppercase, lowercase, number, special char
 *
 * @param password - Password to validate
 * @returns Validation result
 */
export function validatePasswordStrength(
  password: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password should include at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password should include at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password should include at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password should include at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if email is verified
 *
 * Business Rule (from FEATURES.md CUS-001):
 * Email verification required before first order
 *
 * @param isEmailVerified - Whether email is verified
 * @returns True if can place order
 */
export function canPlaceOrder(isEmailVerified: boolean): boolean {
  return isEmailVerified;
}

/**
 * Validate unique email per tenant
 *
 * Business Rule (from FEATURES.md CUS-001):
 * Email must be unique per tenant
 *
 * @param email - Email to validate
 * @param existingEmails - List of existing emails in tenant
 * @returns Validation result
 */
export function validateUniqueEmail(
  email: string,
  existingEmails: string[]
): { valid: boolean; error?: string } {
  if (existingEmails.includes(email.toLowerCase())) {
    return {
      valid: false,
      error: 'Email already registered',
    };
  }
  return { valid: true };
}

/**
 * Ensure only one default address
 *
 * Business Rule (from FEATURES.md CUS-001):
 * Only one default address per customer
 *
 * @param addresses - Customer's addresses
 * @param newDefaultId - ID of address to set as default
 * @returns Updated addresses with single default
 */
export function ensureSingleDefaultAddress(
  addresses: Array<{ id: string; isDefault: boolean }>,
  newDefaultId: string
): Array<{ id: string; isDefault: boolean }> {
  return addresses.map((addr) => ({
    ...addr,
    isDefault: addr.id === newDefaultId,
  }));
}

/**
 * Calculate customer lifetime value
 *
 * Business Rule: Total amount spent by customer
 *
 * @param orders - Customer's orders
 * @returns Total spent
 */
export function calculateLifetimeValue(
  orders: Array<{ totalAmount: number }>
): number {
  return orders.reduce((sum, order) => sum + order.totalAmount, 0);
}

/**
 * Determine customer segment
 *
 * Business Rule: Segment based on spending and frequency
 *
 * @param lifetimeValue - Total spent
 * @param orderCount - Number of orders
 * @param lastOrderDate - Date of last order
 * @returns Customer segment
 */
export function determineCustomerSegment(
  lifetimeValue: number,
  orderCount: number,
  lastOrderDate: Date | null
): 'vip' | 'regular' | 'new' | 'inactive' {
  const daysSinceLastOrder = lastOrderDate
    ? (new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  // Inactive: no order in 90 days
  if (daysSinceLastOrder > 90) return 'inactive';

  // VIP: high lifetime value and frequent orders
  if (lifetimeValue >= 1000 && orderCount >= 10) return 'vip';

  // New: less than 3 orders
  if (orderCount < 3) return 'new';

  // Regular: everything else
  return 'regular';
}

/**
 * Check if eligible for birthday promotion
 *
 * Business Rule (from FEATURES.md CUS-001):
 * Birthday recording for birthday promotions
 *
 * @param dateOfBirth - Customer's birthday
 * @param currentDate - Current date (defaults to now)
 * @returns True if birthday is within 7 days
 */
export function isEligibleForBirthdayPromotion(
  dateOfBirth: Date | null,
  currentDate: Date = new Date()
): boolean {
  if (!dateOfBirth) return false;

  const birthday = new Date(dateOfBirth);
  const currentYear = currentDate.getFullYear();

  // Set birthday to current year
  birthday.setFullYear(currentYear);

  // Calculate days until birthday
  const daysUntilBirthday = Math.ceil(
    (birthday.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Eligible if birthday is within 7 days (before or on birthday)
  return daysUntilBirthday >= 0 && daysUntilBirthday <= 7;
}

/**
 * Format customer display name
 *
 * Helper for UI display.
 *
 * @param name - Customer name
 * @param code - Customer code
 * @returns Formatted display name
 */
export function formatCustomerDisplayName(
  name: string,
  code: string
): string {
  return `${name} (${code})`;
}

/**
 * Validate postal code format
 *
 * Singapore postal code: 6 digits
 *
 * @param postalCode - Postal code to validate
 * @param country - Country code (default 'Singapore')
 * @returns Validation result
 */
export function validatePostalCode(
  postalCode: string,
  country: string = 'Singapore'
): { valid: boolean; error?: string } {
  if (country === 'Singapore') {
    if (!/^\d{6}$/.test(postalCode)) {
      return {
        valid: false,
        error: 'Singapore postal code must be 6 digits',
      };
    }
  }
  return { valid: true };
}
