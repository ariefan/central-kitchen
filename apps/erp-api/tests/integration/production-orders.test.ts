import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Production Orders', () => {
  let app: any;
  let recipeId: string;
  let locationId: string;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();

    // Get a recipe for testing
    const recipesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      }
    });
    const recipesPayload = recipesResponse.json();

    if (recipesPayload.data && recipesPayload.data.length > 0) {
      recipeId = recipesPayload.data[0].id;
    } else {
      // Create a test recipe first
      const productsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
        headers: {
          Cookie: cookies
        }
      });
      const productsPayload = productsResponse.json();

      if (productsPayload.data && productsPayload.data.length >= 2) {
        const ingredient = productsPayload.data.find((p: any) => p.kind === 'raw_material') || productsPayload.data[0];
        const finished = productsPayload.data.find((p: any) => p.kind === 'finished_good') || productsPayload.data[1];

        if (ingredient && finished) {
          const recipeResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/recipes',
            headers: {
              Cookie: cookies
            },
            payload: {
              code: 'PROD-RECIPE-001',
              name: 'Production Test Recipe',
              finishedProductId: finished.id,
              yieldQtyBase: 10,
              instructions: 'Mix and bake',
              items: [
                {
                  productId: ingredient.id,
                  qtyBase: 5,
                  sortOrder: 0,
                },
              ],
            }
          });
          const recipePayload = recipeResponse.json();
          recipeId = recipePayload.data.id;
        }
      }
    }

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
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Production Order Management', () => {
    it('should list all production orders', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/production-orders',
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

    it('should create a new production order', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      const timestamp = Date.now();
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
      const newProductionOrder = {
        recipeId,
        locationId,
        plannedQtyBase: 25,
        scheduledAt,
        notes: 'Test production order',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: newProductionOrder
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('orderNumber');
      expect(payload.data).toHaveProperty('recipeId', recipeId);
      expect(payload.data).toHaveProperty('locationId', locationId);
      expect(payload.data).toHaveProperty('plannedQtyBase', '25.000000');
      expect(payload.data).toHaveProperty('status', 'scheduled');
      expect(payload.data).toHaveProperty('producedQtyBase', '0.000000');
    });

    it('should get production order by ID', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 15,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Get test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Then get it by ID
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/production-orders/${productionOrderId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(getResponse.statusCode).toBe(200);
      const getPayload = getResponse.json();
      expect(getPayload).toHaveProperty('success', true);
      expect(getPayload.data).toHaveProperty('id', productionOrderId);
      expect(getPayload.data).toHaveProperty('recipe');
      expect(getPayload.data).toHaveProperty('location');
      expect(getPayload.data).toHaveProperty('finishedProduct');
      expect(getPayload.data).toHaveProperty('ingredients');
      expect(getPayload.data).toHaveProperty('scaleFactor');
      expect(Array.isArray(getPayload.data.ingredients)).toBe(true);
    });

    it('should start production order', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 20,
          scheduledAt: new Date().toISOString(),
          notes: 'Start test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Start production
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/production-orders/${productionOrderId}/start`,
        headers: {
          Cookie: cookies
        }
      });

      expect(startResponse.statusCode).toBe(200);
      const startPayload = startResponse.json();
      expect(startPayload).toHaveProperty('success', true);
      expect(startPayload.data).toHaveProperty('status', 'in_progress');
      expect(startPayload.data).toHaveProperty('startedAt');
    });

    it('should complete production order', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 30,
          scheduledAt: new Date().toISOString(),
          notes: 'Complete test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Start production
      await app.inject({
        method: 'POST',
        url: `/api/v1/production-orders/${productionOrderId}/start`,
        headers: {
          Cookie: cookies
        }
      });

      // Complete production
      const completeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/production-orders/${productionOrderId}/complete`,
        headers: {
          Cookie: cookies
        },
        payload: {
          actualQtyBase: 28,
          notes: 'Completed successfully',
        }
      });

      expect(completeResponse.statusCode).toBe(200);
      const completePayload = completeResponse.json();
      expect(completePayload).toHaveProperty('success', true);
      expect(completePayload.data).toHaveProperty('status', 'completed');
      expect(completePayload.data).toHaveProperty('producedQtyBase', '28.000000');
      expect(completePayload.data).toHaveProperty('completedAt');
      expect(completePayload.data).toHaveProperty('notes', 'Completed successfully');
    });

    it('should put production order on hold', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 12,
          scheduledAt: new Date().toISOString(),
          notes: 'Hold test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Put on hold
      const holdResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/production-orders/${productionOrderId}/hold`,
        headers: {
          Cookie: cookies
        },
        payload: {
          reason: 'Waiting for ingredients',
        }
      });

      expect(holdResponse.statusCode).toBe(200);
      const holdPayload = holdResponse.json();
      expect(holdPayload).toHaveProperty('success', true);
      expect(holdPayload.data).toHaveProperty('status', 'on_hold');
      expect(holdPayload.data).toHaveProperty('notes');
      expect(holdPayload.data.notes).toContain('ON HOLD');
    });

    it('should cancel production order', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 8,
          scheduledAt: new Date().toISOString(),
          notes: 'Cancel test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Cancel production
      const cancelResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/production-orders/${productionOrderId}/cancel`,
        headers: {
          Cookie: cookies
        },
        payload: {
          reason: 'Equipment malfunction',
        }
      });

      expect(cancelResponse.statusCode).toBe(200);
      const cancelPayload = cancelResponse.json();
      expect(cancelPayload).toHaveProperty('success', true);
      expect(cancelPayload.data).toHaveProperty('status', 'cancelled');
      expect(cancelPayload.data).toHaveProperty('notes');
      expect(cancelPayload.data.notes).toContain('CANCELLED');
    });

    it('should update production order', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId || !locationId) {
        console.log('Skipping test - missing recipe or location ID');
        return;
      }

      // First create a production order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId,
          plannedQtyBase: 18,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Update test production order',
        }
      });

      const createPayload = createResponse.json();
      const productionOrderId = createPayload.data.id;

      // Update production order
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/production-orders/${productionOrderId}`,
        headers: {
          Cookie: cookies
        },
        payload: {
          plannedQtyBase: 22,
          notes: 'Updated production order',
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatePayload = updateResponse.json();
      expect(updatePayload).toHaveProperty('success', true);
      expect(updatePayload.data).toHaveProperty('plannedQtyBase', '22.000000');
      expect(updatePayload.data).toHaveProperty('notes', 'Updated production order');
    });

    it('should filter production orders by status', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/production-orders?status=scheduled',
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter production orders by location', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/production-orders?locationId=${locationId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter production orders by date range', async () => {
      const cookies = await getAuthCookies();
      const today = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/production-orders?dateFrom=${today}&dateTo=${nextWeek}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent production order', async () => {
      const cookies = await getAuthCookies();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/production-orders/${fakeId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating production order for non-existent recipe', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const fakeRecipeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId: fakeRecipeId,
          locationId,
          plannedQtyBase: 10,
          scheduledAt: new Date().toISOString(),
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating production order for non-existent location', async () => {
    const cookies = await getAuthCookies();
    if (!recipeId) {
        console.log('Skipping test - missing recipe ID');
        return;
      }

      const fakeLocationId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          recipeId,
          locationId: fakeLocationId,
          plannedQtyBase: 10,
          scheduledAt: new Date().toISOString(),
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should validate required production order fields', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/production-orders',
        headers: {
          Cookie: cookies
        },
        payload: {
          // Missing required fields
          plannedQtyBase: 10,
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});