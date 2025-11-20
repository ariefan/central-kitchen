/**
 * Integration Tests: INV-001 - Real-Time Inventory Visibility
 *
 * Tests database views and functions for inventory tracking:
 * - v_inventory_onhand: Real-time on-hand inventory aggregation
 * - v_lot_balances: Lot-level inventory with expiry tracking
 * - v_fefo_pick: FEFO picking recommendations
 * - get_mavg_cost: Moving average cost calculation
 * - trg_prevent_negative_stock: Negative stock prevention
 *
 * @see apps/erp-api/drizzle/0005_inventory_views.sql
 * @see FEATURES.md INV-001 - Real-Time Inventory Visibility
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/config/database.js';
import {
  tenants,
  products,
  locations,
  uoms,
  lots,
  stockLedger,
  costLayers,
} from '@/config/schema.js';
import { eq, sql } from 'drizzle-orm';

// ============================================================================
// TEST DATA
// ============================================================================

let testTenantId: string;
let testLocationId: string;
let testProductId: string;
let testKgUomId: string;
let testLot1Id: string;
let testLot2Id: string;

// Use fixed UUID for createdBy fields (not testing auth)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Setup test data with stock transactions
 */
beforeAll(async () => {
  // Create tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      orgId: `org-inv-views-${Date.now()}`,
      name: 'Inventory Views Test Tenant',
      slug: `test-inv-views-${Date.now()}`,
    })
    .returning();
  testTenantId = tenant.id;

  // Create location
  const [location] = await db
    .insert(locations)
    .values({
      tenantId: testTenantId,
      code: 'WH-INV-TEST',
      name: 'Inventory Test Warehouse',
      type: 'warehouse',
    })
    .returning();
  testLocationId = location.id;

  // Create UOM
  const [uom] = await db
    .insert(uoms)
    .values({
      tenantId: testTenantId,
      code: 'KG',
      name: 'Kilogram',
      uomType: 'weight',
    })
    .returning();
  testKgUomId = uom.id;

  // Create product
  const [product] = await db
    .insert(products)
    .values({
      tenantId: testTenantId,
      sku: `SKU-INV-TEST-${Date.now()}`,
      name: 'Test Product for Inventory Views',
      kind: 'raw_material',
      baseUomId: testKgUomId,
      isPerishable: true,
      standardCost: '10.00',
      defaultPrice: '15.00',
    })
    .returning();
  testProductId = product.id;

  // Create lot 1 - expires in 5 days
  const expiryDate1 = new Date();
  expiryDate1.setDate(expiryDate1.getDate() + 5);
  const [lot1] = await db
    .insert(lots)
    .values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotNo: `LOT-${Date.now()}-1`,
      expiryDate: expiryDate1,
      manufactureDate: new Date(),
      receivedDate: new Date(),
    })
    .returning();
  testLot1Id = lot1.id;

  // Create lot 2 - expires in 25 days (within 30 days)
  const expiryDate2 = new Date();
  expiryDate2.setDate(expiryDate2.getDate() + 25);
  const [lot2] = await db
    .insert(lots)
    .values({
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotNo: `LOT-${Date.now()}-2`,
      expiryDate: expiryDate2,
      manufactureDate: new Date(),
      receivedDate: new Date(),
    })
    .returning();
  testLot2Id = lot2.id;

  // Add stock for lot 1: +50 kg at $8/kg
  await db.insert(stockLedger).values({
    tenantId: testTenantId,
    productId: testProductId,
    locationId: testLocationId,
    lotId: testLot1Id,
    type: 'rcv',
    qtyDeltaBase: 50,
    unitCost: '8.00',
    refType: 'goods_receipt',
    refId: TEST_USER_ID, // Using userId as ref for testing
    createdBy: TEST_USER_ID,
  });

  // Add stock for lot 2: +100 kg at $10/kg
  await db.insert(stockLedger).values({
    tenantId: testTenantId,
    productId: testProductId,
    locationId: testLocationId,
    lotId: testLot2Id,
    type: 'rcv',
    qtyDeltaBase: 100,
    unitCost: '10.00',
    refType: 'goods_receipt',
    refId: TEST_USER_ID,
    createdBy: TEST_USER_ID,
  });

  // Consume from lot 1: -20 kg
  await db.insert(stockLedger).values({
    tenantId: testTenantId,
    productId: testProductId,
    locationId: testLocationId,
    lotId: testLot1Id,
    type: 'ship',
    qtyDeltaBase: -20,
    unitCost: '8.00',
    refType: 'order',
    refId: TEST_USER_ID,
    createdBy: TEST_USER_ID,
  });

  // Add cost layers
  await db.insert(costLayers).values([
    {
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotId: testLot1Id,
      qtyRemainingBase: 30, // 50 - 20 consumed
      unitCost: '8.00',
      sourceType: 'goods_receipt',
      sourceId: TEST_USER_ID,
    },
    {
      tenantId: testTenantId,
      productId: testProductId,
      locationId: testLocationId,
      lotId: testLot2Id,
      qtyRemainingBase: 100,
      unitCost: '10.00',
      sourceType: 'goods_receipt',
      sourceId: TEST_USER_ID,
    },
  ]);
});

