import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Locations', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list locations for the current tenant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/locations'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(Array.isArray(payload.data)).toBe(true);

    if (payload.data.length > 0) {
      const location = payload.data[0];
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('code');
      expect(location).toHaveProperty('type');
      expect(location).toHaveProperty('tenantId');
    }
  });

  it('should create a new location', async () => {
    const timestamp = Date.now();
    const newLocation = {
      code: `TEST-${timestamp}`,
      name: 'Test Location',
      type: 'outlet',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      country: 'Test Country',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/locations',
      payload: newLocation
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data.name).toBe(newLocation.name);
    expect(payload.data.code).toBe(newLocation.code);
  });

  it('should return 404 for non-existent location', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/locations/${fakeId}`
    });

    expect(response.statusCode).toBe(404);
  });
});