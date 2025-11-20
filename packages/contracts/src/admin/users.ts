/**
 * User Management contracts for admin module
 *
 * Manages user accounts, roles, permissions, and multi-location access.
 * Integrates with Better Auth for authentication.
 *
 * CRITICAL: Multi-tenant isolation via tenant_id and RLS policies.
 *
 * Covers:
 * 1. User registration and authentication (AUTH-001)
 * 2. Multi-location access control (AUTH-002)
 * 3. Profile management (AUTH-003)
 *
 * @module @contracts/erp/admin/users
 * @see FEATURES.md Section 1 - Authentication & User Management
 * @see USER_STORIES.md Epic 1 - User Management
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
} from '../primitives.js';
import { userRoleSchema } from '../enums.js';

// ============================================================================
// USER REGISTRATION SCHEMAS
// ============================================================================

/**
 * User registration (Admin creates users)
 *
 * Business Rules (from FEATURES.md AUTH-001):
 * - Email must be unique per tenant
 * - Username must be unique per tenant
 * - Passwords handled by Better Auth
 * - Default role: staff
 * - Email verification required
 *
 * @see FEATURES.md AUTH-001 - "User registration with email verification"
 * @see FEATURES.md AUTH-001 - "Role-based access control"
 *
 * @example
 * ```typescript
 * {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   username: "johnd",
 *   phone: "+1234567890",
 *   role: "staff",
 *   locationIds: ["loc-1", "loc-2"]
 * }
 * ```
 */
export const userCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  username: z.string().min(3).max(50).optional(), // Auto-generated if not provided
  phone: phoneSchema.optional(),
  password: z.string().min(8).max(100), // Will be hashed by Better Auth
  role: userRoleSchema.default('staff'),
  photoUrl: z.string().url().optional(),
  locationIds: z.array(uuidSchema).optional(), // Locations user can access
  isActive: z.boolean().default(true),
});

/**
 * User login
 *
 * Business Rules:
 * - Can login with email or username
 * - Inactive users cannot login
 * - Session created on successful login
 */
export const userLoginSchema = z.object({
  emailOrUsername: z.string().min(1).max(100),
  password: z.string().min(1).max(100),
});

/**
 * Email verification
 */
export const userEmailVerificationSchema = z.object({
  userId: uuidSchema,
  verificationToken: z.string().min(1).max(100),
});

export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserEmailVerification = z.infer<typeof userEmailVerificationSchema>;

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

/**
 * Update user profile
 *
 * Business Rules (from FEATURES.md AUTH-003):
 * - Users can update their own profile
 * - Admins can update any user profile
 * - Cannot change email directly (requires verification)
 * - Cannot change role (requires admin)
 *
 * @see FEATURES.md AUTH-003 - "Profile viewing and editing"
 */
export const userProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  photoUrl: z.string().url().optional(),
  notificationPreferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
  }).optional(),
});

/**
 * Update user by admin
 *
 * Admins can change role and status.
 */
export const userAdminUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  photoUrl: z.string().url().optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  locationIds: z.array(uuidSchema).optional(),
});

/**
 * Change password
 */
export const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(8).max(100),
});

/**
 * Reset password (forgot password)
 */
export const userPasswordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Confirm password reset
 */
export const userPasswordResetConfirmSchema = z.object({
  resetToken: z.string().min(1).max(100),
  newPassword: z.string().min(8).max(100),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type UserAdminUpdate = z.infer<typeof userAdminUpdateSchema>;
export type UserPasswordChange = z.infer<typeof userPasswordChangeSchema>;
export type UserPasswordReset = z.infer<typeof userPasswordResetSchema>;
export type UserPasswordResetConfirm = z.infer<typeof userPasswordResetConfirmSchema>;

// ============================================================================
// MULTI-LOCATION ACCESS SCHEMAS
// ============================================================================

/**
 * Assign locations to user
 *
 * Business Rules (from FEATURES.md AUTH-002):
 * - Users can only access assigned locations
 * - System admins can access all locations
 * - RLS policies enforce location-based filtering
 *
 * @see FEATURES.md AUTH-002 - "Multi-location access control"
 */
export const userLocationAssignSchema = z.object({
  userId: uuidSchema,
  locationIds: z.array(uuidSchema).min(1), // At least one location
  replaceExisting: z.boolean().default(false), // true = replace, false = add
});

/**
 * Switch active location
 *
 * Business Rules:
 * - User must have access to the location
 * - Updates session context
 */
export const userLocationSwitchSchema = z.object({
  locationId: uuidSchema,
});

export type UserLocationAssign = z.infer<typeof userLocationAssignSchema>;
export type UserLocationSwitch = z.infer<typeof userLocationSwitchSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * User query filters (admin use)
 */
export const userFiltersSchema = z
  .object({
    name: z.string().optional(), // Search by name
    email: z.string().optional(), // Search by email
    username: z.string().optional(), // Search by username
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    locationId: uuidSchema.optional(), // Users with access to location
  })
  .merge(dateRangeFilterSchema);

/**
 * Complete User query schema
 */
export const userQuerySchema = baseQuerySchema.merge(userFiltersSchema);

export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Location access response
 */
export const userLocationAccessSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  locationType: z.string(),
  isActive: z.boolean(),
});

