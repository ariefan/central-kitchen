import { beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from '../../src/db/schema';

const { Pool } = pg;

// Test database connection
const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp-test';

let pool: pg.Pool;
let db: ReturnType<typeof drizzle>;

// Test user context
export const testTenantId = '00000000-0000-0000-0000-000000000001';
export const testUserId = '00000000-0000-0000-0000-000000000002';
export const testLocationId = '00000000-0000-0000-0000-000000000003';

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
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  // Seed test tenant, user, and location
  await seedTestData();
});

afterAll(async () => {
  // Clean up
  await pool.end();
});

beforeEach(async () => {
  // Clean transactional data before each test
  await cleanTransactionalData();
});

async function seedTestData() {
  // Insert test tenant
  await pool.query(`
    INSERT INTO tenants (id, org_id, name, slug, is_active)
    VALUES ($1, 'test-org', 'Test Organization', 'test-org', true)
    ON CONFLICT (id) DO NOTHING
  `, [testTenantId]);

  // Insert test location
  await pool.query(`
    INSERT INTO locations (id, tenant_id, code, name, type, is_active)
    VALUES ($1, $2, 'LOC-001', 'Test Location', 'central_kitchen', true)
    ON CONFLICT (id) DO NOTHING
  `, [testLocationId, testTenantId]);

  // Insert test user
  await pool.query(`
    INSERT INTO users (id, tenant_id, auth_user_id, email, first_name, last_name, role, is_active)
    VALUES ($1, $2, 'test-auth-user', 'test@example.com', 'Test', 'User', 'admin', true)
    ON CONFLICT (id) DO NOTHING
  `, [testUserId, testTenantId]);

  // Insert base UOMs
  await pool.query(`
    INSERT INTO uoms (id, tenant_id, code, name, uom_type, is_active)
    VALUES
      ('00000000-0000-0000-0000-000000000010', $1, 'EA', 'Each', 'count', true),
      ('00000000-0000-0000-0000-000000000011', $1, 'KG', 'Kilogram', 'weight', true),
      ('00000000-0000-0000-0000-000000000012', $1, 'L', 'Liter', 'volume', true)
    ON CONFLICT (id) DO NOTHING
  `, [testTenantId]);
}

async function cleanTransactionalData() {
  // Delete transactional data in correct order (respecting FK constraints)
  await pool.query(`
    DELETE FROM stock_ledger WHERE tenant_id = $1;
    DELETE FROM cost_layer_consumptions;
    DELETE FROM cost_layers WHERE tenant_id = $1;
    DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = $1);
    DELETE FROM orders WHERE tenant_id = $1;
    DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE tenant_id = $1);
    DELETE FROM goods_receipts WHERE tenant_id = $1;
    DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE tenant_id = $1);
    DELETE FROM purchase_orders WHERE tenant_id = $1;
    DELETE FROM transfer_items WHERE transfer_id IN (SELECT id FROM transfers WHERE tenant_id = $1);
    DELETE FROM transfers WHERE tenant_id = $1;
    DELETE FROM requisition_items WHERE requisition_id IN (SELECT id FROM requisitions WHERE tenant_id = $1);
    DELETE FROM requisitions WHERE tenant_id = $1;
    DELETE FROM stock_adjustment_items WHERE adjustment_id IN (SELECT id FROM stock_adjustments WHERE tenant_id = $1);
    DELETE FROM stock_adjustments WHERE tenant_id = $1;
    DELETE FROM stock_count_lines WHERE count_id IN (SELECT id FROM stock_counts WHERE tenant_id = $1);
    DELETE FROM stock_counts WHERE tenant_id = $1;
    DELETE FROM production_orders WHERE tenant_id = $1;
    DELETE FROM lots WHERE tenant_id = $1;
  `, [testTenantId]);
}

export function getTestContext(): TestContext {
  return {
    db,
    tenantId: testTenantId,
    userId: testUserId,
    locationId: testLocationId,
  };
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
