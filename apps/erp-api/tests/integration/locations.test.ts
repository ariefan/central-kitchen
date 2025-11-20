import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
} from './test-setup.js';
import { db } from '../../src/config/database.js';
import { locations } from '../../src/config/schema.js';
import { ilike, inArray } from 'drizzle-orm';

describe('ADM-004: Location Management', () => {
  let app: any;
  let authToken: string;
  let createdLocationIds: string[] = [];

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();

    // Clean up any existing test locations from previous runs
    // Only clean LOC-% codes (seed data uses different format and has FK constraints)
    await db.delete(locations).where(ilike(locations.code, 'LOC-%'));

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
    // Clean up locations created in this test
    if (createdLocationIds.length > 0) {
      await db.delete(locations).where(inArray(locations.id, createdLocationIds));
      createdLocationIds = [];
    }
  });

  afterAll(async () => {
    // Final cleanup - remove all test locations
    await db.delete(locations).where(ilike(locations.code, 'LOC-%'));
    await closeTestApp();
  });

  // Helper function to track created locations
  const trackLocation = (id: string) => {
    createdLocationIds.push(id);
    return id;
  };

  describe('POST /api/v1/locations', () => {
    it('should create a new location with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'LOC-CK-001',
          name: 'Central Kitchen - Main',
          locationType: 'central_kitchen',
          address: '123 Industrial Rd',
          city: 'Singapore',
          postalCode: '123456',
          country: 'Singapore',
          phone: '+6512345678',
          email: 'ck.main@example.com',
          managerName: 'John Doe',
          latitude: 1.3521,
          longitude: 103.8198,
          operatingHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
          },
          isActive: true,
          notes: 'Main central kitchen',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('LOC-CK-001');
      expect(data.data.name).toBe('Central Kitchen - Main');
      expect(data.data.locationType).toBe('central_kitchen');
      expect(data.data.address).toBe('123 Industrial Rd');
      expect(data.data.city).toBe('Singapore');
      expect(data.data.postalCode).toBe('123456');
      expect(data.data.phone).toBe('+6512345678');
      expect(data.data.email).toBe('ck.main@example.com');
      expect(data.data.managerName).toBe('John Doe');
      expect(data.data.latitude).toBe(1.3521);
      expect(data.data.longitude).toBe(103.8198);
      expect(data.data.isActive).toBe(true);
      expect(data.data.notes).toBe('Main central kitchen');
      expect(data.message).toBe('Location created successfully');

      trackLocation(data.data.id);
    });

    it('should auto-generate location code if not provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Outlet - Orchard',
          locationType: 'outlet',
          city: 'Singapore',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toMatch(/LOC-OUT-\d{3}/);
      expect(data.data.name).toBe('Outlet - Orchard');
      expect(data.data.locationType).toBe('outlet');

      trackLocation(data.data.id);
    });

    it('should create a warehouse location', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Warehouse - East',
          locationType: 'warehouse',
          address: '456 Logistics Ave',
          city: 'Singapore',
          postalCode: '654321',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toMatch(/LOC-WH-\d{3}/);
      expect(data.data.locationType).toBe('warehouse');

      trackLocation(data.data.id);
    });

    it('should reject duplicate location code', async () => {
      // First create a location
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'LOC-CK-DUP',
          name: 'First Location',
          locationType: 'central_kitchen',
          isActive: true,
        },
      });

      expect(firstRes.statusCode).toBe(201);
      trackLocation(firstRes.json().data.id);

      // Try to create another location with same code
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          code: 'LOC-CK-DUP',
          name: 'Duplicate Location',
          locationType: 'central_kitchen',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('Location code already exists');
    });

    it('should require name field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          locationType: 'outlet',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should require locationType field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Test Location',
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        payload: {
          name: 'Unauthorized Location',
          locationType: 'outlet',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/locations', () => {
    beforeEach(async () => {
      // Create test locations for list/filter tests
      const locations = [
        {
          code: 'LOC-CK-LIST1',
          name: 'Central Kitchen - North',
          locationType: 'central_kitchen',
          city: 'Singapore',
          isActive: true,
        },
        {
          code: 'LOC-OUT-LIST1',
          name: 'Outlet - Orchard',
          locationType: 'outlet',
          city: 'Singapore',
          isActive: true,
        },
        {
          code: 'LOC-WH-LIST1',
          name: 'Warehouse - West',
          locationType: 'warehouse',
          city: 'Jurong',
          isActive: false,
        },
      ];

      for (const location of locations) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/locations',
          headers: { cookie: authToken },
          payload: location,
        });
        if (res.statusCode === 201) {
          trackLocation(res.json().data.id);
        }
      }
    });

    it('should return paginated list of locations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?page=1&limit=10',
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
      expect(data.data.pagination.currentPage).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(3);
      expect(data.data.pagination.hasNext).toBeDefined();
      expect(data.data.pagination.hasPrev).toBe(false);
    });

    it('should filter locations by name', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?name=Central',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.every((loc: any) => loc.name.includes('Central'))).toBe(true);
    });

    it('should filter locations by locationType', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?locationType=outlet',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.every((loc: any) => loc.locationType === 'outlet')).toBe(true);
    });

    it('should filter locations by city', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?city=Singapore',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.every((loc: any) => loc.city === 'Singapore')).toBe(true);
    });

    it('should filter locations by isActive status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations?isActive=true',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.items.every((loc: any) => loc.isActive === true)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      // Create a test location
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: { cookie: authToken },
        payload: {
          code: 'LOC-CK-DETAIL',
          name: 'Central Kitchen - Detail Test',
          locationType: 'central_kitchen',
          address: '123 Industrial Rd',
          managerName: 'John Doe',
          operatingHours: {
            monday: { open: '09:00', close: '18:00' },
          },
        },
      });
      locationId = trackLocation(res.json().data.id);
    });

    it('should return location details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(locationId);
      expect(data.data.code).toBe('LOC-CK-DETAIL');
      expect(data.data.name).toBe('Central Kitchen - Detail Test');
      expect(data.data.locationType).toBe('central_kitchen');
      expect(data.data.address).toBe('123 Industrial Rd');
      expect(data.data.managerName).toBe('John Doe');
      expect(data.data.operatingHours).toBeDefined();
    });

    it('should return 404 for non-existent location', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not Found');
      expect(data.message).toBe('Location not found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${locationId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      // Create a test location for updates
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: { cookie: authToken },
        payload: {
          name: 'Outlet - Update Test',
          locationType: 'outlet',
          city: 'Singapore',
        },
      });
      locationId = trackLocation(res.json().data.id);
    });

    it('should update location name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Outlet - Updated Name',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Outlet - Updated Name');
      expect(data.message).toBe('Location updated successfully');
    });

    it('should update location address fields', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          address: '789 Orchard Road',
          city: 'Singapore',
          postalCode: '238891',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.address).toBe('789 Orchard Road');
      expect(data.data.postalCode).toBe('238891');
    });

    it('should update location contact information', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          phone: '+6587654321',
          email: 'orchard@example.com',
          managerName: 'Jane Smith',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.phone).toBe('+6587654321');
      expect(data.data.email).toBe('orchard@example.com');
      expect(data.data.managerName).toBe('Jane Smith');
    });

    it('should update location coordinates', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          latitude: 1.3048,
          longitude: 103.8318,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.latitude).toBe(1.3048);
      expect(data.data.longitude).toBe(103.8318);
    });

    it('should update location active status', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
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

    it('should return 404 for non-existent location', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/locations/00000000-0000-0000-0000-000000000000',
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
      expect(data.error).toBe('Not Found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/locations/${locationId}`,
        payload: {
          name: 'Unauthorized Update',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      // Create a test location for deletion
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        headers: { cookie: authToken },
        payload: {
          name: 'Warehouse - Delete Test',
          locationType: 'warehouse',
        },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      locationId = trackLocation(data.data.id);
    });

    it('should deactivate location (soft delete)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Location deactivated successfully');

      // Verify location is deactivated, not deleted
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/locations/${locationId}`,
        headers: {
          cookie: authToken,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const getData = getRes.json();
      expect(getData.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent location', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/locations/00000000-0000-0000-0000-000000000000',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not Found');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/locations/${locationId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
