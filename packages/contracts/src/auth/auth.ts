import { z } from 'zod';
import { userRoles } from '../enums.js';

// ============================================================================
// Authentication Schemas for Central Kitchen ERP
// ============================================================================

// ============================================================================
// Registration Schemas
// ============================================================================

export const registerInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes, and underscores')
    .optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const registerResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable(),
      username: z.string().nullable(),
      emailVerified: z.boolean(),
      createdAt: z.string(),
    }),
    session: z.object({
      token: z.string(),
      expiresAt: z.string(),
    }).nullable(),
  }),
  message: z.string(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

// ============================================================================
// Login Schemas
// ============================================================================

export const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginUsernameInputSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginUsernameInput = z.infer<typeof loginUsernameInputSchema>;

export const loginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable(),
      username: z.string().nullable(),
      emailVerified: z.boolean(),
      image: z.string().nullable(),
    }),
    session: z.object({
      token: z.string(),
      expiresAt: z.string(),
    }),
  }),
  message: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ============================================================================
// Session Schemas
// ============================================================================

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.enum(userRoles).nullable(),
  tenantId: z.string(),
  locationId: z.string().nullable(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: sessionUserSchema,
    session: z.object({
      id: z.string(),
      userId: z.string(),
      expiresAt: z.string(),
      createdAt: z.string(),
    }),
  }).nullable(),
  message: z.string(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

// ============================================================================
// Email Verification Schemas
// ============================================================================

export const verifyEmailInputSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const verifyEmailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    verified: z.boolean(),
  }).nullable(),
  message: z.string(),
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

export const resendVerificationInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;

// ============================================================================
// Password Reset Schemas
// ============================================================================

export const forgotPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
  }
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
  }
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// ============================================================================
// Logout Schema
// ============================================================================

export const logoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ============================================================================
// User Profile Schemas (used with /api/v1/auth/me)
// ============================================================================

export const userProfileSchema = z.object({
  id: z.string(),
  authUserId: z.string(),
  tenantId: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(userRoles).nullable(),
  locationId: z.string().nullable(),
  isActive: z.boolean(),
  lastLogin: z.string().nullable(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    orgId: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  location: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    country: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }).nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const userProfileResponseSchema = z.object({
  success: z.boolean(),
  data: userProfileSchema,
  message: z.string(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

// ============================================================================
// Location Switching Schemas (for AUTH-002)
// ============================================================================

export const switchLocationInputSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
});

export type SwitchLocationInput = z.infer<typeof switchLocationInputSchema>;

export const switchLocationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    locationId: z.string(),
    locationName: z.string(),
  }),
  message: z.string(),
});

export type SwitchLocationResponse = z.infer<typeof switchLocationResponseSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

export const authErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;
