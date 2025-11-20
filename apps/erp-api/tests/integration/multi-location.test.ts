import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
} from './test-setup.js';

describe('AUTH-002: Multi-Location Access Control', () => {
  let app: any;
  let authToken: string;
  let userId: string;
  let locationId1: string;
  let locationId2: string;
  let locationId3: string;

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();

    // Sign in with existing admin user from createTestData()
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

    // Get user ID from /me endpoint
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: authToken,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meData = meRes.json();
    userId = meData.data.id;

    // Get available locations from seed data
    const locationsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/locations',
      headers: {
        cookie: authToken,
      },
    });

    expect(locationsRes.statusCode).toBe(200);
    const locationsData = locationsRes.json();
    const locations = locationsData.data.items || locationsData.data;

    // Get first 3 locations
    locationId1 = locations[0]?.id;
    locationId2 = locations[1]?.id;
    locationId3 = locations[2]?.id;

    expect(locationId1).toBeDefined();
    expect(locationId2).toBeDefined();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('GET /api/v1/auth/users/:id/locations', () => {
    it('should return user locations list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe(userId);
      expect(Array.isArray(data.data.locations)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/users/00000000-0000-0000-0000-000000000000/locations',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/auth/users/:id/locations', () => {
    it('should assign locations to user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1, locationId2],
          replaceExisting: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe(userId);
      expect(data.data.locations).toHaveLength(2);
      expect(data.data.locations.map((l: any) => l.id)).toContain(locationId1);
      expect(data.data.locations.map((l: any) => l.id)).toContain(locationId2);
    });

    it('should add more locations without replacing', async () => {
      // First assign location1 and location2
      await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1, locationId2],
          replaceExisting: true, // Clear existing first
        },
      });

      // Then add location3 without replacing
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId3],
          replaceExisting: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.locations).toHaveLength(3);
    });

    it('should replace existing locations when replaceExisting=true', async () => {
      // First assign location1 and location2
      await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1, locationId2],
          replaceExisting: true,
        },
      });

      // Then replace with only location3
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId3],
          replaceExisting: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.locations).toHaveLength(1);
      expect(data.data.locations[0].id).toBe(locationId3);
    });

    it('should return 400 for invalid location ID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: ['00000000-0000-0000-0000-000000000000'],
          replaceExisting: false,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid locations');
    });

    it('should handle duplicate location assignments gracefully', async () => {
      // Assign location1
      await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1],
          replaceExisting: true,
        },
      });

      // Try to assign location1 again (should not duplicate)
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1],
          replaceExisting: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.locations).toHaveLength(1);
    });
  });

  describe('POST /api/v1/auth/switch-location', () => {
    beforeAll(async () => {
      // Assign locations to user first
      await app.inject({
        method: 'POST',
        url: `/api/v1/auth/users/${userId}/locations`,
        headers: {
          cookie: authToken,
        },
        payload: {
          locationIds: [locationId1, locationId2],
          replaceExisting: true,
        },
      });
    });

    it('should switch to assigned location', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-location',
        headers: {
          cookie: authToken,
        },
        payload: {
          locationId: locationId2,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.locationId).toBe(locationId2);
      expect(data.data.location).toBeDefined();
      expect(data.data.location.id).toBe(locationId2);
    });

    it('should return 403 when switching to unassigned location', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-location',
        headers: {
          cookie: authToken,
        },
        payload: {
          locationId: locationId3, // Not assigned to user
        },
      });

      expect(res.statusCode).toBe(403);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Access denied');
    });

    it('should return 404 for non-existent location', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-location',
        headers: {
          cookie: authToken,
        },
        payload: {
          locationId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should update user session context after switching', async () => {
      // Switch location
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-location',
        headers: {
          cookie: authToken,
        },
        payload: {
          locationId: locationId1,
        },
      });

      // Verify /me endpoint returns new location
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meData = meRes.json();
      expect(meData.data.locationId).toBe(locationId1);
      expect(meData.data.location?.id).toBe(locationId1);
    });
  });
});