/**
 * Cleanup test data
 */
afterAll(async () => {
  // Delete in reverse order of dependencies
  await db.delete(costLayers).where(eq(costLayers.tenantId, testTenantId));
  await db.delete(stockLedger).where(eq(stockLedger.tenantId, testTenantId));
  await db.delete(lots).where(eq(lots.tenantId, testTenantId));
  await db.delete(products).where(eq(products.tenantId, testTenantId));
  await db.delete(locations).where(eq(locations.tenantId, testTenantId));
  await db.delete(tenants).where(eq(tenants.id, testTenantId));
});

// ============================================================================
// VIEW TESTS
// ============================================================================

describe('INV-001: Inventory Views', () => {
  // ==========================================================================
  // VIEW: v_inventory_onhand
  // ==========================================================================
  describe('v_inventory_onhand', () => {
    it('should aggregate on-hand inventory by product and location', async () => {
      const result = await db.execute(sql`
        SELECT
          product_id,
          location_id,
          quantity_on_hand,
          stock_status,
          lot_count
        FROM erp.v_inventory_onhand
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
          AND location_id = ${testLocationId}
      `);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0] as any;

      // Verify quantities: Lot1 (50-20=30) + Lot2 (100) = 130
      expect(Number(row.quantity_on_hand)).toBe(130);

      // Verify lot count
      expect(Number(row.lot_count)).toBe(2);

      // Verify stock status
      expect(row.stock_status).toBe('in_stock');
    });

    it('should calculate total inventory value', async () => {
      const result = await db.execute(sql`
        SELECT
          quantity_on_hand,
          latest_unit_cost,
          total_value
        FROM erp.v_inventory_onhand
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
      `);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0] as any;

      // Latest cost should be from most recent cost layer (lot 2 at $10/kg)
      expect(Number(row.latest_unit_cost)).toBe(10);

      // Total value = 130 kg × $10/kg = $1300
      expect(Number(row.total_value)).toBe(1300);
    });

    it('should include product and location details', async () => {
      const result = await db.execute(sql`
        SELECT
          product_sku,
          product_name,
          product_kind,
          is_perishable,
          location_code,
          location_name,
          uom_code
        FROM erp.v_inventory_onhand
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
      `);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0] as any;

      expect(row.product_name).toBe('Test Product for Inventory Views');
      expect(row.product_kind).toBe('raw_material');
      expect(row.is_perishable).toBe(true);
      expect(row.location_code).toBe('WH-INV-TEST');
      expect(row.uom_code).toBe('KG');
    });

    it('should not show products with zero inventory', async () => {
      // Consume all remaining stock
      await db.insert(stockLedger).values([
        {
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot1Id,
          type: 'ship',
          qtyDeltaBase: -30,
          unitCost: '8.00',
          refType: 'order',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        },
        {
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot2Id,
          type: 'ship',
          qtyDeltaBase: -100,
          unitCost: '10.00',
          refType: 'order',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        },
      ]);

      const result = await db.execute(sql`
        SELECT * FROM erp.v_inventory_onhand
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
      `);

      // Should not show product with zero inventory
      expect(result.rows).toHaveLength(0);

      // Restore stock for other tests
      await db.insert(stockLedger).values([
        {
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot1Id,
          type: 'adj',
          qtyDeltaBase: 30,
          unitCost: '8.00',
          refType: 'adjustment',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        },
        {
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot2Id,
          type: 'adj',
          qtyDeltaBase: 100,
          unitCost: '10.00',
          refType: 'adjustment',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        },
      ]);
    });
  });

  // ==========================================================================
  // VIEW: v_lot_balances
  // ==========================================================================
  describe('v_lot_balances', () => {
    it('should show lot-level inventory balances', async () => {
      const result = await db.execute(sql`
        SELECT
          lot_id,
          lot_no,
          quantity_on_hand,
          expiry_status,
          days_to_expiry
        FROM erp.v_lot_balances
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
        ORDER BY expiry_date ASC
      `);

      expect(result.rows).toHaveLength(2);

      // Lot 1: 30 kg remaining (50 - 20 consumed)
      const lot1 = result.rows[0] as any;
      expect(lot1.lot_id).toBe(testLot1Id);
      expect(Number(lot1.quantity_on_hand)).toBe(30);
      expect(lot1.expiry_status).toBe('expiring_soon'); // Expires in 5 days
      // days_to_expiry is an interval, convert to days
      const lot1Days = typeof lot1.days_to_expiry === 'number'
        ? lot1.days_to_expiry
        : parseInt(String(lot1.days_to_expiry).split(' ')[0]) || 0;
      expect(lot1Days).toBeGreaterThan(0);
      expect(lot1Days).toBeLessThanOrEqual(6);

      // Lot 2: 100 kg remaining
      const lot2 = result.rows[1] as any;
      expect(lot2.lot_id).toBe(testLot2Id);
      expect(Number(lot2.quantity_on_hand)).toBe(100);
      expect(lot2.expiry_status).toBe('expiring_this_month'); // Expires in 30 days
      const lot2Days = typeof lot2.days_to_expiry === 'number'
        ? lot2.days_to_expiry
        : parseInt(String(lot2.days_to_expiry).split(' ')[0]) || 0;
      expect(lot2Days).toBeGreaterThan(0);
      expect(lot2Days).toBeLessThanOrEqual(31);
    });

    it('should calculate days to expiry correctly', async () => {
      const result = await db.execute(sql`
        SELECT
          lot_no,
          expiry_date,
          days_to_expiry,
          expiry_status
        FROM erp.v_lot_balances
        WHERE tenant_id = ${testTenantId}
          AND lot_id = ${testLot1Id}
      `);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0] as any;

      // Days to expiry should be positive and less than or equal to 5
      const daysToExpiry = typeof row.days_to_expiry === 'number'
        ? row.days_to_expiry
        : parseInt(String(row.days_to_expiry).split(' ')[0]) || 0;
      expect(daysToExpiry).toBeGreaterThan(0);
      expect(daysToExpiry).toBeLessThanOrEqual(6);
      expect(row.expiry_status).toBe('expiring_soon');
    });

    it('should show lot unit cost from FIFO cost layer', async () => {
      const result = await db.execute(sql`
        SELECT
          lot_id,
          lot_unit_cost
        FROM erp.v_lot_balances
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
        ORDER BY expiry_date ASC
      `);

      // Lot 1 cost should be $8/kg
      const lot1 = result.rows[0] as any;
      expect(Number(lot1.lot_unit_cost)).toBe(8);

      // Lot 2 cost should be $10/kg
      const lot2 = result.rows[1] as any;
      expect(Number(lot2.lot_unit_cost)).toBe(10);
    });

    it('should only show lots with positive balance', async () => {
      const result = await db.execute(sql`
        SELECT * FROM erp.v_lot_balances
        WHERE tenant_id = ${testTenantId}
          AND quantity_on_hand <= 0
      `);

      // No lots with zero or negative balance should be shown
      expect(result.rows).toHaveLength(0);
    });
  });

  // ==========================================================================
  // VIEW: v_fefo_pick
  // ==========================================================================
  describe('v_fefo_pick', () => {
    it('should prioritize lots by expiry date (FEFO)', async () => {
      const result = await db.execute(sql`
        SELECT
          lot_id,
          lot_no,
          pick_priority,
          expiry_status,
          days_to_expiry
        FROM erp.v_fefo_pick
        WHERE tenant_id = ${testTenantId}
          AND product_id = ${testProductId}
        ORDER BY pick_priority ASC
      `);

      expect(result.rows).toHaveLength(2);

      // First priority: Lot 1 (expires in 5 days)
      const firstPick = result.rows[0] as any;
      expect(firstPick.lot_id).toBe(testLot1Id);
      expect(Number(firstPick.pick_priority)).toBe(1);

      // Second priority: Lot 2 (expires in 30 days)
      const secondPick = result.rows[1] as any;
      expect(secondPick.lot_id).toBe(testLot2Id);
      expect(Number(secondPick.pick_priority)).toBe(2);
    });

    it('should not recommend expired lots', async () => {
      // Create expired lot
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      const [expiredLot] = await db
        .insert(lots)
        .values({
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotNo: `LOT-EXPIRED-${Date.now()}`,
          expiryDate: expiredDate,
          manufactureDate: new Date(),
          receivedDate: new Date(),
        })
        .returning();

      // Add stock to expired lot
      await db.insert(stockLedger).values({
        tenantId: testTenantId,
        productId: testProductId,
        locationId: testLocationId,
        lotId: expiredLot.id,
        type: 'rcv',
        qtyDeltaBase: 10,
        unitCost: '7.00',
        refType: 'goods_receipt',
        refId: TEST_USER_ID,
        createdBy: TEST_USER_ID,
      });

      const result = await db.execute(sql`
        SELECT * FROM erp.v_fefo_pick
        WHERE tenant_id = ${testTenantId}
          AND lot_id = ${expiredLot.id}
      `);

      // Expired lot should not be in pick recommendations
      expect(result.rows).toHaveLength(0);

      // Cleanup
      await db.delete(stockLedger).where(eq(stockLedger.lotId, expiredLot.id));
      await db.delete(lots).where(eq(lots.id, expiredLot.id));
    });
  });

  // ==========================================================================
  // FUNCTION: get_mavg_cost
  // ==========================================================================
  describe('get_mavg_cost function', () => {
    it('should calculate moving average cost correctly', async () => {
      const result = await db.execute(sql`
        SELECT erp.get_mavg_cost(
          ${testTenantId}::uuid,
          ${testProductId}::uuid,
          ${testLocationId}::uuid
        ) AS mavg_cost
      `);

      const mavgCost = Number((result.rows[0] as any).mavg_cost);

      // MAVG cost = (30kg × $8/kg + 100kg × $10/kg) / (30kg + 100kg)
      // = ($240 + $1000) / 130 = $1240 / 130 = $9.5385
      expect(mavgCost).toBeCloseTo(9.5385, 4);
    });

    it('should return standard cost if no cost layers exist', async () => {
      // Create product without cost layers
      const [newProduct] = await db
        .insert(products)
        .values({
          tenantId: testTenantId,
          sku: `SKU-NO-COST-${Date.now()}`,
          name: 'Product Without Cost Layers',
          kind: 'finished_good',
          baseUomId: testKgUomId,
          standardCost: '12.50',
          defaultPrice: '20.00',
        })
        .returning();

      const result = await db.execute(sql`
        SELECT erp.get_mavg_cost(
          ${testTenantId}::uuid,
          ${newProduct.id}::uuid,
          ${testLocationId}::uuid
        ) AS mavg_cost
      `);

      const mavgCost = Number((result.rows[0] as any).mavg_cost);

      // Should return standard cost
      expect(mavgCost).toBe(12.5);

      // Cleanup
      await db.delete(products).where(eq(products.id, newProduct.id));
    });
  });

  // ==========================================================================
  // TRIGGER: trg_prevent_negative_stock
  // ==========================================================================
  describe('trg_prevent_negative_stock trigger', () => {
    it('should prevent negative inventory', async () => {
      // Try to consume more than available (30 kg available in lot 1)
      try {
        await db.insert(stockLedger).values({
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot1Id,
          type: 'ship',
          qtyDeltaBase: -50, // More than 30 available
          unitCost: '8.00',
          refType: 'order',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        });
        // Should not reach here
        expect.fail('Should have thrown an error for insufficient stock');
      } catch (error: any) {
        // Should throw error with insufficient stock message
        // Error message is in the cause for Drizzle errors
        const errorMsg = error.cause?.message || error.message;
        expect(errorMsg).toContain('Insufficient stock');
      }
    });

    it('should allow positive inventory changes', async () => {
      // This should succeed
      await expect(
        db.insert(stockLedger).values({
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot1Id,
          type: 'rcv',
          qtyDeltaBase: 10,
          unitCost: '8.00',
          refType: 'goods_receipt',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        })
      ).resolves.not.toThrow();
    });

    it('should allow consuming exactly available quantity', async () => {
      // Get current balance for lot 1
      const result = await db.execute(sql`
        SELECT quantity_on_hand FROM erp.v_lot_balances
        WHERE lot_id = ${testLot1Id}
      `);
      const currentQty = Number((result.rows[0] as any).quantity_on_hand);

      // This should succeed
      await expect(
        db.insert(stockLedger).values({
          tenantId: testTenantId,
          productId: testProductId,
          locationId: testLocationId,
          lotId: testLot1Id,
          type: 'ship',
          qtyDeltaBase: -currentQty,
          unitCost: '8.00',
          refType: 'order',
          refId: TEST_USER_ID,
          createdBy: TEST_USER_ID,
        })
      ).resolves.not.toThrow();

      // Restore for other tests
      await db.insert(stockLedger).values({
        tenantId: testTenantId,
        productId: testProductId,
        locationId: testLocationId,
        lotId: testLot1Id,
        type: 'adj',
        qtyDeltaBase: currentQty,
        unitCost: '8.00',
        refType: 'adjustment',
        refId: TEST_USER_ID,
        createdBy: TEST_USER_ID,
      });
    });
  });
});
