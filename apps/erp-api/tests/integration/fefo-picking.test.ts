/**
 * FEFO Picking Integration Tests
 *
 * Tests for INV-002: FEFO Picking for Perishables
 * Tests the API endpoints that leverage v_fefo_pick view for optimal lot picking
 *
 * Endpoints tested:
 * - GET /api/v1/inventory/fefo/recommendations
 * - POST /api/v1/inventory/fefo/allocate
 *
 * @see drizzle/0005_inventory_views.sql - v_fefo_pick view
 * @group integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getTestApp, closeTestApp, createTestData } from './test-setup.js';
import { db } from '../../src/config/database.js';
import { products, locations, uoms, lots, stockLedger, tenants } from '../../src/config/schema.js';

describe('FEFO Picking Integration Tests (INV-002)', () => {
  let app: any;
  let authToken: string;
  let testTenantId: string;
  let testProductId: string;
  let testLocationId: string;
  let testUomId: string;
  let testLot1Id: string; // Expires in 5 days
  let testLot2Id: string; // Expires in 25 days
  let testLot3Id: string; // Expires in 60 days

  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Use shared test app with real authentication
    app = await getTestApp();
    await createTestData();

    // Sign in with admin user
    const signinRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/username',
      payload: {
        username: 'admin',
        password: 'admin123',
      },
    });

    expect(signinRes.statusCode).toBe(200);

    // Extract session cookie
    const cookies = signinRes.headers['set-cookie'];
    const sessionCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('better-auth'))
      : cookies;
    authToken = sessionCookie || '';

    // Get test tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.name, 'Test Tenant')
    });
    expect(tenant).toBeDefined();
    testTenantId = tenant!.id;

    // Get existing KG UOM from test setup
    const kgUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'KG')
    });
    expect(kgUom).toBeDefined();
    testUomId = kgUom!.id;

    // Get test location
    const location = await db.query.locations.findFirst({
      where: eq(locations.code, 'TEST-LOC')
    });
    expect(location).toBeDefined();
    testLocationId = location!.id;

    // Create test product (perishable)
    const [product] = await db.insert(products).values({
      tenantId: testTenantId,
      sku: 'FRESH-MILK-FEFO',
      name: 'Fresh Milk (FEFO Test)',
      kind: 'raw_material',
      baseUomId: testUomId,
      isPerishable: true,
      standardCost: '5.00',
      isActive: true,
    }).returning();
    testProductId = product.id;

    // Create lots with different expiry dates
    // Lot 1: Expires in 5 days (expiring_soon)
    const expiryDate1 = new Date();
    expiryDate1.setDate(expiryDate1.getDate() + 5);
    const [lot1] = await db.insert(lots).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotNo: 'FEFO-LOT-001',
      expiryDate: expiryDate1,
      receivedDate: new Date(),
    }).returning();
    testLot1Id = lot1.id;

    // Lot 2: Expires in 25 days (expiring_this_month)
    const expiryDate2 = new Date();
    expiryDate2.setDate(expiryDate2.getDate() + 25);
    const [lot2] = await db.insert(lots).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotNo: 'FEFO-LOT-002',
      expiryDate: expiryDate2,
      receivedDate: new Date(),
    }).returning();
    testLot2Id = lot2.id;

    // Lot 3: Expires in 60 days (good)
    const expiryDate3 = new Date();
    expiryDate3.setDate(expiryDate3.getDate() + 60);
    const [lot3] = await db.insert(lots).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotNo: 'FEFO-LOT-003',
      expiryDate: expiryDate3,
      receivedDate: new Date(),
    }).returning();
    testLot3Id = lot3.id;

    // Add stock to each lot
    // Lot 1: 30 units
    await db.insert(stockLedger).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotId: testLot1Id,
      type: 'rcv',
      qtyDeltaBase: '30',
      unitCost: '5.00',
      refType: 'GR',
      refId: TEST_USER_ID,
      createdBy: TEST_USER_ID,
    });

    // Lot 2: 50 units
    await db.insert(stockLedger).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotId: testLot2Id,
      type: 'rcv',
      qtyDeltaBase: '50',
      unitCost: '5.20',
      refType: 'GR',
      refId: TEST_USER_ID,
      createdBy: TEST_USER_ID,
    });

    // Lot 3: 100 units
    await db.insert(stockLedger).values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotId: testLot3Id,
      type: 'rcv',
      qtyDeltaBase: '100',
      unitCost: '5.50',
      refType: 'GR',
      refId: TEST_USER_ID,
      createdBy: TEST_USER_ID,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(stockLedger).where(eq(stockLedger.productId, testProductId));
    await db.delete(lots).where(eq(lots.productId, testProductId));
    await db.delete(products).where(eq(products.id, testProductId));
    await closeTestApp();
  });

  describe('GET /api/v1/inventory/fefo/recommendations', () => {
    it('should return FEFO recommendations ordered by expiry date', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory/fefo/recommendations',
        query: {
          productId: testProductId,
          locationId: testLocationId,
        },
        headers: {
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const { recommendations, totalAvailable } = body.data;

      // Should have 3 lots
      expect(recommendations).toHaveLength(3);

      // Should be ordered by expiry (FEFO): FEFO-LOT-001, FEFO-LOT-002, FEFO-LOT-003
      expect(recommendations[0].lotNo).toBe('FEFO-LOT-001');
      expect(recommendations[0].pickPriority).toBe(1);
      expect(recommendations[0].expiryStatus).toBe('expiring_soon');

      expect(recommendations[1].lotNo).toBe('FEFO-LOT-002');
      expect(recommendations[1].pickPriority).toBe(2);
      expect(recommendations[1].expiryStatus).toBe('expiring_this_month');

      expect(recommendations[2].lotNo).toBe('FEFO-LOT-003');
      expect(recommendations[2].pickPriority).toBe(3);
      expect(recommendations[2].expiryStatus).toBe('good');

      // Total should be 180 (30 + 50 + 100)
      expect(totalAvailable).toBe(180);
    });

    it('should show quantity needed analysis when specified', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory/fefo/recommendations',
        query: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: '60',
        },
        headers: {
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Should indicate sufficient stock and lots required
      expect(body.data.quantityNeeded).toBe(60);
      expect(body.data.sufficientStock).toBe(true);
      expect(body.data.lotsRequired).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory/fefo/recommendations',
        query: {
          productId: '00000000-0000-0000-0000-000000000099',
          locationId: testLocationId,
        },
        headers: {
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/inventory/fefo/allocate', () => {
    it('should allocate from earliest expiry lot first (FEFO)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/fefo/allocate',
        payload: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: 20,
          refType: 'ORDER',
          refId: TEST_USER_ID,
          allowPartial: true,
          reserveOnly: true, // Don't consume stock for this test
        },
        headers: {
          'content-type': 'application/json',
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      const { allocations, quantityAllocated, fullyAllocated } = body.data;

      // Should allocate from FEFO-LOT-001 first (earliest expiry)
      expect(allocations).toHaveLength(1);
      expect(allocations[0].lotNo).toBe('FEFO-LOT-001');
      expect(allocations[0].quantityAllocated).toBe(20);
      expect(quantityAllocated).toBe(20);
      expect(fullyAllocated).toBe(true);
    });

    it('should allocate across multiple lots when needed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/fefo/allocate',
        payload: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: 60, // More than lot1 (30), will need lot2
          refType: 'ORDER',
          refId: TEST_USER_ID,
          allowPartial: true,
          reserveOnly: true,
        },
        headers: {
          'content-type': 'application/json',
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const { allocations, quantityAllocated, fullyAllocated } = body.data;

      // Should allocate from 2 lots
      expect(allocations).toHaveLength(2);

      // First allocation: FEFO-LOT-001 (30 units)
      expect(allocations[0].lotNo).toBe('FEFO-LOT-001');
      expect(allocations[0].quantityAllocated).toBe(30);

      // Second allocation: FEFO-LOT-002 (30 units)
      expect(allocations[1].lotNo).toBe('FEFO-LOT-002');
      expect(allocations[1].quantityAllocated).toBe(30);

      expect(quantityAllocated).toBe(60);
      expect(fullyAllocated).toBe(true);
    });

    it('should create stock ledger entries when reserveOnly=false', async () => {
      // Get current stock count
      const beforeCount = await db.select()
        .from(stockLedger)
        .where(eq(stockLedger.productId, testProductId));
      const beforeLength = beforeCount.length;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/fefo/allocate',
        payload: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: 10,
          refType: 'ORDER',
          refId: TEST_USER_ID,
          allowPartial: true,
          reserveOnly: false, // Should create ledger entries
        },
        headers: {
          'content-type': 'application/json',
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);

      // Should have created new stock ledger entry
      const afterCount = await db.select()
        .from(stockLedger)
        .where(eq(stockLedger.productId, testProductId));
      expect(afterCount.length).toBe(beforeLength + 1);

      // The new entry should be an issue (negative quantity)
      const newEntry = afterCount[afterCount.length - 1];
      expect(Number(newEntry!.qtyDeltaBase)).toBeLessThan(0);
      expect(newEntry!.type).toBe('iss');
    });

    it('should handle partial allocation when allowPartial=true', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/fefo/allocate',
        payload: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: 300, // More than available (should be ~170 after previous test)
          refType: 'ORDER',
          refId: TEST_USER_ID,
          allowPartial: true,
          reserveOnly: true,
        },
        headers: {
          'content-type': 'application/json',
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const { quantityAllocated, fullyAllocated } = body.data;

      // Should allocate whatever is available
      expect(quantityAllocated).toBeLessThan(300);
      expect(fullyAllocated).toBe(false);
    });

    it('should reject allocation when stock insufficient and allowPartial=false', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/fefo/allocate',
        payload: {
          productId: testProductId,
          locationId: testLocationId,
          quantityNeeded: 1000, // Way more than available
          refType: 'ORDER',
          refId: TEST_USER_ID,
          allowPartial: false, // Strict mode
          reserveOnly: true,
        },
        headers: {
          'content-type': 'application/json',
          cookie: authToken,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Insufficient stock');
    });
  });

  describe('FEFO Integration with Database Views', () => {
    it('should correctly query v_fefo_pick view directly', async () => {
      // Direct database query to verify view works
      const viewResults = await db.execute(sql`
        SELECT
          lot_no,
          quantity_on_hand,
          expiry_status,
          pick_priority
        FROM erp.v_fefo_pick
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
          AND location_id = ${testLocationId}
        ORDER BY pick_priority ASC
      `);

      expect(viewResults.rows.length).toBeGreaterThan(0);

      // First row should be earliest expiry
      const firstPick = viewResults.rows[0] as any;
      expect(Number(firstPick.pick_priority)).toBe(1);
      expect(['expiring_soon', 'expiring_this_month', 'good']).toContain(firstPick.expiry_status);
    });

    it('should reflect real-time stock changes in view', async () => {
      // Query view before stock change
      const before = await db.execute(sql`
        SELECT SUM(quantity_on_hand::numeric) as total
        FROM erp.v_fefo_pick
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
          AND location_id = ${testLocationId}
      `);

      const beforeTotal = Number((before.rows[0] as any).total);

      // Add more stock to lot1
      await db.insert(stockLedger).values({
        tenantId: testTenantId,
        productId: testProductId,
        locationId: testLocationId,
        lotId: testLot1Id,
        type: 'rcv',
        qtyDeltaBase: '25',
        unitCost: '5.00',
        refType: 'GR',
        refId: TEST_USER_ID,
        createdBy: TEST_USER_ID,
      });

      // Query view after stock change
      const after = await db.execute(sql`
        SELECT SUM(quantity_on_hand::numeric) as total
        FROM erp.v_fefo_pick
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
          AND location_id = ${testLocationId}
      `);

      const afterTotal = Number((after.rows[0] as any).total);

      // Should reflect the 25 unit increase
      expect(afterTotal).toBe(beforeTotal + 25);
    });
  });
});
