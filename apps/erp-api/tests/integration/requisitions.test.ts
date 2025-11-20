import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Requisitions', () => {
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

  it('should list requisitions', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/requisitions',
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

  it('should create a new requisition', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    const timestamp = Date.now();
    const newRequisition = {
      fromLocationId,
      toLocationId,
      requiredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      notes: 'Test requisition for stock transfer',
      items: [
        {
          productId,
          uomId,
          qtyRequested: 50,
          notes: 'Urgent need for weekend',
        },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/requisitions',
      headers: {
        Cookie: cookies
      },
      payload: newRequisition
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data).toHaveProperty('reqNumber');
    expect(payload.data.status).toBe('draft');
    expect(payload.data.fromLocationId).toBe(fromLocationId);
    expect(payload.data.toLocationId).toBe(toLocationId);
    expect(payload.data.items).toHaveLength(1);
  });

  it('should validate required fields', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/requisitions',
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
      url: '/api/v1/requisitions',
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

  it('should approve a requisition', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create a requisition
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/requisitions',
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
            qtyRequested: 25,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const requisitionId = createPayload.data.id;

    // Then approve it
    const approveResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/requisitions/${requisitionId}/approve`,
    });

    expect(approveResponse.statusCode).toBe(200);
    const approvePayload = approveResponse.json();
    expect(approvePayload).toHaveProperty('success', true);
    expect(approvePayload.data).toHaveProperty('status', 'approved');
  });

  it('should reject a requisition', async () => {
    const cookies = await getAuthCookies();
    if (!fromLocationId || !toLocationId || !productId || !uomId) {
      console.log('Skipping test - missing required data');
      return;
    }

    // First create a requisition
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/requisitions',
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
            qtyRequested: 10,
          },
        ],
      },
    });

    const createPayload = createResponse.json();
    const requisitionId = createPayload.data.id;

    // Then reject it
    const rejectResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/requisitions/${requisitionId}/reject`,
      payload: { reason: 'Insufficient stock available' }
    });

    expect(rejectResponse.statusCode).toBe(200);
    const rejectPayload = rejectResponse.json();
    expect(rejectPayload).toHaveProperty('success', true);
    expect(rejectPayload.data).toHaveProperty('status', 'rejected');
  });

  it('should filter requisitions by status', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/requisitions?status=draft',
      headers: {
        Cookie: cookies
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toHaveProperty('success', true);
    expect(Array.isArray(payload.data)).toBe(true);
  });
});