/**
 * User detail schema
 *
 * @see FEATURES.md AUTH-001 - User structure
 */
export const userDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  authUserId: z.string().nullable(), // Better Auth user ID
  name: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  phone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
  lastLoginAt: z.date().nullable(),

  // Notification preferences
  notificationPreferences: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    smsNotifications: z.boolean(),
  }).nullable(),

  // Location access
  locations: z.array(userLocationAccessSchema),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * User list item schema (without detailed relations)
 */
export const userListItemSchema = userDetailSchema.omit({
  locations: true,
  notificationPreferences: true,
});

/**
 * User session detail schema
 */
export const userSessionDetailSchema = z.object({
  id: z.string(),
  userId: uuidSchema,
  tenantId: uuidSchema,
  activeLocationId: uuidSchema.nullable(),
  expiresAt: z.date(),
  createdAt: z.date(),

  // User info
  user: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string(),
    role: z.string(),
    photoUrl: z.string().nullable(),
  }),

  // Active location info
  activeLocation: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    locationType: z.string(),
  }).nullable(),
});

/**
 * User registration response
 */
export const userRegisterResponseSchema = successResponseSchema(
  z.object({
    userId: uuidSchema,
    email: z.string(),
    username: z.string().nullable(),
    verificationEmailSent: z.boolean(),
  })
);

/**
 * User login response
 */
export const userLoginResponseSchema = successResponseSchema(
  z.object({
    sessionId: z.string(),
    userId: uuidSchema,
    tenantId: uuidSchema,
    role: z.string(),
    expiresAt: z.date(),
  })
);

/**
 * User profile response
 */
export const userResponseSchema = successResponseSchema(userDetailSchema);

/**
 * Users paginated response
 */
export const usersResponseSchema = paginatedResponseSchema(userListItemSchema);

/**
 * User session response
 */
export const userSessionResponseSchema = successResponseSchema(userSessionDetailSchema);

/**
 * User locations response
 */
export const userLocationsResponseSchema = successResponseSchema(
  z.object({
    userId: uuidSchema,
    locations: z.array(userLocationAccessSchema),
  })
);

export type UserLocationAccess = z.infer<typeof userLocationAccessSchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
export type UserListItem = z.infer<typeof userListItemSchema>;
export type UserSessionDetail = z.infer<typeof userSessionDetailSchema>;
export type UserRegisterResponse = z.infer<typeof userRegisterResponseSchema>;
export type UserLoginResponse = z.infer<typeof userLoginResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type UsersResponse = z.infer<typeof usersResponseSchema>;
export type UserSessionResponse = z.infer<typeof userSessionResponseSchema>;
export type UserLocationsResponse = z.infer<typeof userLocationsResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate username from name
 *
 * Business Rule: Auto-generate if not provided
 *
 * @param name - User's full name
 * @returns Generated username
 */
export function generateUsername(name: string): string {
  // Convert to lowercase, remove spaces, keep only alphanumeric
  const base = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  return base.substring(0, 20); // Max 20 chars
}

/**
 * Validate user password strength
 *
 * Business Rule: Min 8 characters, complexity requirements
 *
 * @param password - Password to validate
 * @returns Validation result
 */
