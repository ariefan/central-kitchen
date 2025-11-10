import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../src/app';
import { config as loadEnv } from 'dotenv';

// Load test environment variables
loadEnv({ path: '.env.test', override: true });

describe('Menu Management', () => {
  let app: any;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Menu CRUD Operations', () => {
    let testMenuId: string;
    let testProductId: string;

    it('should create a new menu', async () => {
      // Get an existing product from seeded data
      const productsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/products'
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
          payload: {
            name: 'Test Menu Product',
            sku: 'MENU-001',
            kind: 'finished_good',
            defaultPrice: 10.00,
            baseUomId: '00000000-0000-0000-0000-000000000001', // This should match PCS UOM
          },
        });

        expect(productResponse.statusCode).toBe(201);
        const productData = productResponse.json();
        testProductId = productData.data.id;
      }

      // Create a menu
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/menus',
        payload: {
          name: 'Test Breakfast Menu',
          channel: 'pos',
          isActive: true,
        },
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
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/menus',
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toBeInstanceOf(Array);
      expect(payload.data.length).toBeGreaterThan(0);
    });

    it('should get menu by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/menus/${testMenuId}`,
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.id).toBe(testMenuId);
      expect(payload.data.name).toBe('Test Breakfast Menu');
    });

      it('should add items to menu', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/menus/${testMenuId}/items`,
        payload: {
          productId: testProductId,
          isAvailable: true,
          sortOrder: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.productId).toBe(testProductId);
      expect(payload.data.isAvailable).toBe(true);
      expect(payload.data.sortOrder).toBe(1);
    });

    it('should get menu items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/menus/${testMenuId}/items`,
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toBeInstanceOf(Array);
      expect(payload.data.length).toBeGreaterThan(0);
      expect(payload.data[0]).toHaveProperty('product');
    });

    it('should update menu', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/menus/${testMenuId}`,
        payload: {
          name: 'Updated Breakfast Menu',
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.name).toBe('Updated Breakfast Menu');
      expect(payload.data.isActive).toBe(false);
    });

    it('should delete menu', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/menus/${testMenuId}`,
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.id).toBe(testMenuId);
    });

    it('should return 404 for non-existent menu', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/menus/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});