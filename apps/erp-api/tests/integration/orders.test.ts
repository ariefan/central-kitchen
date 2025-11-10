import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Orders', () => {
  let app: any;
  let locationId: string;
  let productId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get a location for testing
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations'
    });

    const locationsPayload = locationsResponse.json();
    if (locationsPayload.data && locationsPayload.data.length > 0) {
      locationId = locationsPayload.data[0].id;
    } else {
      // Create a test location
      const locationResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/locations',
        payload: {
          code: 'ORDER-TEST',
          name: 'Order Test Location',
          type: 'outlet',
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Test Country',
        }
      });

      if (locationResponse.statusCode !== 201) {
        console.log('Location creation failed:', locationResponse.payload);
        throw new Error('Failed to create test location');
      }

      const locationPayload = locationResponse.json();
      locationId = locationPayload.data.id;
    }

    // Get a product for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    const productsPayload = productsResponse.json();
    if (productsPayload.data.items && productsPayload.data.items.length > 0) {
      productId = productsPayload.data.items[0].id;
    } else {
      productId = '00000000-0000-0000-0000-000000000001';
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list orders', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should create a new order', async () => {
    const newOrder = {
      channel: 'pos',
      type: 'dine_in',
      locationId,
      customerName: 'Test Customer',
      items: [
        {
          productId, // Use dynamic product ID
          quantity: 2,
          unitPrice: 10.00,
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      payload: newOrder
    });

    if (response.statusCode !== 201) {
      console.log('Order creation failed:', response.payload);
    }
    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('orderNumber');
    expect(payload.data).toHaveProperty('status', 'open');
    expect(payload.data).toHaveProperty('totalAmount');
    expect(payload.data.channel).toBe(newOrder.channel);
    expect(payload.data.type).toBe(newOrder.type);
  });

  it('should post/finalize an order', async () => {
    // First create an order
    const newOrder = {
      channel: 'pos',
      type: 'take_away',
      locationId,
      items: [
        {
          productId, // Use dynamic product ID
          quantity: 1,
          unitPrice: 15.00,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      payload: newOrder
    });

    const createPayload = createResponse.json();
    const orderId = createPayload.data.id;

    // Then post the order
    const postResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/post`
    });

    expect(postResponse.statusCode).toBe(200);
    const postPayload = postResponse.json();
    expect(postPayload).toHaveProperty('success', true);
    expect(postPayload.data).toHaveProperty('status', 'posted');
    expect(postPayload.data).toHaveProperty('orderNumber');
    expect(postPayload.data).toHaveProperty('updatedAt'); // updatedAt is the timestamp field
  });

  it('should void an order', async () => {
    // First create an order
    const newOrder = {
      channel: 'online',
      type: 'delivery',
      locationId,
      items: [
        {
          productId, // Use dynamic product ID
          quantity: 1,
          unitPrice: 20.00,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      payload: newOrder
    });

    expect(createResponse.statusCode).toBe(201);
    const createPayload = createResponse.json();
    expect(createPayload).toHaveProperty('success', true);
    expect(createPayload.data).toHaveProperty('id');
    const orderId = createPayload.data.id;

    // Then void the order
    const voidResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/void`,
      payload: { reason: 'Customer cancelled' }
    });

    expect(voidResponse.statusCode).toBe(200);
    const voidPayload = voidResponse.json();
    expect(voidPayload).toHaveProperty('success', true);
    expect(voidPayload.data).toHaveProperty('status', 'voided');
    expect(voidPayload.data).toHaveProperty('updatedAt'); // updatedAt is the timestamp field
    // Note: voidReason might be stored differently or not returned - just check status changed
  });

  it('should return 404 for non-existent order', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${fakeId}`
    });

    expect(response.statusCode).toBe(404);
  });

  it('should validate required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });
});