import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Health Check', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should return 200 for health endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('status', 'healthy');
    expect(payload.data).toHaveProperty('timestamp');
    expect(payload.data).toHaveProperty('environment');
    expect(payload.data).toHaveProperty('database');
  });
});