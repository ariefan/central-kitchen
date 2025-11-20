import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
} from './test-setup.js';
import { db } from '../../src/config/database.js';
import { suppliers } from '../../src/config/schema.js';
import { inArray } from 'drizzle-orm';

describe('PROC-006: Supplier Management', () => {
  let app: any;
  let authToken: string;
  let createdSupplierIds: string[] = [];

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
  });

  afterEach(async () => {
    // Clean up suppliers created in this test
    if (createdSupplierIds.length > 0) {
      await db.delete(suppliers).where(inArray(suppliers.id, createdSupplierIds));
      createdSupplierIds = [];
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // Helper function to track created suppliers
  const trackSupplier = (id: string) => {
    createdSupplierIds.push(id);
    return id;
  };

  // ============================================================================
  // POST /api/v1/suppliers - Create Supplier
  // ============================================================================

  describe('POST /api/v1/suppliers', () => {
    it('should create a new supplier with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'SUP-00001',
          name: 'ABC Supplies Co.',
          email: 'orders@abcsupplies.com',
          phone: '+6512345678',
          address: '123 Industrial Road',
          city: 'Singapore',
          postalCode: '123456',
          country: 'Singapore',
          paymentTerms: 30,
          leadTimeDays: 5,
          taxId: 'TAX123456',
          businessLicense: 'BL789012',
          primaryContactName: 'John Doe',
          primaryContactPhone: '+6598765432',
          rating: 4.5,
          notes: 'Reliable supplier with good quality',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('SUP-00001');
      expect(data.data.name).toBe('ABC Supplies Co.');
      expect(data.data.email).toBe('orders@abcsupplies.com');
      expect(data.data.phone).toBe('+6512345678');
      expect(data.data.address).toBe('123 Industrial Road');
      expect(data.data.city).toBe('Singapore');
      expect(data.data.postalCode).toBe('123456');
      expect(data.data.country).toBe('Singapore');
      expect(data.data.paymentTerms).toBe(30);
      expect(data.data.leadTimeDays).toBe(5);
      expect(data.data.taxId).toBe('TAX123456');
      expect(data.data.businessLicense).toBe('BL789012');
      expect(data.data.primaryContactName).toBe('John Doe');
      expect(data.data.primaryContactPhone).toBe('+6598765432');
      expect(data.data.rating).toBe(4.5);
      expect(data.data.isActive).toBe(true);
      expect(data.data.notes).toBe('Reliable supplier with good quality');
      expect(data.message).toBe('Supplier created successfully');

      trackSupplier(data.data.id);
    });

    it('should auto-generate supplier code if not provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'DEF Trading Ltd.',
          email: 'contact@deftrading.com',
          paymentTerms: 45,
          leadTimeDays: 7,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toMatch(/SUP-\d{5}/);
      expect(data.data.name).toBe('DEF Trading Ltd.');
      expect(data.data.email).toBe('contact@deftrading.com');

      trackSupplier(data.data.id);
    });

    it('should use default payment terms (30 days) if not provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'GHI Distributors',
          email: 'sales@ghidist.com',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.paymentTerms).toBe(30);
      expect(data.data.leadTimeDays).toBe(7); // Default lead time

      trackSupplier(data.data.id);
    });

    it('should reject duplicate supplier code', async () => {
      // First create a supplier
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'SUP-DUP01',
          name: 'First Supplier',
          email: 'first@supplier.com',
          isActive: true,
        },
      });

      expect(firstRes.statusCode).toBe(201);
      trackSupplier(firstRes.json().data.id);

      // Try to create another with the same code
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'SUP-DUP01',
          name: 'Second Supplier',
          email: 'second@supplier.com',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('Supplier code already exists');
    });

    it('should require name field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          email: 'test@supplier.com',
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should require email field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Test Supplier',
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        payload: {
          name: 'Test Supplier',
          email: 'test@supplier.com',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/v1/suppliers - List Suppliers
  // ============================================================================

  describe('GET /api/v1/suppliers', () => {
    beforeEach(async () => {
      // Create test suppliers for list/filter tests
      const suppliersData = [
        { code: 'SUP-LIST1', name: 'Alpha Supplies', email: 'alpha@supplies.com', city: 'Singapore', isActive: true, rating: 5 },
        { code: 'SUP-LIST2', name: 'Beta Trading', email: 'beta@trading.com', city: 'Singapore', isActive: true, rating: 4 },
        { code: 'SUP-LIST3', name: 'Gamma Distributors', email: 'gamma@dist.com', city: 'Johor', isActive: false, rating: 3 },
      ];

      for (const supplier of suppliersData) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/suppliers',
          headers: { cookie: authToken },
          payload: {
            ...supplier,
            paymentTerms: 30,
            leadTimeDays: 7,
          },
        });
        if (res.statusCode === 201) {
          trackSupplier(res.json().data.id);
        }
      }
    });

    it('should return paginated list of suppliers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?page=1&limit=10',
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

    it('should filter suppliers by name', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?name=Alpha',
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

    it('should filter suppliers by code', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?code=LIST1',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items[0].code).toContain('LIST1');
    });

    it('should filter suppliers by email', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?email=beta@trading.com',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items[0].email).toBe('beta@trading.com');
    });

    it('should filter suppliers by isActive status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?isActive=false',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.data.items.every((s: any) => s.isActive === false)).toBe(true);
    });

    it('should filter suppliers by minimum rating', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?minRating=4',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(2);
      expect(data.data.items.every((s: any) => s.rating >= 4)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/v1/suppliers/:id - Get Supplier Details
  // ============================================================================

  describe('GET /api/v1/suppliers/:id', () => {
    it('should return supplier details', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Detail Test Supplier',
          email: 'detail@test.com',
          phone: '+6511111111',
          address: '456 Test Street',
          city: 'Singapore',
          paymentTerms: 45,
          leadTimeDays: 10,
          taxId: 'TAX999',
          rating: 4.8,
          notes: 'Test notes',
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(supplierId);
      expect(data.data.name).toBe('Detail Test Supplier');
      expect(data.data.email).toBe('detail@test.com');
      expect(data.data.phone).toBe('+6511111111');
      expect(data.data.address).toBe('456 Test Street');
      expect(data.data.city).toBe('Singapore');
      expect(data.data.paymentTerms).toBe(45);
      expect(data.data.leadTimeDays).toBe(10);
      expect(data.data.taxId).toBe('TAX999');
      expect(data.data.rating).toBe(4.8);
      expect(data.data.notes).toBe('Test notes');
    });

    it('should return 404 for non-existent supplier', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Supplier not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers/00000000-0000-0000-0000-000000000000',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /api/v1/suppliers/:id - Update Supplier
  // ============================================================================

  describe('PATCH /api/v1/suppliers/:id', () => {
    it('should update supplier name', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Original Name',
          email: 'original@test.com',
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
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
      expect(data.data.email).toBe('original@test.com'); // Should remain unchanged
      expect(data.message).toBe('Supplier updated successfully');
    });

    it('should update supplier contact information', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Contact Test Supplier',
          email: 'old@email.com',
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          email: 'new@email.com',
          phone: '+6599999999',
          address: 'New Address',
          city: 'New City',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('new@email.com');
      expect(data.data.phone).toBe('+6599999999');
      expect(data.data.address).toBe('New Address');
      expect(data.data.city).toBe('New City');
    });

    it('should update supplier payment terms and lead time', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Terms Test Supplier',
          email: 'terms@test.com',
          paymentTerms: 30,
          leadTimeDays: 7,
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          paymentTerms: 60,
          leadTimeDays: 14,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.paymentTerms).toBe(60);
      expect(data.data.leadTimeDays).toBe(14);
    });

    it('should update supplier rating', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Rating Test Supplier',
          email: 'rating@test.com',
          rating: 3,
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          rating: 4.5,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.rating).toBe(4.5);
    });

    it('should update supplier active status', async () => {
      // Create a test supplier
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Status Test Supplier',
          email: 'status@test.com',
          isActive: true,
        },
      });

      const supplierId = trackSupplier(createRes.json().data.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
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

    it('should return 404 for non-existent supplier', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/suppliers/00000000-0000-0000-0000-000000000000',
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
      expect(data.message).toBe('Supplier not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/suppliers/00000000-0000-0000-0000-000000000000',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // DELETE /api/v1/suppliers/:id - Deactivate Supplier
  // ============================================================================

  describe('DELETE /api/v1/suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      // Create a test supplier for deletion
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { cookie: authToken },
        payload: {
          name: 'Supplier - Delete Test',
          email: 'delete@test.com',
        },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      supplierId = trackSupplier(data.data.id);
    });

    it('should deactivate supplier (soft delete)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Supplier deactivated successfully');

      // Verify supplier is deactivated but not deleted
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const supplierData = getRes.json();
      expect(supplierData.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent supplier', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/suppliers/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Supplier not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/suppliers/${supplierId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
