import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Goods Receipts', () => {
  let app: any;
  let locationId: string;
  let supplierId: string;
  let purchaseOrderId: string;
  let purchaseOrderItemId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get a location for testing
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations'
    });
    const locationsPayload = locationsResponse.json();
    if (locationsPayload.data.items && locationsPayload.data.items.length > 0) {
      locationId = locationsPayload.data.items[0].id;
    } else {
      const createLocationResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        payload: {
          code: `GR-LOC-${Date.now()}`,
          name: 'Goods Receipt Test Location',
          type: 'warehouse',
          address: '123 Goods Receipt St',
          city: 'Test City',
        },
      });

      expect(createLocationResponse.statusCode).toBe(201);
      const createLocationPayload = createLocationResponse.json();
      locationId = createLocationPayload.data.id;
    }

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
          code: 'GR-TEST-SUPPLIER',
          name: 'GR Test Supplier',
          email: 'grtest@supplier.com',
          paymentTerms: 30,
        }
      });
      const supplierPayload = supplierResponse.json();
      supplierId = supplierPayload.data.id;
    }

    // Get products for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });
    const productsPayload = productsResponse.json();
    if (!productsPayload.data.items || productsPayload.data.items.length === 0) {
      throw new Error('No products available for goods receipt integration test');
    }

    const product = productsPayload.data.items[0];

    // Create a purchase order for testing
    const poResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/purchase-orders',
      payload: {
        supplierId,
        locationId,
        items: [
          {
            productId: product.id,
            quantity: 20,
            uomId: product.baseUomId,
            unitPrice: 10.0,
          },
        ],
      },
    });

    expect(poResponse.statusCode).toBe(201);
    const poPayload = poResponse.json();
    purchaseOrderId = poPayload.data.id;

    // Get the PO item ID
    const poDetailsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/purchase-orders/${purchaseOrderId}`,
    });

    expect(poDetailsResponse.statusCode).toBe(200);
    const poDetailsPayload = poDetailsResponse.json();
    if (!poDetailsPayload.data.items || poDetailsPayload.data.items.length === 0) {
      throw new Error('Purchase order was created without items');
    }
    const firstItem = poDetailsPayload.data.items[0];
    purchaseOrderItemId = firstItem.purchase_order_items?.id ?? firstItem.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list goods receipts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/goods-receipts'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should create a new goods receipt', async () => {
    if (!locationId || !purchaseOrderItemId) {
      throw new Error('Goods receipt test prerequisites were not created');
    }

    const newGoodsReceipt = {
      locationId,
      purchaseOrderId,
      receiptDate: new Date().toISOString(),
      notes: 'Test goods receipt',
      items: [
        {
          purchaseOrderItemId,
          quantity: 15,
          notes: 'Received in good condition',
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goods-receipts',
      payload: newGoodsReceipt
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('receiptNumber');
    expect(payload.data.locationId).toBe(locationId);
    expect(payload.data.items).toHaveLength(1);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goods-receipts',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should validate items are required', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goods-receipts',
      payload: {
        locationId,
        items: [],
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should filter goods receipts by location', async () => {
    if (!locationId) {
      console.log('Skipping test - missing location ID');
      return;
    }

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/goods-receipts?locationId=${locationId}`
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(Array.isArray(payload.data)).toBe(true);
  });
});
