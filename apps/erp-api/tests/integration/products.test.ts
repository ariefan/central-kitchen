import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Products', () => {
  let app: any;
  let baseUomId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get existing product to extract baseUomId
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    const productsPayload = productsResponse.json();
    if (productsPayload.data && productsPayload.data.items && productsPayload.data.items.length > 0) {
      // Use baseUomId from existing product
      baseUomId = productsPayload.data.items[0].baseUomId;
    } else {
      // This shouldn't happen if seeding worked, but fallback
      baseUomId = '00000000-0000-0000-0000-000000000001';
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list products for the current tenant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
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

    if (payload.data.items.length > 0) {
      const product = payload.data.items[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('kind');
      expect(product).toHaveProperty('defaultPrice'); // Fixed field name
    }
  });

  it('should create a new product', async () => {
    const timestamp = Date.now();
    const newProduct = {
      name: 'Test Product',
      description: 'A test product',
      kind: 'finished_good',
      sku: `TEST-${timestamp}`,
      baseUomId, // Required field
      isActive: true,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: newProduct
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data.name).toBe(newProduct.name);
    expect(payload.data.sku).toBe(newProduct.sku);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });
});