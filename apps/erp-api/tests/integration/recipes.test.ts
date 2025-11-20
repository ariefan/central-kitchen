import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

const extractList = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }
  return [];
};

describe('Recipes', () => {
  let app: any;
  let finishedProductId: string;
  let ingredientProductId: string;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();
    
    // Get products for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: {
        Cookie: cookies
      }
    });
    const productsPayload = productsResponse.json();

    const productList = extractList(productsPayload);
    if (productList.length >= 2) {
      // Look for suitable products (raw material and finished good)
      const rawMaterial = productList.find((p: any) => p.kind === 'raw_material');
      const finishedGood = productList.find((p: any) => p.kind === 'finished_good');

      ingredientProductId = rawMaterial?.id || productList[0].id;
      finishedProductId = finishedGood?.id || productList[1].id;
    } else {
      // Create test products if needed
      const ingredientResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
      headers: {
          Cookie: cookies
        },
        payload: {
          name: 'Test Recipe Ingredient',
          sku: 'ING-001',
          kind: 'raw_material',
          baseUomId: '00000000-0000-0000-0000-000000000001', // Assuming this exists
        }
      });
      const ingredientPayload = ingredientResponse.json();
      ingredientProductId = ingredientPayload.data.id;

      const finishedResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
      headers: {
          Cookie: cookies
        },
        payload: {
          name: 'Test Finished Product',
          sku: 'FIN-001',
          kind: 'finished_good',
          baseUomId: '00000000-0000-0000-0000-000000000001',
        }
      });
      const finishedPayload = finishedResponse.json();
      finishedProductId = finishedPayload.data.id;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Recipe Management', () => {
    it('should list all recipes', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a new recipe', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      const timestamp = Date.now();
      const newRecipe = {
        code: `RECIPE-${timestamp}`,
        name: 'Test Recipe',
        finishedProductId,
        yieldQtyBase: 10,
        instructions: 'Mix ingredients and bake',
        items: [
          {
            productId: ingredientProductId,
            qtyBase: 5,
            sortOrder: 0,
            notes: 'Main ingredient',
          },
        ],
      };

      const response = await app.inject({
      method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: newRecipe
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('code', `RECIPE-${timestamp}`);
      expect(payload.data).toHaveProperty('name', 'Test Recipe');
      expect(payload.data).toHaveProperty('yieldQtyBase', '10.000000');
      expect(payload.data).toHaveProperty('version', 1);
    });

    it('should get recipe by ID', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      // First create a recipe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'GET-RECIPE-123',
          name: 'Get Test Recipe',
          finishedProductId,
          yieldQtyBase: 8,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 4,
              sortOrder: 0,
            },
          ],
        }
      });

      const createPayload = createResponse.json();
      const recipeId = createPayload.data.id;

      // Then get it by ID
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/recipes/${recipeId}`
      });

      expect(getResponse.statusCode).toBe(200);
      const getPayload = getResponse.json();
      expect(getPayload).toHaveProperty('success', true);
      expect(getPayload.data).toHaveProperty('id', recipeId);
      expect(getPayload.data).toHaveProperty('code', 'GET-RECIPE-123');
      expect(getPayload.data).toHaveProperty('ingredients');
      expect(Array.isArray(getPayload.data.ingredients)).toBe(true);
    });

    it('should calculate recipe cost', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      // First create a recipe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'COST-RECIPE-123',
          name: 'Cost Test Recipe',
          finishedProductId,
          yieldQtyBase: 12,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 6,
              sortOrder: 0,
            },
          ],
        }
      });

      const createPayload = createResponse.json();
      const recipeId = createPayload.data.id;

      // Calculate cost
      const costResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/recipes/${recipeId}/cost`
      });

      expect(costResponse.statusCode).toBe(200);
      const costPayload = costResponse.json();
      expect(costPayload).toHaveProperty('success', true);
      expect(costPayload.data).toHaveProperty('recipeId', recipeId);
      expect(costPayload.data).toHaveProperty('recipeName', 'Cost Test Recipe');
      expect(costPayload.data).toHaveProperty('baseYieldQty', 12);
      expect(costPayload.data).toHaveProperty('scaleFactor', 1);
      expect(costPayload.data).toHaveProperty('totalCost');
      expect(costPayload.data).toHaveProperty('costPerUnit');
      expect(costPayload.data).toHaveProperty('ingredientCosts');
      expect(Array.isArray(costPayload.data.ingredientCosts)).toBe(true);
    });

    it('should scale recipe', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      // First create a recipe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'SCALE-RECIPE-123',
          name: 'Scale Test Recipe',
          finishedProductId,
          yieldQtyBase: 10,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 5,
              sortOrder: 0,
            },
          ],
        }
      });

      const createPayload = createResponse.json();
      const recipeId = createPayload.data.id;

      // Scale by factor 2
      const scaleResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/recipes/${recipeId}/scale`,
        payload: {
          scaleFactor: 2,
        }
      });

      expect(scaleResponse.statusCode).toBe(200);
      const scalePayload = scaleResponse.json();
      expect(scalePayload).toHaveProperty('success', true);
      expect(scalePayload.data).toHaveProperty('scaleFactor', 2);
      expect(scalePayload.data).toHaveProperty('originalYield', 10);
      expect(scalePayload.data).toHaveProperty('scaledYield', 20);
      expect(scalePayload.data).toHaveProperty('scaledIngredients');
      expect(Array.isArray(scalePayload.data.scaledIngredients)).toBe(true);
      expect(scalePayload.data.scaledIngredients[0]).toHaveProperty('quantity', 10);
    });

    it('should scale recipe by target yield', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      // First create a recipe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'SCALE-YIELD-RECIPE-123',
          name: 'Scale Yield Test Recipe',
          finishedProductId,
          yieldQtyBase: 10,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 5,
              sortOrder: 0,
            },
          ],
        }
      });

      const createPayload = createResponse.json();
      const recipeId = createPayload.data.id;

      // Scale to target yield 25 (scale factor = 2.5)
      const scaleResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/recipes/${recipeId}/scale`,
        payload: {
          targetYieldQty: 25,
        }
      });

      expect(scaleResponse.statusCode).toBe(200);
      const scalePayload = scaleResponse.json();
      expect(scalePayload).toHaveProperty('success', true);
      expect(scalePayload.data).toHaveProperty('scaleFactor', 2.5);
      expect(scalePayload.data).toHaveProperty('originalYield', 10);
      expect(scalePayload.data).toHaveProperty('scaledYield', 25);
      expect(scalePayload.data.scaledIngredients[0]).toHaveProperty('quantity', 12.5);
    });

    it('should update recipe', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId || !ingredientProductId) {
        console.log('Skipping test - missing product IDs');
        return;
      }

      // First create a recipe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'UPDATE-RECIPE-123',
          name: 'Update Test Recipe',
          finishedProductId,
          yieldQtyBase: 10,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 5,
              sortOrder: 0,
            },
          ],
        }
      });

      const createPayload = createResponse.json();
      const recipeId = createPayload.data.id;

      // Update recipe
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/recipes/${recipeId}`,
        payload: {
          name: 'Updated Recipe Name',
          yieldQtyBase: 15,
          instructions: 'Updated instructions',
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatePayload = updateResponse.json();
      expect(updatePayload).toHaveProperty('success', true);
      expect(updatePayload.data).toHaveProperty('name', 'Updated Recipe Name');
      expect(updatePayload.data).toHaveProperty('yieldQtyBase', '15.000000');
      expect(updatePayload.data).toHaveProperty('instructions', 'Updated instructions');
    });

    it('should filter recipes by status', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/recipes?isActive=true',
      headers: {
        Cookie: cookies
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should search recipes', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/recipes?search=Test',
      headers: {
        Cookie: cookies
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent recipe', async () => {
    const cookies = await getAuthCookies();
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/recipes/${fakeId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating recipe for non-existent finished product', async () => {
    const cookies = await getAuthCookies();
    const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
      method: 'POST',
        url: '/api/v1/recipes',
      headers: {
        Cookie: cookies
      },
      payload: {
          code: 'FAKE-RECIPE-123',
          name: 'Fake Recipe',
          finishedProductId: fakeProductId,
          yieldQtyBase: 10,
          items: [
            {
              productId: ingredientProductId,
              qtyBase: 5,
              sortOrder: 0,
            },
          ],
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should validate required recipe fields', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
        url: '/api/v1/recipes',
          headers: {
            Cookie: cookies
          },
        payload: {
          // Missing required fields
          name: 'Incomplete Recipe',
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one ingredient', async () => {
    const cookies = await getAuthCookies();
    if (!finishedProductId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: '/api/v1/recipes',
            headers: {
              Cookie: cookies
            },
        payload: {
          code: 'NO-INGREDIENTS-123',
          name: 'Recipe Without Ingredients',
          finishedProductId,
          yieldQtyBase: 10,
          items: [], // Empty items array
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
