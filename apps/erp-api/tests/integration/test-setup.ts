import { beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from '../../src/config/schema';
import { build } from '../../src/app';
import type { FastifyInstance } from 'fastify';

const { Pool } = pg;

// Test database connection
const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp-test';

let pool: pg.Pool;
let db: ReturnType<typeof drizzle>;
let app: FastifyInstance;

// Test user context (using valid UUIDs v4 format)
export const testTenantId = '10000000-0000-4000-8000-000000000001';
export const testUserId = '10000000-0000-4000-8000-000000000002';
export const testLocationId = '10000000-0000-4000-8000-000000000003';

export interface TestContext {
  db: typeof db;
  tenantId: string;
  userId: string;
  locationId: string;
}

beforeAll(async () => {
  // Create connection pool
  pool = new Pool({
    connectionString: TEST_DB_URL,
  });

  // Initialize drizzle
  db = drizzle(pool, { schema });

  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });

  // Seed test tenant, user, and location
  await seedTestData();

  // Build Fastify app
  app = await build();
  await app.ready();
});

afterAll(async () => {
  // Clean up
  if (app) {
    await app.close();
  }
  await pool.end();
});

beforeEach(async () => {
  // Clean transactional data before each test
  await cleanTransactionalData();
});

async function seedTestData() {
  // Insert test tenant
  await pool.query(`
    INSERT INTO erp.tenants (id, org_id, name, slug, is_active)
    VALUES ($1, 'test-org', 'Test Organization', 'test-org', true)
    ON CONFLICT (id) DO NOTHING
  `, [testTenantId]);

  // Insert test location
  await pool.query(`
    INSERT INTO erp.locations (id, tenant_id, code, name, type, is_active)
    VALUES ($1, $2, 'LOC-001', 'Test Location', 'central_kitchen', true)
    ON CONFLICT (id) DO NOTHING
  `, [testLocationId, testTenantId]);

  // Insert test user
  await pool.query(`
    INSERT INTO erp.users (id, tenant_id, auth_user_id, email, first_name, last_name, role, is_active)
    VALUES ($1, $2, 'test-auth-user', 'test@example.com', 'Test', 'User', 'admin', true)
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET id = $1, auth_user_id = 'test-auth-user', first_name = 'Test', last_name = 'User', role = 'admin', is_active = true
  `, [testUserId, testTenantId]);

  // Insert base UOMs (using valid UUIDs v4 format)
  await pool.query(`
    INSERT INTO erp.uoms (id, tenant_id, code, name, uom_type, is_active)
    VALUES
      ('10000000-0000-4000-8000-000000000010', $1, 'EA', 'Each', 'count', true),
      ('10000000-0000-4000-8000-000000000011', $1, 'KG', 'Kilogram', 'weight', true),
      ('10000000-0000-4000-8000-000000000012', $1, 'L', 'Liter', 'volume', true)
    ON CONFLICT (id) DO NOTHING
  `, [testTenantId]);
}

async function cleanTransactionalData() {
  // Delete transactional data in correct order (respecting FK constraints)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM erp.stock_ledger WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.cost_layer_consumptions');
    await client.query('DELETE FROM erp.cost_layers WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.order_items WHERE order_id IN (SELECT id FROM erp.orders WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.orders WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM erp.goods_receipts WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.goods_receipts WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.purchase_order_items WHERE purchase_order_id IN (SELECT id FROM erp.purchase_orders WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.purchase_orders WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.transfer_items WHERE transfer_id IN (SELECT id FROM erp.transfers WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.transfers WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.requisition_items WHERE requisition_id IN (SELECT id FROM erp.requisitions WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.requisitions WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.stock_adjustment_items WHERE adjustment_id IN (SELECT id FROM erp.stock_adjustments WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.stock_adjustments WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.stock_count_lines WHERE count_id IN (SELECT id FROM erp.stock_counts WHERE tenant_id = $1)', [testTenantId]);
    await client.query('DELETE FROM erp.stock_counts WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.production_orders WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.lots WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.suppliers WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.products WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM erp.locations WHERE tenant_id = $1 AND id != $2', [testTenantId, testLocationId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export function getTestContext(): TestContext {
  return {
    db,
    tenantId: testTenantId,
    userId: testUserId,
    locationId: testLocationId,
  };
}

export function getApp(): FastifyInstance {
  return app;
}

// Helper to create test API request
export function createTestRequest(method: string, path: string, body?: any) {
  return {
    method,
    url: path,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': testTenantId,
      'x-user-id': testUserId,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}
