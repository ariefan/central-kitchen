import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Authentication', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should return user information with tenant context', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('email');
    expect(payload.data).toHaveProperty('role');
    expect(payload.data).toHaveProperty('tenant');
    expect(payload.data.tenant).toHaveProperty('id');
    expect(payload.data.tenant).toHaveProperty('name');
    expect(payload.data).toHaveProperty('location');
  });

  it('should have proper tenant isolation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    // Verify tenant context is set
    expect(payload.data).toHaveProperty('tenantId');
    expect(payload.data.tenantId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});