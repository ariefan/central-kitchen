import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Customers', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list customers for the current tenant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers'
    });

    
    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(payload.data).toHaveProperty('items');
    expect(payload.data).toHaveProperty('total');
    expect(payload.data).toHaveProperty('limit');
    expect(payload.data).toHaveProperty('offset');
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it('should create a new customer', async () => {
    const timestamp = Date.now();
    const newCustomer = {
      code: `CUST-${timestamp}`,
      name: 'Test Customer',
      email: `test-${timestamp}@example.com`,
      phone: '+1234567890',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      payload: newCustomer
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data.name).toBe(newCustomer.name);
    expect(payload.data.email).toBe(newCustomer.email);
  });

  it('should return 404 for non-existent customer', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${fakeId}`
    });

    expect(response.statusCode).toBe(404);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });
});