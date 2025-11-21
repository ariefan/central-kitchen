import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 20000,
    setupFiles: ['./tests/integration/test-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/erp-test',
      BYPASS_AUTH_FOR_TESTS: 'true',
      JWT_SECRET: 'test-jwt-secret-min-32-chars-for-testing',
      JWT_EXPIRES_IN: '24h',
      LOG_LEVEL: 'error',
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