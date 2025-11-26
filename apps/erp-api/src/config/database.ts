import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Create a connection pool with erp schema in search path
// This ensures Better Auth tables (sessions, users, etc.) use the erp schema
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Set search_path to erp schema for all connections
pool.on('connect', (client) => {
  client.query('SET search_path TO erp, public');
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export for potential direct pool access
export { pool };

// Graceful shutdown
process.on('beforeExit', () => {
  void pool.end();
});