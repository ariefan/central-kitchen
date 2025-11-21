import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, getTestContext, testTenantId } from './test-setup';

describe('Locations API (ADM-004)', () => {
  let app: ReturnType<typeof getApp>;
  const ctx = getTestContext();
  let createdLocationId: string;

  beforeEach(() => {
    app = getApp();
  });

  describe('POST /api/v1/locations - Create Location', () => {
    it('should create a new location with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'WH-001',
          name: 'Main Warehouse',
          locationType: 'warehouse',
          address: '123 Storage St',
          city: 'Singapore',
          postalCode: '123456',
          phone: '+65 1234 5678',
          email: 'warehouse@example.com',
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.code).toBe('WH-001');
      expect(body.data.name).toBe('Main Warehouse');
      expect(body.data.locationType).toBe('warehouse');
      expect(body.data.tenantId).toBe(testTenantId);

      createdLocationId = body.data.id;
    });

    it('should reject duplicate location code', async () => {
      // Create first location
      await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DUP-001',
          name: 'First Location',
          locationType: 'outlet',
        },
      });

      // Attempt duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DUP-001',
          name: 'Duplicate Location',
          locationType: 'outlet',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already exists');
    });

    it('should reject invalid location type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'INV-001',
          name: 'Invalid Location',
          locationType: 'invalid_type', // Should be central_kitchen, outlet, or warehouse
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/locations - List Locations', () => {
    beforeEach(async () => {
      // Create test locations
      await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'LIST-001',
          name: 'List Test Location 1',
          locationType: 'warehouse',
          isActive: true,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'LIST-002',
          name: 'List Test Location 2',
          locationType: 'outlet',
          isActive: false,
        },
      });
    });

    it('should list all locations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by location type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?locationType=warehouse',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((loc: any) => loc.locationType === 'warehouse')).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?isActive=true',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((loc: any) => loc.isActive === true)).toBe(true);
    });
  });

  describe('GET /api/v1/locations/:id - Get Location by ID', () => {
    it('should get location by valid ID', async () => {
      // Create location first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'GET-001',
          name: 'Get Test Location',
          locationType: 'central_kitchen',
        },
      });

      const createdLoc = JSON.parse(createResponse.body).data;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdLoc.id);
      expect(body.data.code).toBe('GET-001');
      expect(body.data.name).toBe('Get Test Location');
    });

    it('should return 404 for non-existent location', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/locations/00000000-0000-0000-0000-999999999999',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/locations/:id - Update Location', () => {
    it('should update location details', async () => {
      // Create location
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'UPD-001',
          name: 'Original Name',
          locationType: 'outlet',
        },
      });

      const createdLoc = JSON.parse(createResponse.body).data;

      // Update location
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          name: 'Updated Name',
          address: '456 New St',
          phone: '+65 9999 9999',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.address).toBe('456 New St');
      expect(body.data.phone).toBe('+65 9999 9999');
      expect(body.data.code).toBe('UPD-001'); // Should not change
    });

    it('should not allow updating location code', async () => {
      // Create location
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'FIXED-001',
          name: 'Fixed Code Location',
          locationType: 'outlet',
        },
      });

      const createdLoc = JSON.parse(createResponse.body).data;

      // Attempt to update code
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'CHANGED-001', // Should be ignored or rejected
        },
      });

      // Get location to verify code didn't change
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const body = JSON.parse(getResponse.body);
      expect(body.data.code).toBe('FIXED-001'); // Original code preserved
    });
  });

  describe('DELETE /api/v1/locations/:id - Soft Delete Location', () => {
    it('should soft delete location (set isActive=false)', async () => {
      // Create location
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          code: 'DEL-001',
          name: 'To Be Deleted',
          locationType: 'outlet',
          isActive: true,
        },
      });

      const createdLoc = JSON.parse(createResponse.body).data;

      // Delete location
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify location still exists but is inactive
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${createdLoc.id}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const body = JSON.parse(getResponse.body);
      expect(body.data.isActive).toBe(false);
    });
  });
});
