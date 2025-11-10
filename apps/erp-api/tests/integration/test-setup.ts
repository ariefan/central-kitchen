import { config as loadEnv } from 'dotenv';

// Load test environment variables with override FIRST
loadEnv({ path: '.env', override: false });
loadEnv({ path: '.env.test', override: true });

// Force test database URL for all tests
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/erp-api'; // Use development database temporarily

// Import app AFTER setting environment variables
let build;
try {
  build = (await import('../../src/app')).build;
} catch (error) {
  // Fallback for different import patterns
  build = (await import('../../src/app.js')).build;
}

let app: any;

export async function getTestApp() {
  if (!app) {
    console.log('Building test app with DATABASE_URL:', process.env.DATABASE_URL);
    app = await build();
    await app.ready();
  }
  return app;
}

export async function closeTestApp() {
  if (app) {
    await app.close();
    app = null;
  }
}