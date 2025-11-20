import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Goods Receipts', () => {
  let app: any;
  let locationId: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();

    // Get a location for testing
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations',
      headers: {
        Cookie: cookies
      }
    });

    const locationsPayload = locationsResponse.json();
    if (locationsPayload.data && locationsPayload.data.length > 0) {
      locationId = locationsPayload.data[0].id;
    }

    // Get a supplier for testing
    const suppliersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers',
      headers: {
        Cookie: cookies
      }
    });

    const suppliersPayload = suppliersResponse.json();
    if (suppliersPayload.data && suppliersPayload.data.items && suppliersPayload.data.items.length > 0) {
      supplierId = suppliersPayload.data.items[0].id;
    }

    // Get a product for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: {
        Cookie: cookies
      }
    });

    const productsPayload = productsResponse.json();
    if (productsPayload.data && productsPayload.data.items && productsPayload.data.items.length > 0) {
      productId = productsPayload.data.items[0].id;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list goods receipts', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/goods-receipts',
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
  });

  it('should create a new goods receipt', async () => {
    const cookies = await getAuthCookies();
    if (!supplierId || !locationId || !productId) {
      console.log('Skipping test - missing required data');
      return;
    }

    const newGoodsReceipt = {
      supplierId,
      locationId,
      referenceNo: `GR-${Date.now()}`,
      items: [
        {
          productId,
          quantity: 10,
          unitCost: 50.00,
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goods-receipts',
      headers: {
        Cookie: cookies
      },
      payload: newGoodsReceipt
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('referenceNo', newGoodsReceipt.referenceNo);
  });

  it('should validate required fields', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goods-receipts',
      headers: {
        Cookie: cookies
      },
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });
});