export function validateUserPasswordStrength(
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
 * Validate unique user email per tenant
 *
 * Business Rule (from FEATURES.md AUTH-001):
 * Email must be unique per tenant
 *
 * @param email - Email to validate
 * @param existingEmails - List of existing emails in tenant
 * @returns Validation result
 */
export function validateUniqueUserEmail(
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
 * Validate unique username per tenant
 *
 * Business Rule (from FEATURES.md AUTH-001):
 * Username must be unique per tenant
 *
 * @param username - Username to validate
 * @param existingUsernames - List of existing usernames in tenant
 * @returns Validation result
 */
export function validateUniqueUsername(
  username: string,
  existingUsernames: string[]
): { valid: boolean; error?: string } {
  if (existingUsernames.includes(username.toLowerCase())) {
    return {
      valid: false,
      error: 'Username already taken',
    };
  }
  return { valid: true };
}

/**
 * Check if user can access location
 *
 * Business Rule (from FEATURES.md AUTH-002):
 * Users can only access assigned locations
 * System admins can access all locations
 *
 * @param userRole - User's role
 * @param userLocationIds - User's accessible location IDs
 * @param requestedLocationId - Location being accessed
 * @returns True if access allowed
 */
export function canAccessLocation(
  userRole: string,
  userLocationIds: string[],
  requestedLocationId: string
): boolean {
  // System admins can access all locations
  if (userRole === 'admin') return true;

  // Check if location in user's assigned locations
  return userLocationIds.includes(requestedLocationId);
}

/**
 * Check if user can perform action
 *
 * Business Rule: Role-based access control
 *
 * @param userRole - User's role
 * @param requiredRole - Required role for action
 * @returns True if action allowed
 */
export function canPerformAction(
  userRole: string,
  requiredRole: 'admin' | 'manager' | 'cashier' | 'staff'
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 4,
    manager: 3,
    cashier: 2,
    staff: 1,
  };

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/**
 * Determine user permissions
 *
 * Business Rule: Role-based permissions
 *
 * @param role - User's role
 * @returns User permissions
 */
export function getUserPermissions(role: string): {
  canManageUsers: boolean;
  canManageProducts: boolean;
  canApprovePurchaseOrders: boolean;
  canManageInventory: boolean;
  canProcessRefunds: boolean;
  canViewReports: boolean;
  canAccessAllLocations: boolean;
} {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageProducts: true,
        canApprovePurchaseOrders: true,
        canManageInventory: true,
        canProcessRefunds: true,
        canViewReports: true,
        canAccessAllLocations: true,
      };
    case 'manager':
      return {
        canManageUsers: false,
        canManageProducts: true,
        canApprovePurchaseOrders: true,
        canManageInventory: true,
        canProcessRefunds: true,
        canViewReports: true,
        canAccessAllLocations: false,
      };
    case 'cashier':
      return {
        canManageUsers: false,
        canManageProducts: false,
        canApprovePurchaseOrders: false,
        canManageInventory: false,
        canProcessRefunds: false,
        canViewReports: false,
        canAccessAllLocations: false,
      };
    case 'staff':
    default:
      return {
        canManageUsers: false,
        canManageProducts: false,
        canApprovePurchaseOrders: false,
        canManageInventory: false,
        canProcessRefunds: false,
        canViewReports: false,
        canAccessAllLocations: false,
      };
  }
}

/**
 * Format user display name
 *
 * Helper for UI display.
 *
 * @param name - User's name
 * @param role - User's role
 * @returns Formatted display name
 */
export function formatUserDisplayName(name: string, role: string): string {
  return `${name} (${role})`;
}

/**
 * Check if session is valid
 *
 * Business Rule: Sessions expire
 *
 * @param expiresAt - Session expiry date
 * @param currentDate - Current date (defaults to now)
 * @returns True if session valid
 */
export function isSessionValid(
  expiresAt: Date,
  currentDate: Date = new Date()
): boolean {
  return currentDate < expiresAt;
}

/**
 * Get session expiry duration
 *
 * Business Rule: Default session duration
 *
 * @returns Session duration in milliseconds
 */
export function getSessionDuration(): number {
  // Default: 7 days
  return 7 * 24 * 60 * 60 * 1000;
}

/**
 * Calculate session expiry date
 *
 * @param fromDate - Start date (defaults to now)
 * @returns Expiry date
 */
export function calculateSessionExpiry(fromDate: Date = new Date()): Date {
  const expiry = new Date(fromDate);
  expiry.setTime(expiry.getTime() + getSessionDuration());
  return expiry;
}
