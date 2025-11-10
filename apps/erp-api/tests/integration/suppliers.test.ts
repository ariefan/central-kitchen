import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Suppliers', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list suppliers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers'
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

  it('should create a new supplier', async () => {
    const timestamp = Date.now();
    const newSupplier = {
      code: `SUPP-${timestamp}`,
      name: 'Test Supplier',
      contactPerson: 'John Doe',
      email: `test-${timestamp}@supplier.com`,
      phone: '+1234567890',
      address: '123 Supplier St',
      city: 'Supplier City',
      paymentTerms: 30,
      isActive: true,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      payload: newSupplier
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data.name).toBe(newSupplier.name);
    expect(payload.data.code).toBe(newSupplier.code);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should search suppliers by name', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers?search=Test'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('items');
    expect(Array.isArray(payload.data.items)).toBe(true);
  });
});