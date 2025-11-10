import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Purchase Orders', () => {
  let app: any;
  let supplierId: string;
  let locationId: string;
  let productId: string;
  let uomId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get a supplier for testing
    const suppliersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers'
    });
    const suppliersPayload = suppliersResponse.json();
    if (suppliersPayload.data.items && suppliersPayload.data.items.length > 0) {
      supplierId = suppliersPayload.data.items[0].id;
    } else {
      // Create a test supplier
      const supplierResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        payload: {
          code: 'PO-TEST-SUPPLIER',
          name: 'PO Test Supplier',
          email: 'potest@supplier.com',
          paymentTerms: 30,
        }
      });
      const supplierPayload = supplierResponse.json();
      supplierId = supplierPayload.data.id;
    }

    // Get a location for testing
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations'
    });
    const locationsPayload = locationsResponse.json();
    if (locationsPayload.data.length > 0) {
      locationId = locationsPayload.data[0].id;
    }

    // Get a product for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });
    const productsPayload = productsResponse.json();
    if (productsPayload.data && productsPayload.data.length > 0) {
      productId = productsPayload.data[0].id;
      uomId = productsPayload.data[0].baseUomId;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list purchase orders', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/purchase-orders'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should create a new purchase order', async () => {
    if (!supplierId || !locationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    const timestamp = Date.now();
    const newPurchaseOrder = {
      supplierId,
      locationId,
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: 30,
      notes: 'Test purchase order',
      items: [
        {
          productId,
          quantity: 10,
          uomId,
          unitPrice: 15.50,
          discount: 0,
          taxRate: 10,
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      payload: newPurchaseOrder
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('orderNumber');
    expect(payload.data).toHaveProperty('status', 'draft');
    expect(payload.data.supplierId).toBe(supplierId);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should validate items are required', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      payload: {
        supplierId,
        locationId,
        items: [],
      }
    });

    expect(response.statusCode).toBe(400);
  });
});