import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

import { randomUUID } from "crypto";

export const auth = betterAuth({
  // Database adapter (uses existing Drizzle instance)
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true, // Maps 'user' to 'users' table
  }),

  // Base URL for auth endpoints (frontend URL for cookie domain)
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://erp.personalapp.id"
      : "http://localhost:8000"),

  // Trust proxy headers for proper URL detection behind reverse proxy
  trustedProxyHeaders: ["x-forwarded-host", "x-forwarded-proto"],

  // Mount path for auth routes (frontend proxies /api/auth/* to /auth/*)
  basePath: "/auth",

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
      secure: process.env.NODE_ENV === "production",
    },
  },

  // Trust the frontend origin
  trustedOrigins: [
    "http://localhost:3000", // Frontend dev
    process.env.FRONTEND_URL || "https://erp.personalapp.id",
  ],

  // Advanced options
  advanced: {
    generateId: () => randomUUID(), // Use UUID for consistency
    // Cookie prefix (Better Auth adds __Secure- automatically when secure=true)
    cookiePrefix: "better-auth",
  },
});

// Export type-safe auth instance
export type Auth = typeof auth;
