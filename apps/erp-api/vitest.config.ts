import { defineConfig } from 'vitest/config';
import { config as loadEnv } from 'dotenv';

// Load .env.test file
loadEnv({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 20000,
    setupFiles: ['./tests/integration/test-setup.ts'],
    env: {
      // Fallback values if .env.test is missing
      NODE_ENV: process.env.NODE_ENV || 'test',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp-test',
      BYPASS_AUTH_FOR_TESTS: process.env.BYPASS_AUTH_FOR_TESTS || 'true',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-for-testing',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'test-better-auth-secret-min-32-chars',
    },
    reporter: ['default', 'json', 'verbose'],
    outputFile: {
      json: './docs/test-report-detailed.json',
    },
    verbose: true,
    bail: false,
    watch: false,
    logHeapUsage: true,
    isolate: false,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@contracts': new URL('../../packages/contracts/src', import.meta.url).pathname,
    },
  },
});