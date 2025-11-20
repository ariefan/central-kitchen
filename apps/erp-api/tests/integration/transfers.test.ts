import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Transfers', () => {
  let app: any;
  let fromLocationId: string;
  let toLocationId: string;
  let productId: string;
  let uomId: string;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();

    // Get locations for testing (need at least 2 for inter-store transfers)
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations',
      headers: {
        Cookie: cookies
      }
    });
    const locationsPayload = locationsResponse.json();
    if (locationsPayload.data.length >= 2) {
      fromLocationId = locationsPayload.data[0].id;
      toLocationId = locationsPayload.data[1].id;
    } else {
      // If we don't have 2 locations, use the same one for now
      fromLocationId = locationsPayload.data[0]?.id;
      toLocationId = locationsPayload.data[0]?.id;
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
    if (productsPayload.data && productsPayload.data.length > 0) {
      productId = productsPayload.data[0].id;
      uomId = productsPayload.data[0].baseUomId;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list transfers', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload).toHaveProperty('data');
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should create a new transfer', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    const timestamp = Date.now();
    const newTransfer = {
      fromLocationId,
      toLocationId,
      expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      notes: 'Test transfer for inventory movement',
      items: [
        {
          productId,
          uomId,
          quantity: 25,
          notes: 'Urgent transfer for stock balance',
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: newTransfer
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('transferNumber');
    expect(payload.data.status).toBe('draft');
    expect(payload.data.fromLocationId).toBe(fromLocationId);
    expect(payload.data.toLocationId).toBe(toLocationId);
    expect(payload.data.items).toHaveLength(1);
  });

  it('should validate required fields', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
          headers: {
            Cookie: cookies
          },
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should validate items are required', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
          headers: {
            Cookie: cookies
          },
      payload: {
        fromLocationId,
        toLocationId,
        items: [],
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should get transfer by ID with items', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create a transfer
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: {
        fromLocationId,
        toLocationId,
        items: [
          {
            productId,
            uomId,
            quantity: 15,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const transferId = createPayload.data.id;

    // Then get it by ID
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/transfers/${transferId}`,
      headers: {
        Cookie: cookies
      }
    });

    expect(getResponse.statusCode).toBe(200);
    const getPayload = getResponse.json();
    expect(getPayload).toHaveProperty('success', true);
    expect(getPayload.data).toHaveProperty('id', transferId);
    expect(getPayload.data).toHaveProperty('items');
    expect(Array.isArray(getPayload.data.items)).toBe(true);
    expect(getPayload.data.items).toHaveLength(1);
  });

  it('should update a draft transfer', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create a transfer
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: {
        fromLocationId,
        toLocationId,
        items: [
          {
            productId,
            uomId,
            quantity: 10,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const transferId = createPayload.data.id;

    // Then update it
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/transfers/${transferId}`,
      headers: {
        Cookie: cookies
      },
      payload: {
        notes: 'Updated transfer notes',
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    const updatePayload = updateResponse.json();
    expect(updatePayload).toHaveProperty('success', true);
    expect(updatePayload.data).toHaveProperty('notes', 'Updated transfer notes');
  });

  it('should send a transfer', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create a transfer
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: {
        fromLocationId,
        toLocationId,
        items: [
          {
            productId,
            uomId,
            quantity: 20,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const transferId = createPayload.data.id;

    // Then send it
    const sendResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/send`,
      headers: {
        Cookie: cookies
      }
    });

    expect(sendResponse.statusCode).toBe(200);
    const sendPayload = sendResponse.json();
    expect(sendPayload).toHaveProperty('success', true);
    expect(sendPayload.data).toHaveProperty('status', 'sent');
  });

  it('should receive a transfer', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create and send a transfer
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: {
        fromLocationId,
        toLocationId,
        items: [
          {
            productId,
            uomId,
            quantity: 12,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const transferId = createPayload.data.id;
    const transferItemId = createPayload.data.items[0].id;

    // Send it first
    await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/send`
    });

    // Then receive it
    const receiveResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/receive`,
      headers: {
        Cookie: cookies
      },
      payload: {
        items: [
          {
            transferItemId,
            qtyReceived: 12,
            notes: 'Received in good condition',
          },
        ],
      }
    });

    expect(receiveResponse.statusCode).toBe(200);
    const receivePayload = receiveResponse.json();
    expect(receivePayload).toHaveProperty('success', true);
    expect(receivePayload.data).toHaveProperty('itemsProcessed', 1);
  });

  it('should post a completed transfer', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create, send, and fully receive a transfer
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: {
        Cookie: cookies
      },
      payload: {
        fromLocationId,
        toLocationId,
        items: [
          {
            productId,
            uomId,
            quantity: 8,
          },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createPayload = createResponse.json();
    expect(createPayload).toHaveProperty('success', true);
    expect(createPayload.data).toHaveProperty('id');

    const transferId = createPayload.data.id;
    const transferItemId = createPayload.data.items[0]?.id;

    // Send it
    await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/send`
    });

    // Receive it fully (this should complete the transfer)
    await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/receive`,
      payload: {
        items: [
          {
            transferItemId,
            qtyReceived: 8,
          },
        ],
      }
    });

    // Then post it
    const postResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/transfers/${transferId}/post`,
      headers: {
        Cookie: cookies
      }
    });

    expect(postResponse.statusCode).toBe(200);
    const postPayload = postResponse.json();
    expect(postPayload).toHaveProperty('success', true);
  });

  it('should filter transfers by status', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/transfers?status=draft',
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should filter transfers by from location', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId) {
      console.log('Skipping test - missing from location ID');
      return;
    }

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/transfers?fromLocationId=${fromLocationId}`,
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('should return 404 for non-existent transfer', async () => {
    const cookies = await getAuthCookies();
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/transfers/${fakeId}`,
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(404);
    const payload = response.json();
    expect(payload).toHaveProperty('success', false);
  });
});