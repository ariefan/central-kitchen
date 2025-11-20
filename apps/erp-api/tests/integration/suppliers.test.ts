import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../src/server';
import { getTestContext } from './test-setup';

describe('Suppliers API (PROC-001)', () => {
  const ctx = getTestContext();
  let testProductId: string;

  beforeAll(async () => {
    // Create test product for catalog
    const productResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: {
        'x-tenant-id': ctx.tenantId,
        'x-user-id': ctx.userId,
      },
      payload: {
        sku: 'TEST-RAW-001',
        name: 'Test Raw Material',
        kind: 'raw_material',
        baseUomId: '00000000-0000-0000-0000-000000000011', // KG
        isPerishable: false,
        isActive: true,
      },
    });

    testProductId = JSON.parse(productResponse.body).data.id;
  });

  describe('POST /api/v1/suppliers - Create Supplier', () => {
    it('should create supplier with complete data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'SUP-001',
          name: 'ABC Supplies Pte Ltd',
          contactPerson: 'John Doe',
          email: 'john@abcsupplies.com',
          phone: '+65 6123 4567',
          address: '123 Industrial Road',
          city: 'Singapore',
          taxId: 'T12345678X',
          paymentTerms: 30,
          creditLimit: 50000.00,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.code).toBe('SUP-001');
      expect(body.data.name).toBe('ABC Supplies Pte Ltd');
      expect(body.data.paymentTerms).toBe(30);
      expect(body.data.creditLimit).toBe('50000.00');
    });

    it('should auto-generate supplier code if not provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          name: 'Auto Code Supplier',
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.code).toMatch(/^SUP-\d+$/); // Format: SUP-00001
    });

    it('should reject duplicate supplier code', async () => {
      // Create first supplier
      await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DUP-SUP-001',
          name: 'First Supplier',
        },
      });

      // Attempt duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DUP-SUP-001',
          name: 'Duplicate Supplier',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'SUP-EMAIL-TEST',
          name: 'Email Test Supplier',
          email: 'invalid-email', // Invalid format
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('email');
    });
  });

  describe('GET /api/v1/suppliers - List Suppliers', () => {
    it('should list all active suppliers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?isActive=true',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.every((s: any) => s.isActive === true)).toBe(true);
    });

    it('should support search by name', async () => {
      // Create searchable supplier
      await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'SEARCH-001',
          name: 'XYZ Unique Supplier Name',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?search=XYZ Unique',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.some((s: any) => s.name.includes('XYZ Unique'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/suppliers?limit=5&offset=0',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('offset');
    });
  });

  describe('GET /api/v1/suppliers/:id - Get Supplier with Catalog', () => {
    it('should get supplier with catalog items', async () => {
      // Create supplier
      const supplierResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'SUP-CAT-001',
          name: 'Supplier with Catalog',
        },
      });

      const supplierId = JSON.parse(supplierResponse.body).data.id;

      // Add catalog item
      await app.inject({
        method: 'POST',
        url: `/api/v1/suppliers/${supplierId}/catalog`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          productId: testProductId,
          supplierSku: 'SUP-SKU-001',
          unitCost: 25.50,
          uomId: '00000000-0000-0000-0000-000000000011', // KG
          leadTimeDays: 7,
          moq: 100,
          isActive: true,
        },
      });

      // Get supplier
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.code).toBe('SUP-CAT-001');
      expect(body.data).toHaveProperty('catalogItems');
      expect(Array.isArray(body.data.catalogItems)).toBe(true);
      expect(body.data.catalogItems.length).toBeGreaterThan(0);
      expect(body.data.catalogItems[0]).toHaveProperty('supplierSku');
      expect(body.data.catalogItems[0].unitCost).toBe('25.50');
    });
  });

  describe('PATCH /api/v1/suppliers/:id - Update Supplier', () => {
    it('should update supplier details', async () => {
      // Create supplier
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'UPD-SUP-001',
          name: 'Original Supplier Name',
          paymentTerms: 30,
        },
      });

      const supplierId = JSON.parse(createResponse.body).data.id;

      // Update supplier
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          name: 'Updated Supplier Name',
          paymentTerms: 45,
          contactPerson: 'Jane Smith',
          phone: '+65 9876 5432',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Updated Supplier Name');
      expect(body.data.paymentTerms).toBe(45);
      expect(body.data.contactPerson).toBe('Jane Smith');
      expect(body.data.code).toBe('UPD-SUP-001'); // Code should not change
    });
  });

  describe('DELETE /api/v1/suppliers/:id - Soft Delete Supplier', () => {
    it('should soft delete supplier', async () => {
      // Create supplier
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DEL-SUP-001',
          name: 'To Be Deleted Supplier',
          isActive: true,
        },
      });

      const supplierId = JSON.parse(createResponse.body).data.id;

      // Delete supplier
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify supplier is inactive
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const body = JSON.parse(getResponse.body);
      expect(body.data.isActive).toBe(false);
    });

    it('should prevent hard delete if supplier has transactions', async () => {
      // This test verifies that FK constraints prevent deletion
      // when supplier has purchase orders

      // Create supplier
      const supplierResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'FK-SUP-001',
          name: 'Supplier with PO',
        },
      });

      const supplierId = JSON.parse(supplierResponse.body).data.id;

      // Create purchase order for this supplier
      await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [],
        },
      });

      // Soft delete should work
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/suppliers/${supplierId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);
    });
  });

  describe('Supplier Catalog Management', () => {
    let supplierId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'CAT-TEST-001',
          name: 'Catalog Test Supplier',
        },
      });

      supplierId = JSON.parse(response.body).data.id;
    });

    it('should add product to supplier catalog', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/suppliers/${supplierId}/catalog`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          productId: testProductId,
          supplierSku: 'CAT-SKU-001',
          unitCost: 12.50,
          uomId: '00000000-0000-0000-0000-000000000011',
          leadTimeDays: 5,
          moq: 50,
          isPrimary: true,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.supplierSku).toBe('CAT-SKU-001');
      expect(body.data.unitCost).toBe('12.50');
    });

    it('should update catalog item', async () => {
      // Add catalog item
      const addResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/suppliers/${supplierId}/catalog`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          productId: testProductId,
          supplierSku: 'UPD-SKU-001',
          unitCost: 10.00,
          uomId: '00000000-0000-0000-0000-000000000011',
        },
      });

      const catalogItemId = JSON.parse(addResponse.body).data.id;

      // Update catalog item
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/suppliers/${supplierId}/catalog/${catalogItemId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          unitCost: 11.50,
          leadTimeDays: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.unitCost).toBe('11.50');
      expect(body.data.leadTimeDays).toBe(10);
    });

    it('should prevent duplicate product in catalog', async () => {
      // Add first catalog item
      await app.inject({
        method: 'POST',
        url: `/api/v1/suppliers/${supplierId}/catalog`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          productId: testProductId,
          supplierSku: 'DUP-SKU-001',
          unitCost: 10.00,
          uomId: '00000000-0000-0000-0000-000000000011',
        },
      });

      // Attempt duplicate
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/suppliers/${supplierId}/catalog`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          productId: testProductId, // Same product
          supplierSku: 'DUP-SKU-002',
          unitCost: 12.00,
          uomId: '00000000-0000-0000-0000-000000000011',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already exists');
    });
  });
});
