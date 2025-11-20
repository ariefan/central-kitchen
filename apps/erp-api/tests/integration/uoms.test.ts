/**
 * UOM Management Integration Tests (ADM-003)
 *
 * Tests for Unit of Measure (UOM) CRUD operations
 *
 * @see FEATURES.md Section 12.3 - UOM Management (ADM-003)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
  loginTestUser,
} from './test-setup';
import { db } from '@/config/database';
import { uoms } from '@/config/schema';
import { eq, or, like } from 'drizzle-orm';

describe('UOM Management (ADM-003)', () => {
  let app: any;
  let authToken: string;
  let createdUomId: string;

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();
    authToken = await loginTestUser();

    // Clean up test UOMs from previous test runs
    try {
      await db.delete(uoms).where(
        or(
          like(uoms.code, 'TEST-%'),
          like(uoms.code, 'UPD-%'),
          like(uoms.code, 'DEL-%'),
          like(uoms.name, '%Test%')
        )
      );
    } catch (error) {
      // Ignore foreign key constraint violations
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('POST /api/v1/uoms - Create UOM', () => {
    it('should create a new UOM with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'TEST-KG',
          name: 'Test Kilogram',
          uomType: 'weight',
          symbol: 'test-kg',
          description: 'Test weight unit in kilograms',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.code).toBe('TEST-KG');
      expect(data.data.name).toBe('Test Kilogram');
      expect(data.data.uomType).toBe('weight');
      expect(data.data.symbol).toBe('test-kg');
      expect(data.data.description).toBe('Test weight unit in kilograms');
      expect(data.data.isActive).toBe(true);
      expect(data.data).toHaveProperty('tenantId');
      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');

      createdUomId = data.data.id;
    });

    it('should create UOM with minimal fields (defaults applied)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'TEST-L',
          name: 'Test Liter',
          uomType: 'volume',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.data.code).toBe('TEST-L');
      expect(data.data.isActive).toBe(true); // Default value
    });

    it('should fail to create UOM with duplicate code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'TEST-KG', // Duplicate from first test
          name: 'Another Test Kilogram',
          uomType: 'weight',
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('already exists');
    });

    it('should automatically uppercase the UOM code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'test-ml',
          name: 'Test Milliliter',
          uomType: 'volume',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.data.code).toBe('TEST-ML'); // Uppercased
    });

    it('should reject invalid UOM type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'TEST-INV',
          name: 'Invalid Type',
          uomType: 'invalid_type', // Not in enum
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/uoms - List UOMs', () => {
    it('should list all UOMs with pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          limit: '10',
          offset: '0',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('pagination');
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.items.length).toBeGreaterThan(0);
      expect(data.data.pagination).toHaveProperty('total');
      expect(data.data.pagination).toHaveProperty('limit');
      expect(data.data.pagination).toHaveProperty('offset');
    });

    it('should filter UOMs by type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          uomType: 'weight',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.every((uom: any) => uom.uomType === 'weight')).toBe(true);
    });

    it('should filter UOMs by active status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          isActive: 'true',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.every((uom: any) => uom.isActive === true)).toBe(true);
    });

    it('should search UOMs by code', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          code: 'TEST',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.every((uom: any) => uom.code.includes('TEST'))).toBe(true);
    });

    it('should search UOMs by name', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          name: 'Test',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.length).toBeGreaterThan(0);
    });

    it('should search UOMs with general search query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        query: {
          search: 'Kilo',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/uoms/:id - Get UOM by ID', () => {
    it('should get UOM details by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/uoms/${createdUomId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(createdUomId);
      expect(data.data.code).toBe('TEST-KG');
      expect(data.data.name).toBe('Test Kilogram');
    });

    it('should return 404 for non-existent UOM ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/uoms/${fakeId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms/invalid-uuid',
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/uoms/:id - Update UOM', () => {
    it('should update UOM name and description', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/uoms/${createdUomId}`,
        headers: { cookie: authToken },
        payload: {
          name: 'Updated Test Kilogram',
          description: 'Updated description for test UOM',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Test Kilogram');
      expect(data.data.description).toBe('Updated description for test UOM');
      expect(data.data.code).toBe('TEST-KG'); // Code should remain unchanged
    });

    it('should update UOM type', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/uoms/${createdUomId}`,
        headers: { cookie: authToken },
        payload: {
          uomType: 'count',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.uomType).toBe('count');
    });

    it('should deactivate UOM via PATCH', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/uoms/${createdUomId}`,
        headers: { cookie: authToken },
        payload: {
          isActive: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.isActive).toBe(false);
    });

    it('should return 404 for updating non-existent UOM', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/uoms/${fakeId}`,
        headers: { cookie: authToken },
        payload: {
          name: 'Should Fail',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/uoms/:id - Delete (Deactivate) UOM', () => {
    let deleteTestUomId: string;

    beforeAll(async () => {
      // Create a UOM specifically for delete testing
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
        payload: {
          code: 'DEL-TEST',
          name: 'Delete Test UOM',
          uomType: 'count',
        },
      });
      deleteTestUomId = res.json().data.id;
    });

    it('should soft delete (deactivate) UOM', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/uoms/${deleteTestUomId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.isActive).toBe(false);

      // Verify UOM still exists in database but is inactive
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/v1/uoms/${deleteTestUomId}`,
        headers: { cookie: authToken },
      });
      expect(checkRes.statusCode).toBe(200);
      expect(checkRes.json().data.isActive).toBe(false);
    });

    it('should return 404 when deleting non-existent UOM', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/uoms/${fakeId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests to list UOMs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject unauthenticated requests to create UOM', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uoms',
        payload: {
          code: 'UNAUTH',
          name: 'Unauthorized',
          uomType: 'count',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return UOMs belonging to current tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/uoms',
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      // All UOMs should have the same tenantId as the authenticated user
      const tenantIds = data.data.items.map((uom: any) => uom.tenantId);
      const uniqueTenantIds = [...new Set(tenantIds)];
      expect(uniqueTenantIds.length).toBe(1); // Only one tenant
    });
  });
});
