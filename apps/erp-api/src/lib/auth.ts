import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
  // Database adapter (uses existing Drizzle instance)
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true, // Maps 'user' to 'users' table
  }),

  // Base URL for auth endpoints
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8000',

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
      domain: process.env.COOKIE_DOMAIN || '.personalapp.id', // Allow cookies across subdomains
      sameSite: 'none',
      httpOnly: true,
      secure: true,
    },
  },

  // Trust the frontend origin
  trustedOrigins: [
    'http://localhost:3000', // Frontend dev
    process.env.FRONTEND_URL || 'https://erp.personalapp.id',
  ],

  // Advanced options
  advanced: {
    generateId: () => crypto.randomUUID(), // Use UUID for consistency
  },
});

// Export type-safe auth instance
export type Auth = typeof auth;
