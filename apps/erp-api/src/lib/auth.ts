import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  // Database adapter (uses existing Drizzle instance)
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true, // Maps 'user' to 'users' table
  }),

  // Base URL for auth endpoints
  // Now that API is proxied through frontend, use the frontend URL
  baseURL: process.env.BETTER_AUTH_URL ||
    (process.env.NODE_ENV === 'production'
      ? "https://erp.personalapp.id/api"
      : "http://localhost:8000"),

  // Secret for JWT signing
  secret: process.env.BETTER_AUTH_SECRET!,

  // Enable email/password auth (required for username plugin)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // No email verification
    password: {
      // Use bcrypt for password hashing (compatible with existing hashes)
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },

  // Username plugin configuration
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      // Allow alphanumeric, underscores, dots (default validator)
    }),
  ],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    cookieOptions: {
      // Now using same-domain proxy, so we can use more secure settings
      domain: process.env.COOKIE_DOMAIN || undefined, // Let browser use current domain
      sameSite: "lax", // Secure same-site setting (was "none" for cross-origin)
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  },

  // Trust the frontend origin
  trustedOrigins: [
    "http://localhost:3000", // Frontend dev
    process.env.FRONTEND_URL || "https://erp.personalapp.id",
  ],

  // Advanced options
  advanced: {
    generateId: () => crypto.randomUUID(), // Use UUID for consistency
    // Force cookie attributes to override better-auth defaults
    cookiePrefix: process.env.NODE_ENV === 'production' ? "__Secure-better-auth" : "better-auth",
    sessionCookie: {
      name: "session_token",
      attributes: {
        sameSite: "lax", // Secure same-site setting (was "none" for cross-origin)
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        domain: process.env.COOKIE_DOMAIN || undefined, // Let browser use current domain
        path: "/",
      },
    },
  },
});

// Export type-safe auth instance
export type Auth = typeof auth;
