import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Stock Counts', () => {
  let app: any;
  let locationId: string | undefined;
  let productId: string | undefined;
  let createdCountId: string | undefined;
  let createdLineId: string | undefined;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();

    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations',
    ,
      headers: {
        Cookie: cookies
      });
    const locationsPayload = locationsResponse.json();
    if (Array.isArray(locationsPayload.data) && locationsPayload.data.length > 0) {
      locationId = locationsPayload.data[0].id;
    }

    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
    ,
      headers: {
        Cookie: cookies
      });
    const productsPayload = productsResponse.json();
    if (productsPayload.data?.items?.length) {
      productId = productsPayload.data.items[0].id;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should list stock counts', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stock-counts',
    ,
      headers: {
        Cookie: cookies
      });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveProperty('items');
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it('should create a stock count draft', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
      console.warn('Skipping stock count creation test (missing location)');
      return;
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stock-counts',
      headers: {
        Cookie: cookies
      },
      payload: {
        locationId,
        notes: 'Integration test stock count',
      },
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveProperty('id');
    expect(payload.data.status).toBe('draft');

    createdCountId = payload.data.id;
  });

  it('should add and update a stock count line', async () => {
    const cookies = await getAuthCookies();
    if (!createdCountId || !productId) {
      console.warn('Skipping line tests (missing count or product)');
      return;
    }

    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/stock-counts/${createdCountId}/lines`,
      payload: {
        productId,
        countedQtyBase: 5,
      },
    });

    expect(addResponse.statusCode).toBe(201);
    const addPayload = addResponse.json();
    expect(addPayload.success).toBe(true);
    expect(addPayload.data).toHaveProperty('id');
    expect(addPayload.data.countId).toBe(createdCountId);

    createdLineId = addPayload.data.id;

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/stock-counts/lines/${createdLineId}`,
      payload: {
        countedQtyBase: 7,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    const updatePayload = updateResponse.json();
    expect(updatePayload.success).toBe(true);
    expect(updatePayload.data.countedQtyBase).toBe('7.000000');
  });

  it('should review and post a stock count', async () => {
    const cookies = await getAuthCookies();
    if (!createdCountId) {
      console.warn('Skipping review/post tests (missing count)');
      return;
    }

    const reviewResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/stock-counts/${createdCountId}/review`,
    });

    expect(reviewResponse.statusCode).toBe(200);
    const reviewPayload = reviewResponse.json();
    expect(reviewPayload.success).toBe(true);
    expect(reviewPayload.data.status).toBe('review');

    const postResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/stock-counts/${createdCountId}/post`,
    });

    expect(postResponse.statusCode).toBe(200);
    const postPayload = postResponse.json();
    expect(postPayload.success).toBe(true);
    expect(postPayload.data.status).toBe('posted');
  });
});
