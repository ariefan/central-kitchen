import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
} from './test-setup.js';
import { db } from '../../src/config/database.js';
import { products, uoms } from '../../src/config/schema.js';
import { inArray, eq, or, like } from 'drizzle-orm';

describe('ADM-001: Product Catalog Management', () => {
  let app: any;
  let authToken: string;
  let createdProductIds: string[] = [];
  let pcsUomId: string;
  let kgUomId: string;

  beforeAll(async () => {
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

    // Get UOM IDs for testing
    const pcsUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'PCS'),
    });
    const kgUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'KG'),
    });

    expect(pcsUom).toBeDefined();
    expect(kgUom).toBeDefined();
    pcsUomId = pcsUom!.id;
    kgUomId = kgUom!.id;

    // Clean up test products from previous test runs (ignore foreign key errors)
    try {
      await db.delete(products).where(
        or(
          like(products.sku, 'TEST-%'),
          like(products.sku, 'RM-0%'), // Auto-generated RM SKUs
          like(products.sku, 'SF-0%'), // Auto-generated SF SKUs
          like(products.sku, 'FG-0%'), // Auto-generated FG SKUs
          like(products.sku, 'PK-0%'), // Auto-generated PK SKUs
          like(products.sku, 'CS-0%'), // Auto-generated CS SKUs
          like(products.sku, 'LIST-%'),
          like(products.sku, 'PERISHABLE-%'),
          like(products.sku, 'Premium%'),
          like(products.sku, 'UPDATE-%'),
          like(products.sku, 'DELETE-%')
        )
      );
    } catch (error) {
      // Ignore foreign key constraint violations from other test data
    }
  });

  afterEach(async () => {
    // Clean up products created in this test
    if (createdProductIds.length > 0) {
      await db.delete(products).where(inArray(products.id, createdProductIds));
      createdProductIds = [];
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // Helper function to track created products
  const trackProduct = (id: string) => {
    createdProductIds.push(id);
    return id;
  };

  // ============================================================================
  // POST /api/v1/products - Create Product
  // ============================================================================

  describe('POST /api/v1/products', () => {
    it('should create a new product with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          sku: `TEST-RM-${Date.now()}`, // Unique SKU to avoid conflicts
          name: 'Premium Test Flour',
          description: 'High quality all-purpose flour',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          standardCost: '45.50',
          defaultPrice: '60.00',
          taxCategoryId: 'GENERAL',
          isPerishable: true,
          shelfLifeDays: 180,
          barcode: '1234567890123',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^TEST-RM-/); // Our unique test SKU
      expect(data.data.name).toBe('Premium Test Flour');
      expect(data.data.description).toBe('High quality all-purpose flour');
      expect(data.data.productKind).toBe('raw_material');
      expect(data.data.baseUomId).toBe(kgUomId);
      expect(data.data.standardCost).toBe('45.50');
      expect(data.data.defaultPrice).toBe('60.00');
      expect(data.data.taxCategoryId).toBe(null); // Tax categories not yet implemented
      expect(data.data.isPerishable).toBe(true);
      expect(data.data.shelfLifeDays).toBe(180);
      expect(data.data.barcode).toBe('1234567890123');
      expect(data.data.isActive).toBe(true);
      expect(data.data.baseUom).toBeDefined();
      expect(data.data.baseUom.code).toBe('KG');
      expect(data.message).toBe('Product created successfully');

      trackProduct(data.data.id);
    });

    it('should auto-generate SKU for raw_material (RM-00001)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Sugar',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^RM-\d+$/); // Auto-generated, variable length
      expect(data.data.name).toBe('Sugar');
      expect(data.data.productKind).toBe('raw_material');

      trackProduct(data.data.id);
    });

    it('should auto-generate SKU for semi_finished (SF-00001)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Cookie Dough',
          productKind: 'semi_finished',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^SF-\d{5}$/);
      expect(data.data.name).toBe('Cookie Dough');
      expect(data.data.productKind).toBe('semi_finished');

      trackProduct(data.data.id);
    });

    it('should auto-generate SKU for finished_good (FG-00001)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Chocolate Chip Cookies',
          productKind: 'finished_good',
          baseUomId: pcsUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^FG-\d+$/); // Auto-generated, variable length
      expect(data.data.name).toBe('Chocolate Chip Cookies');
      expect(data.data.productKind).toBe('finished_good');

      trackProduct(data.data.id);
    });

    it('should auto-generate SKU for packaging (PK-00001)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Cardboard Box',
          productKind: 'packaging',
          baseUomId: pcsUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^PK-\d{5}$/);
      expect(data.data.name).toBe('Cardboard Box');
      expect(data.data.productKind).toBe('packaging');

      trackProduct(data.data.id);
    });

    it('should auto-generate SKU for consumable (CS-00001)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Cleaning Spray',
          productKind: 'consumable',
          baseUomId: pcsUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.sku).toMatch(/^CS-\d{5}$/);
      expect(data.data.name).toBe('Cleaning Spray');
      expect(data.data.productKind).toBe('consumable');

      trackProduct(data.data.id);
    });

    it('should create perishable product with shelfLifeDays', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Fresh Milk',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isPerishable: true,
          shelfLifeDays: 7,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.isPerishable).toBe(true);
      expect(data.data.shelfLifeDays).toBe(7);

      trackProduct(data.data.id);
    });

    it('should reject perishable product without shelfLifeDays', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Fresh Eggs',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isPerishable: true,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Shelf life days required for perishable products');
    });

    it('should reject invalid base UOM', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Invalid UOM Product',
          productKind: 'raw_material',
          baseUomId: '00000000-0000-0000-0000-000000000000',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Base UOM not found');
    });

    it('should reject duplicate SKU', async () => {
      // First create a product
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          sku: 'DUP-SKU-001',
          name: 'First Product',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      expect(firstRes.statusCode).toBe(201);
      trackProduct(firstRes.json().data.id);

      // Try to create another with the same SKU
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          sku: 'DUP-SKU-001',
          name: 'Second Product',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Product SKU already exists');
    });

    it('should require name field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          productKind: 'raw_material',
          baseUomId: kgUomId,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should require productKind field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Test Product',
          baseUomId: kgUomId,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should require baseUomId field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Test Product',
          productKind: 'raw_material',
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        payload: {
          name: 'Test Product',
          productKind: 'raw_material',
          baseUomId: kgUomId,
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/v1/products - List Products
  // ============================================================================

  describe('GET /api/v1/products', () => {
    beforeEach(async () => {
      // Create test products for list/filter tests
      const productsData = [
        { sku: 'LIST-RM-001', name: 'Alpha Flour', productKind: 'raw_material', isPerishable: false, isActive: true },
        { sku: 'LIST-SF-001', name: 'Beta Dough', productKind: 'semi_finished', isPerishable: true, shelfLifeDays: 3, isActive: true },
        { sku: 'LIST-FG-001', name: 'Gamma Cookies', productKind: 'finished_good', isPerishable: true, shelfLifeDays: 14, isActive: false },
      ];

      for (const product of productsData) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/products',
          headers: { cookie: authToken },
          payload: {
            ...product,
            baseUomId: kgUomId,
          },
        });
        if (res.statusCode === 201) {
          trackProduct(res.json().data.id);
        }
      }
    });

    it('should return paginated list of products', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?page=1&limit=10',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(3);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(3);
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.pagination.currentPage).toBe(1);
    });

    it('should filter products by name', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?name=Alpha',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items[0].name).toContain('Alpha');
    });

    it('should filter products by SKU', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?sku=LIST-RM',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items[0].sku).toContain('LIST-RM');
    });

    it('should filter products by productKind', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?productKind=raw_material',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items.every((p: any) => p.productKind === 'raw_material')).toBe(true);
    });

    it('should filter products by isPerishable status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?isPerishable=true',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(2);
      expect(data.data.items.every((p: any) => p.isPerishable === true)).toBe(true);
    });

    it('should filter products by isActive status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?isActive=false',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items.every((p: any) => p.isActive === false)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/v1/products/:id - Get Product Details
  // ============================================================================

  describe('GET /api/v1/products/:id', () => {
    it('should return product details', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Detail Test Product',
          description: 'Detailed description',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          standardCost: '25.00',
          defaultPrice: '35.00',
          isPerishable: true,
          shelfLifeDays: 30,
          barcode: '9876543210987',
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(productId);
      expect(data.data.name).toBe('Detail Test Product');
      expect(data.data.description).toBe('Detailed description');
      expect(data.data.productKind).toBe('raw_material');
      expect(data.data.standardCost).toBe('25.00');
      expect(data.data.defaultPrice).toBe('35.00');
      expect(data.data.isPerishable).toBe(true);
      expect(data.data.shelfLifeDays).toBe(30);
      expect(data.data.barcode).toBe('9876543210987');
      expect(data.data.baseUom).toBeDefined();
      expect(data.data.baseUom.code).toBe('KG');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Product not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /api/v1/products/:id - Update Product
  // ============================================================================

  describe('PATCH /api/v1/products/:id', () => {
    it('should update product name', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Original Name',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
      expect(data.message).toBe('Product updated successfully');
    });

    it('should update product description', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Description Test',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          description: 'New detailed description',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.description).toBe('New detailed description');
    });

    it('should update product prices', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Price Test Product',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          standardCost: '10.00',
          defaultPrice: '15.00',
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          standardCost: '12.50',
          defaultPrice: '18.00',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.standardCost).toBe('12.50');
      expect(data.data.defaultPrice).toBe('18.00');
    });

    it('should update product to perishable with shelfLifeDays', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Perishable Test',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isPerishable: false,
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          isPerishable: true,
          shelfLifeDays: 10,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.isPerishable).toBe(true);
      expect(data.data.shelfLifeDays).toBe(10);
    });

    it('should reject update to perishable without shelfLifeDays', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Perishable Reject Test',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isPerishable: false,
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          isPerishable: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Shelf life days required for perishable products');
    });

    it('should update product active status', async () => {
      // Create a test product
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Status Test Product',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });

      const productId = trackProduct(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          isActive: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Product not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // DELETE /api/v1/products/:id - Deactivate Product
  // ============================================================================

  describe('DELETE /api/v1/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      // Create a test product for deletion
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          name: 'Product - Delete Test',
          productKind: 'raw_material',
          baseUomId: kgUomId,
          isActive: true,
        },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      productId = trackProduct(data.data.id);
    });

    it('should deactivate product (soft delete)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Product deactivated successfully');

      // Verify product is deactivated but not deleted
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${productId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const productData = getRes.json();
      expect(productData.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Product not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/products/${productId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
