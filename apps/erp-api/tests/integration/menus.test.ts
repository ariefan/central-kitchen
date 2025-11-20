import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Menu Management', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Menu CRUD Operations', () => {
    let testMenuId: string;
    let testProductId: string;

    it('should create a new menu', async () => {
      const cookies = await getAuthCookies();
      // Get an existing product from seeded data
      const productsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
        headers: {
          Cookie: cookies
        }
      });

      const productsPayload = productsResponse.json();
      if (productsPayload.data.items && productsPayload.data.items.length > 0) {
        testProductId = productsPayload.data.items[0].id;
      } else {
        // Fallback: create a test product with required baseUomId
        // This should work if seeded data exists
        const productResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/products',
          headers: {
            Cookie: cookies
          },
          payload: {
            name: 'Test Menu Product',
            sku: 'MENU-001',
            kind: 'finished_good',
            defaultPrice: 10.00,
            baseUomId: '00000000-0000-0000-0000-000000000001', // This should match PCS UOM
          }
        });

        expect(productResponse.statusCode).toBe(201);
        const productData = productResponse.json();
        testProductId = productData.data.id;
      }

      // Create a menu
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/menus',
        headers: {
          Cookie: cookies
        },
        payload: {
          name: 'Test Breakfast Menu',
          channel: 'pos',
          isActive: true,
        }
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data.name).toBe('Test Breakfast Menu');
      expect(payload.data.channel).toBe('pos');
      expect(payload.data.isActive).toBe(true);

      testMenuId = payload.data.id;
    });

    it('should get all menus', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/menus',
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toBeInstanceOf(Array);
      expect(payload.data.length).toBeGreaterThan(0);
    });

    it('should get menu by ID', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/menus/${testMenuId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.id).toBe(testMenuId);
      expect(payload.data.name).toBe('Test Breakfast Menu');
    });

      it('should add items to menu', async () => {
        const cookies = await getAuthCookies();
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/menus/${testMenuId}/items`,
          headers: {
            Cookie: cookies
          },
          payload: {
            productId: testProductId,
            isAvailable: true,
            sortOrder: 1,
          }
        });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.productId).toBe(testProductId);
      expect(payload.data.isAvailable).toBe(true);
      expect(payload.data.sortOrder).toBe(1);
    });

    it('should get menu items', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/menus/${testMenuId}/items`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toBeInstanceOf(Array);
      expect(payload.data.length).toBeGreaterThan(0);
      expect(payload.data[0]).toHaveProperty('product');
    });

    it('should update menu', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/menus/${testMenuId}`,
        headers: {
          Cookie: cookies
        },
        payload: {
          name: 'Updated Breakfast Menu',
          isActive: false,
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.name).toBe('Updated Breakfast Menu');
      expect(payload.data.isActive).toBe(false);
    });

    it('should delete menu', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/menus/${testMenuId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.id).toBe(testMenuId);
    });

    it('should return 404 for non-existent menu', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/menus/00000000-0000-0000-0000-000000000000',
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });
});