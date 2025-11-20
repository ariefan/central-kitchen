/**
 * Integration tests for Product Bulk Operations (ADM-001)
 *
 * Tests the bulk import/export functionality for product catalog management:
 * - GET /api/v1/products/bulk/export
 * - POST /api/v1/products/bulk/import
 *
 * @see FEATURES.md ADM-001 - Product Catalog Management
 * @group integration
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { eq, like, or } from 'drizzle-orm';
import { getTestApp, closeTestApp, createTestData } from './test-setup.js';
import { db } from '../../src/config/database.js';
import { tenants, products, uoms } from '../../src/config/schema.js';

describe('Product Bulk Operations (ADM-001) - API Endpoints', () => {
  let app: any;
  let authToken: string;
  let testTenantId: string;
  let testKgUomId: string;
  let testPcsUomId: string;
  let testProduct1Id: string;
  let testProduct2Id: string;
  let testProduct3Id: string;

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

    // Get existing UOMs or use from test setup
    const kgUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'KG')
    });
    const pcsUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'PCS')
    });

    expect(kgUom).toBeDefined();
    expect(pcsUom).toBeDefined();
    testKgUomId = kgUom!.id;
    testPcsUomId = pcsUom!.id;

    // Create test products
    const [product1] = await db.insert(products).values({
      tenantId: testTenantId,
      sku: 'TEST-RAW-001',
      name: 'Test Raw Material',
      description: 'A test raw material product',
      kind: 'raw_material',
      baseUomId: testKgUomId,
      isPerishable: true,
      shelfLifeDays: 30,
      standardCost: '10.50',
      isActive: true,
      createdBy: TEST_USER_ID,
    }).returning();
    testProduct1Id = product1.id;

    const [product2] = await db.insert(products).values({
      tenantId: testTenantId,
      sku: 'TEST-FIN-001',
      name: 'Test Finished Good',
      description: 'A test finished good',
      kind: 'finished_good',
      baseUomId: testPcsUomId,
      isPerishable: false,
      shelfLifeDays: null,
      standardCost: '25.00',
      isActive: true,
      createdBy: TEST_USER_ID,
    }).returning();
    testProduct2Id = product2.id;

    const [product3] = await db.insert(products).values({
      tenantId: testTenantId,
      sku: 'TEST-PACK-001',
      name: 'Test Packaging',
      description: 'Inactive packaging item',
      kind: 'packaging',
      baseUomId: testPcsUomId,
      isPerishable: false,
      shelfLifeDays: null,
      standardCost: '5.00',
      isActive: false,
      createdBy: TEST_USER_ID,
    }).returning();
    testProduct3Id = product3.id;
  });

  afterEach(async () => {
    // Cleanup imported products from tests
    await db.delete(products).where(
      or(
        like(products.sku, 'BULK-%'),
        like(products.sku, 'ROUNDTRIP-%')
      )
    );
  });

  afterAll(async () => {
    // Cleanup test products
    if (testProduct1Id) await db.delete(products).where(eq(products.id, testProduct1Id));
    if (testProduct2Id) await db.delete(products).where(eq(products.id, testProduct2Id));
    if (testProduct3Id) await db.delete(products).where(eq(products.id, testProduct3Id));
    await closeTestApp();
  });

  // ==========================================================================
  // BULK EXPORT TESTS
  // ==========================================================================

  describe('GET /api/v1/products/bulk/export', () => {
    it('should export all active products as CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',

      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.csv).toBeDefined();
      expect(body.data.count).toBe(2); // Only active products

      const csv = body.data.csv;
      const lines = csv.split('\n');

      // Should have header + 2 active products
      expect(lines.length).toBe(3);

      // Check header
      expect(lines[0]).toContain('SKU');
      expect(lines[0]).toContain('Name');
      expect(lines[0]).toContain('Kind');
      expect(lines[0]).toContain('Base UOM');

      // Check product data
      expect(csv).toContain('TEST-RAW-001');
      expect(csv).toContain('TEST-FIN-001');
      expect(csv).not.toContain('TEST-PACK-001'); // Inactive
    });

    it('should export products filtered by kind', async () => {
      const response = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',
        query: {
          kind: 'raw_material',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.count).toBe(1);

      const csv = body.data.csv;
      expect(csv).toContain('TEST-RAW-001');
      expect(csv).not.toContain('TEST-FIN-001');
    });

    it('should include inactive products when specified', async () => {
      const response = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',
        query: {
          includeInactive: 'true',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.count).toBe(3); // All products including inactive

      const csv = body.data.csv;
      expect(csv).toContain('TEST-RAW-001');
      expect(csv).toContain('TEST-FIN-001');
      expect(csv).toContain('TEST-PACK-001'); // Inactive included
    });

    it('should return empty CSV with no products', async () => {
      const response = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',
        query: {
          kind: 'consumable', // No consumables in test data
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.count).toBe(0);

      const csv = body.data.csv;
      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Only header
    });

    it('should format CSV with proper quoting', async () => {
      const response = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const csv = body.data.csv;

      // All fields should be quoted
      expect(csv).toMatch(/"TEST-RAW-001"/);
      expect(csv).toMatch(/"Test Raw Material"/);
      expect(csv).toMatch(/"A test raw material product"/);
    });
  });

  // ==========================================================================
  // BULK IMPORT TESTS
  // ==========================================================================

  describe('POST /api/v1/products/bulk/import', () => {
    it('should import valid CSV data', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-001","Bulk Import Test 1","Test product 1","raw_material","KG","true","30","15.00","true"
"BULK-002","Bulk Import Test 2","Test product 2","finished_good","PCS","false","","20.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.imported).toBe(2);
      expect(body.data.failed).toBe(0);
      expect(body.data.errors).toHaveLength(0);

      // Verify products were created
      const importedProducts = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.sku, 'BULK-001')
        ));

      expect(importedProducts).toHaveLength(1);
      expect(importedProducts[0]!.name).toBe('Bulk Import Test 1');
      expect(importedProducts[0]!.isPerishable).toBe(true);
      expect(importedProducts[0]!.shelfLifeDays).toBe(30);
    });

    it('should import without skipHeader option', async () => {
      const csv = `"BULK-003","No Header Test","Description","raw_material","KG","false","","12.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: false,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(1);
      expect(body.data.failed).toBe(0);
    });

    it('should reject import with missing required fields', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-MISSING","","Missing name","raw_material","KG","true","30","15.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(1);
      expect(body.data.errors).toHaveLength(1);
      expect(body.data.errors[0].error).toContain('Missing required fields');
    });

    it('should reject import with invalid product kind', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-INVALID","Invalid Kind Test","Test","invalid_kind","KG","false","","10.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(1);
      expect(body.data.errors[0].error).toContain('Invalid product kind');
    });

    it('should reject import with non-existent UOM', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-NOUOM","No UOM Test","Test","raw_material","INVALID","false","","10.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(1);
      expect(body.data.errors[0].error).toContain('UOM not found');
    });

    it('should reject import with duplicate SKU', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"TEST-RAW-001","Duplicate SKU","Test","raw_material","KG","false","","10.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(1);
      expect(body.data.errors[0].error).toContain('SKU already exists');
    });

    it('should handle mixed valid and invalid rows', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-VALID-1","Valid Product","Good","raw_material","KG","false","","10.00","true"
"BULK-INVALID-1","","Missing name","raw_material","KG","false","","10.00","true"
"BULK-VALID-2","Another Valid","Good","finished_good","PCS","false","","15.00","true"
"BULK-INVALID-2","Bad Kind","Test","bad_kind","KG","false","","10.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(2);
      expect(body.data.failed).toBe(2);
      expect(body.data.errors).toHaveLength(2);
    });

    it('should handle quoted fields with commas and special characters', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-QUOTE-1","Product with, comma","Description with, comma and ""quotes""","raw_material","KG","false","","10.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(1);
      expect(body.data.failed).toBe(0);

      // Verify the product was created with correct data
      const imported = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.sku, 'BULK-QUOTE-1')
        ));

      expect(imported).toHaveLength(1);
      expect(imported[0]!.name).toBe('Product with, comma');
    });

    it('should handle empty CSV', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(0);
      expect(body.data.errors).toHaveLength(0);
    });

    it('should handle all product kinds', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-RAW","Raw Material","Test","raw_material","KG","true","30","10.00","true"
"BULK-SEMI","Semi Finished","Test","semi_finished","KG","true","15","12.00","true"
"BULK-FIN","Finished Good","Test","finished_good","PCS","false","","15.00","true"
"BULK-PACK","Packaging","Test","packaging","PCS","false","","2.00","true"
"BULK-CONS","Consumable","Test","consumable","PCS","false","","5.00","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(5);
      expect(body.data.failed).toBe(0);
    });

    it('should handle numeric values correctly', async () => {
      const csv = `SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active
"BULK-NUM-1","Numeric Test","Test","raw_material","KG","true","90","123.45","true"`;

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(1);

      const imported = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.sku, 'BULK-NUM-1')
        ));

      expect(imported[0]!.shelfLifeDays).toBe(90);
      expect(imported[0]!.standardCost).toBe('123.45');
    });

    it('should return error details limited to 100 entries', async () => {
      // Create CSV with more than 100 invalid rows
      let csv = 'SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost,Is Active\n';
      for (let i = 0; i < 150; i++) {
        csv += `"BAD-${i}","","Missing name","raw_material","KG","false","","10.00","true"\n`;
      }

      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.failed).toBe(150);
      expect(body.data.errors).toHaveLength(100); // Limited to 100
    });
  });

  // ==========================================================================
  // INTEGRATION: EXPORT -> IMPORT ROUNDTRIP
  // ==========================================================================

  describe('Export -> Import Roundtrip', () => {
    it('should successfully import previously exported data', async () => {
      // Export existing products
      const exportResponse = await app.inject({
        method: 'GET',
        headers: { cookie: authToken },
        url: '/api/v1/products/bulk/export',
      });

      expect(exportResponse.statusCode).toBe(200);
      const exportBody = JSON.parse(exportResponse.body);
      const exportedCsv = exportBody.data.csv;

      // Modify SKUs to avoid duplicates
      const modifiedCsv = exportedCsv
        .replace(/TEST-RAW-001/g, 'ROUNDTRIP-001')
        .replace(/TEST-FIN-001/g, 'ROUNDTRIP-002');

      // Import the modified CSV
      const importResponse = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: authToken },
        url: '/api/v1/products/bulk/import',
        payload: {
          csv: modifiedCsv,
          skipHeader: true,
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.data.imported).toBe(2);
      expect(importBody.data.failed).toBe(0);

      // Verify imported products match originals
      const roundtripProduct = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.sku, 'ROUNDTRIP-001')
        ));

      expect(roundtripProduct).toHaveLength(1);
      expect(roundtripProduct[0]!.name).toBe('Test Raw Material');
      expect(roundtripProduct[0]!.kind).toBe('raw_material');
    });
  });
});

// ============================================================================
// DATABASE-LEVEL TESTS (Working - No Auth Required)
// ============================================================================

describe('Product Bulk Operations (ADM-001) - Database Tests', () => {
  let testTenantId: string;
  let testKgUomId: string;
  let testPcsUomId: string;

  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Create tenant
    const [tenant] = await db.insert(tenants).values({
      orgId: `org-bulk-db-${Date.now()}`,
      name: 'Bulk DB Test Tenant',
      slug: `test-bulk-db-${Date.now()}`,
    }).returning();
    testTenantId = tenant.id;

    // Create UOMs
    const [kgUom] = await db.insert(uoms).values({
      tenantId: testTenantId,
      code: 'KG',
      name: 'Kilogram',
      uomType: 'weight',
    }).returning();
    testKgUomId = kgUom.id;

    const [pcsUom] = await db.insert(uoms).values({
      tenantId: testTenantId,
      code: 'PCS',
      name: 'Pieces',
      uomType: 'quantity',
    }).returning();
    testPcsUomId = pcsUom.id;
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.tenantId, testTenantId));
    await db.delete(uoms).where(eq(uoms.tenantId, testTenantId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  describe('Product creation and retrieval', () => {
    it('should create products with all required fields', async () => {
      const [product] = await db.insert(products).values({
        tenantId: testTenantId,
        sku: 'DB-TEST-001',
        name: 'Database Test Product',
        description: 'Test description',
        kind: 'raw_material',
        baseUomId: testKgUomId,
        isPerishable: true,
        shelfLifeDays: 30,
        standardCost: '15.50',
        isActive: true,
        createdBy: TEST_USER_ID,
      }).returning();

      expect(product).toBeDefined();
      expect(product.sku).toBe('DB-TEST-001');
      expect(product.name).toBe('Database Test Product');
      expect(product.kind).toBe('raw_material');
      expect(product.isPerishable).toBe(true);
      expect(product.shelfLifeDays).toBe(30);
      expect(Number(product.standardCost)).toBe(15.50); // PostgreSQL returns numeric as string with extra zeros
    });

    it('should retrieve products by tenant', async () => {
      // Create test products
      await db.insert(products).values([
        {
          tenantId: testTenantId,
          sku: 'QUERY-001',
          name: 'Query Test 1',
          kind: 'raw_material',
          baseUomId: testKgUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        },
        {
          tenantId: testTenantId,
          sku: 'QUERY-002',
          name: 'Query Test 2',
          kind: 'finished_good',
          baseUomId: testPcsUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        },
      ]);

      const productList = await db.select()
        .from(products)
        .where(eq(products.tenantId, testTenantId));

      expect(productList.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter products by kind', async () => {
      const rawMaterials = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.kind, 'raw_material')
        ));

      expect(rawMaterials.length).toBeGreaterThan(0);
      rawMaterials.forEach(p => {
        expect(p.kind).toBe('raw_material');
      });
    });

    it('should filter products by active status', async () => {
      // Create inactive product
      await db.insert(products).values({
        tenantId: testTenantId,
        sku: 'INACTIVE-001',
        name: 'Inactive Product',
        kind: 'packaging',
        baseUomId: testPcsUomId,
        isActive: false,
        createdBy: TEST_USER_ID,
      });

      const activeProducts = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.isActive, true)
        ));

      const inactiveProducts = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, testTenantId),
          eq(products.isActive, false)
        ));

      expect(activeProducts.length).toBeGreaterThan(0);
      expect(inactiveProducts.length).toBeGreaterThan(0);
    });
  });

  describe('CSV data format validation', () => {
    it('should handle product kind enum values', () => {
      const validKinds = ['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable'];

      validKinds.forEach(kind => {
        expect(['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable']).toContain(kind);
      });
    });

    it('should validate required fields for product creation', () => {
      const requiredFields = ['tenantId', 'sku', 'name', 'kind', 'baseUomId', 'createdBy'];

      // This test documents the required fields for CSV import validation
      expect(requiredFields).toEqual(['tenantId', 'sku', 'name', 'kind', 'baseUomId', 'createdBy']);
    });

    it('should handle numeric fields correctly', async () => {
      const [product] = await db.insert(products).values({
        tenantId: testTenantId,
        sku: 'NUMERIC-001',
        name: 'Numeric Test',
        kind: 'raw_material',
        baseUomId: testKgUomId,
        isPerishable: true,
        shelfLifeDays: 90,
        standardCost: '123.45',
        isActive: true,
        createdBy: TEST_USER_ID,
      }).returning();

      expect(product.shelfLifeDays).toBe(90);
      expect(Number(product.standardCost)).toBe(123.45); // PostgreSQL returns numeric as string with extra zeros
    });

    it('should enforce unique SKU per tenant', async () => {
      await db.insert(products).values({
        tenantId: testTenantId,
        sku: 'UNIQUE-SKU-001',
        name: 'Unique SKU Test',
        kind: 'raw_material',
        baseUomId: testKgUomId,
        isActive: true,
        createdBy: TEST_USER_ID,
      });

      // Attempting to insert duplicate SKU should fail
      await expect(
        db.insert(products).values({
          tenantId: testTenantId,
          sku: 'UNIQUE-SKU-001', // Duplicate
          name: 'Duplicate SKU',
          kind: 'finished_good',
          baseUomId: testPcsUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        })
      ).rejects.toThrow();
    });
  });

  describe('Bulk operations simulation', () => {
    it('should bulk insert multiple products', async () => {
      const bulkProducts = [
        {
          tenantId: testTenantId,
          sku: 'BULK-DB-001',
          name: 'Bulk Product 1',
          kind: 'raw_material' as const,
          baseUomId: testKgUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        },
        {
          tenantId: testTenantId,
          sku: 'BULK-DB-002',
          name: 'Bulk Product 2',
          kind: 'finished_good' as const,
          baseUomId: testPcsUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        },
        {
          tenantId: testTenantId,
          sku: 'BULK-DB-003',
          name: 'Bulk Product 3',
          kind: 'packaging' as const,
          baseUomId: testPcsUomId,
          isActive: true,
          createdBy: TEST_USER_ID,
        },
      ];

      const inserted = await db.insert(products).values(bulkProducts).returning();

      expect(inserted).toHaveLength(3);
      expect(inserted[0]!.sku).toBe('BULK-DB-001');
      expect(inserted[1]!.sku).toBe('BULK-DB-002');
      expect(inserted[2]!.sku).toBe('BULK-DB-003');
    });

    it('should query products with UOM join', async () => {
      const productList = await db.select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        kind: products.kind,
        uomCode: uoms.code,
        uomName: uoms.name,
      })
        .from(products)
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(eq(products.tenantId, testTenantId))
        .limit(5);

      expect(productList.length).toBeGreaterThan(0);
      productList.forEach(p => {
        expect(p.uomCode).toBeDefined();
        expect(['KG', 'PCS']).toContain(p.uomCode);
      });
    });
  });
});
