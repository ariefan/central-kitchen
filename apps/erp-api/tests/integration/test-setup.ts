import { beforeAll, afterAll, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import * as schema from '../../src/config/schema.test';
import { build } from '../../src/app';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

// Test database (in-memory SQLite)
let SQL: any;
let sqlite: Database;
let db: any;
let app: FastifyInstance;

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
  // Initialize sql.js
  SQL = await initSqlJs();
  sqlite = new SQL.Database();

  // Create mock db object that matches expected interface
  db = {
    run: (sql: string, params?: any[]) => {
      sqlite.run(sql, params);
    },
    exec: (sql: string) => {
      sqlite.exec(sql);
    },
    prepare: (sql: string) => {
      const stmt = sqlite.prepare(sql);
      return {
        run: (...params: any[]) => stmt.run(params),
        get: (...params: any[]) => stmt.getAsObject(params),
        all: (...params: any[]) => {
          const results = [];
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.reset();
          return results;
        },
      };
    },
  };

  // Create all tables
  await createTables();

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
  if (sqlite) {
    sqlite.close();
  }
});

beforeEach(async () => {
  // Clean transactional data before each test
  await cleanTransactionalData();
});

async function createTables() {
  // Create tables in correct order (respecting FK constraints)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(org_id, slug)
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT,
      phone TEXT,
      email TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, code)
    );

    CREATE INDEX idx_location_type ON locations(type);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      auth_user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      role TEXT,
      location_id TEXT REFERENCES locations(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login INTEGER,
      metadata TEXT,
      username TEXT UNIQUE,
      display_username TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, email)
    );

    CREATE INDEX idx_user_auth ON users(auth_user_id);

    CREATE TABLE IF NOT EXISTS uoms (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      uom_type TEXT NOT NULL,
      symbol TEXT,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL,
      base_uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      tax_category TEXT,
      standard_cost TEXT,
      default_price TEXT,
      is_perishable INTEGER NOT NULL DEFAULT 0,
      shelf_life_days INTEGER,
      barcode TEXT,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, sku)
    );

    CREATE INDEX idx_product_kind ON products(kind);
    CREATE INDEX idx_product_name ON products(name);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      tax_id TEXT,
      payment_terms INTEGER,
      credit_limit TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, code)
    );

    CREATE INDEX idx_supplier_name ON suppliers(name);

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      order_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expected_delivery_date INTEGER,
      actual_delivery_date INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      subtotal TEXT NOT NULL DEFAULT '0',
      tax_amount TEXT NOT NULL DEFAULT '0',
      shipping_cost TEXT NOT NULL DEFAULT '0',
      discount TEXT NOT NULL DEFAULT '0',
      total_amount TEXT NOT NULL DEFAULT '0',
      payment_terms INTEGER,
      notes TEXT,
      created_by TEXT,
      approved_by TEXT,
      approved_at INTEGER,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, order_number)
    );

    CREATE INDEX idx_po_status ON purchase_orders(status);

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity TEXT NOT NULL,
      uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      unit_price TEXT NOT NULL,
      discount TEXT NOT NULL DEFAULT '0',
      tax_rate TEXT NOT NULL DEFAULT '0',
      line_total TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_poi_po ON purchase_order_items(purchase_order_id);

    CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      lot_no TEXT,
      expiry_date INTEGER,
      manufacture_date INTEGER,
      received_date INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, product_id, location_id, lot_no)
    );

    CREATE INDEX idx_lot_prod_loc_exp ON lots(product_id, location_id, expiry_date);

    CREATE TABLE IF NOT EXISTS goods_receipts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL,
      purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      receipt_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      received_by TEXT,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, receipt_number)
    );

    CREATE INDEX idx_gr_po ON goods_receipts(purchase_order_id);

    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id TEXT PRIMARY KEY,
      goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
      purchase_order_item_id TEXT REFERENCES purchase_order_items(id) ON DELETE SET NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      quantity_ordered TEXT,
      quantity_received TEXT NOT NULL,
      uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      unit_cost TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_gri_gr ON goods_receipt_items(goods_receipt_id);

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      txn_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      type TEXT NOT NULL,
      qty_delta_base TEXT NOT NULL,
      unit_cost TEXT,
      ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      note TEXT,
      created_by TEXT,
      metadata TEXT
    );

    CREATE INDEX idx_ledger_prod_loc_ts ON stock_ledger(product_id, location_id, txn_ts);
    CREATE INDEX idx_ledger_ref ON stock_ledger(ref_type, ref_id);
    CREATE INDEX idx_ledger_tenant ON stock_ledger(tenant_id);
    CREATE INDEX idx_ledger_lot ON stock_ledger(lot_id);

    CREATE TABLE IF NOT EXISTS cost_layers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      qty_remaining_base TEXT NOT NULL,
      unit_cost TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_cost_layer_key ON cost_layers(tenant_id, product_id, location_id, lot_id);

    CREATE TABLE IF NOT EXISTS cost_layer_consumptions (
      id TEXT PRIMARY KEY,
      layer_id TEXT NOT NULL REFERENCES cost_layers(id) ON DELETE CASCADE,
      ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      qty_out_base TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_cost_layer_cons ON cost_layer_consumptions(layer_id);

    CREATE TABLE IF NOT EXISTS requisitions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      req_number TEXT NOT NULL,
      from_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      to_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'draft',
      requested_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      required_date INTEGER,
      issued_date INTEGER,
      delivered_date INTEGER,
      requested_by TEXT,
      approved_by TEXT,
      approved_at INTEGER,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, req_number)
    );

    CREATE INDEX idx_req_status ON requisitions(status);

    CREATE TABLE IF NOT EXISTS requisition_items (
      id TEXT PRIMARY KEY,
      requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      qty_requested TEXT NOT NULL,
      qty_issued TEXT NOT NULL DEFAULT '0',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_req_items_req ON requisition_items(requisition_id);

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      transfer_number TEXT NOT NULL,
      from_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      to_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      transfer_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expected_delivery_date INTEGER,
      actual_delivery_date INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      requested_by TEXT,
      approved_by TEXT,
      approved_at INTEGER,
      sent_by TEXT,
      sent_at INTEGER,
      received_by TEXT,
      received_at INTEGER,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, transfer_number)
    );

    CREATE INDEX idx_xfer_status ON transfers(status);

    CREATE TABLE IF NOT EXISTS transfer_items (
      id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      quantity TEXT NOT NULL,
      qty_received TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_xfer_items ON transfer_items(transfer_id);

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      adj_number TEXT NOT NULL,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_by TEXT,
      approved_by TEXT,
      approved_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, adj_number)
    );

    CREATE TABLE IF NOT EXISTS stock_adjustment_items (
      id TEXT PRIMARY KEY,
      adjustment_id TEXT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      uom_id TEXT NOT NULL REFERENCES uoms(id) ON DELETE RESTRICT,
      qty_delta TEXT NOT NULL,
      unit_cost TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_adj_items ON stock_adjustment_items(adjustment_id);

    CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      count_number TEXT NOT NULL,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, count_number)
    );

    CREATE TABLE IF NOT EXISTS stock_count_lines (
      id TEXT PRIMARY KEY,
      count_id TEXT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
      system_qty_base TEXT NOT NULL,
      counted_qty_base TEXT NOT NULL,
      variance_qty_base TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_count_lines ON stock_count_lines(count_id);

    CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_number TEXT NOT NULL,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      planned_qty_base TEXT NOT NULL,
      produced_qty_base TEXT NOT NULL DEFAULT '0',
      scheduled_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      notes TEXT,
      created_by TEXT,
      supervised_by TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, order_number)
    );

    CREATE INDEX idx_prod_status ON production_orders(status);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_number TEXT NOT NULL,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      customer_id TEXT,
      device_id TEXT,
      channel TEXT NOT NULL DEFAULT 'pos',
      type TEXT NOT NULL DEFAULT 'take_away',
      status TEXT NOT NULL DEFAULT 'open',
      kitchen_status TEXT NOT NULL DEFAULT 'open',
      table_no TEXT,
      address_id TEXT,
      subtotal TEXT NOT NULL DEFAULT '0',
      tax_amount TEXT NOT NULL DEFAULT '0',
      discount_amount TEXT NOT NULL DEFAULT '0',
      svc_amount TEXT NOT NULL DEFAULT '0',
      tips_amount TEXT NOT NULL DEFAULT '0',
      voucher_amount TEXT NOT NULL DEFAULT '0',
      total_amount TEXT NOT NULL DEFAULT '0',
      created_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(tenant_id, order_number)
    );

    CREATE INDEX idx_order_status ON orders(status);
    CREATE INDEX idx_order_kitchen_status ON orders(kitchen_status);

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      variant_id TEXT,
      lot_id TEXT,
      uom_id TEXT,
      quantity TEXT NOT NULL,
      unit_price TEXT NOT NULL,
      tax_amount TEXT NOT NULL DEFAULT '0',
      discount_amount TEXT NOT NULL DEFAULT '0',
      line_total TEXT NOT NULL,
      prep_status TEXT NOT NULL DEFAULT 'queued',
      station TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX idx_order_items ON order_items(order_id);
    CREATE INDEX idx_order_items_prep_status ON order_items(prep_status);
  `);
}

async function seedTestData() {
  // Insert test tenant
  sqlite.run(`
    INSERT OR IGNORE INTO tenants (id, org_id, name, slug, is_active)
    VALUES (?, 'test-org', 'Test Organization', 'test-org', 1)
  `, [testTenantId]);

  // Insert test location
  sqlite.run(`
    INSERT OR IGNORE INTO locations (id, tenant_id, code, name, type, is_active)
    VALUES (?, ?, 'LOC-001', 'Test Location', 'central_kitchen', 1)
  `, [testLocationId, testTenantId]);

  // Insert test user
  sqlite.run(`
    INSERT OR REPLACE INTO users (id, tenant_id, auth_user_id, email, first_name, last_name, role, is_active)
    VALUES (?, ?, 'test-auth-user', 'test@example.com', 'Test', 'User', 'admin', 1)
  `, [testUserId, testTenantId]);

  // Insert base UOMs
  sqlite.run(`
    INSERT OR IGNORE INTO uoms (id, tenant_id, code, name, uom_type, is_active)
    VALUES
      ('00000000-0000-0000-0000-000000000010', ?, 'EA', 'Each', 'count', 1),
      ('00000000-0000-0000-0000-000000000011', ?, 'KG', 'Kilogram', 'weight', 1),
      ('00000000-0000-0000-0000-000000000012', ?, 'L', 'Liter', 'volume', 1)
  `, [testTenantId, testTenantId, testTenantId]);
}

async function cleanTransactionalData() {
  // Delete transactional data in correct order (respecting FK constraints)
  // Only delete from tables that have tenant_id directly
  // Child tables will be cleaned via CASCADE DELETE
  const tables = [
    'orders',           // Will cascade to order_items
    'stock_ledger',
    'cost_layers',      // Will cascade to cost_layer_consumptions
    'goods_receipts',   // Will cascade to goods_receipt_items
    'purchase_orders',  // Will cascade to purchase_order_items
    'transfers',        // Will cascade to transfer_items
    'requisitions',     // Will cascade to requisition_items
    'stock_adjustments', // Will cascade to stock_adjustment_items
    'stock_counts',     // Will cascade to stock_count_lines
    'production_orders',
    'lots',
    'suppliers',
    'products',
  ];

  for (const table of tables) {
    sqlite.run(`DELETE FROM ${table} WHERE tenant_id = ?`, [testTenantId]);
  }

  // Also clean locations except test location
  sqlite.run(`DELETE FROM locations WHERE tenant_id = ? AND id != ?`, [testTenantId, testLocationId]);
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
