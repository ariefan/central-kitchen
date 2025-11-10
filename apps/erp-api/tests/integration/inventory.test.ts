import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Inventory', () => {
  let app: any;
  let productId: string;
  let locationId: string;
  let lotId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get a product for testing
    const productsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });
    const productsPayload = productsResponse.json();

    if (productsPayload.data && productsPayload.data.length > 0) {
      productId = productsPayload.data[0].id;
    }

    // Get a location for testing
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/locations'
    });
    const locationsPayload = locationsResponse.json();

    if (locationsPayload.data && locationsPayload.data.length > 0) {
      locationId = locationsPayload.data[0].id;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Lot Management', () => {
    it('should list all inventory lots', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory/lots'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a new lot', async () => {
      if (!productId || !locationId) {
        console.log('Skipping test - missing product or location ID');
        return;
      }

      const timestamp = Date.now();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
      const manufactureDate = new Date().toISOString();

      const newLot = {
        productId,
        locationId,
        lotNo: `LOT-${timestamp}`,
        expiryDate,
        manufactureDate,
        notes: 'Test lot for inventory tracking',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: newLot
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('productId', productId);
      expect(payload.data).toHaveProperty('locationId', locationId);
      expect(payload.data).toHaveProperty('lotNo', `LOT-${timestamp}`);
      lotId = payload.data.id;
    });

    it('should get lot by ID', async () => {
      if (!lotId) {
        console.log('Skipping test - missing lot ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/lots/${lotId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id', lotId);
      expect(payload.data).toHaveProperty('product');
      expect(payload.data).toHaveProperty('location');
      expect(payload.data).toHaveProperty('currentStock');
      expect(payload.data).toHaveProperty('movements');
      expect(Array.isArray(payload.data.movements)).toBe(true);
    });

    it('should filter lots by location', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/lots?locationId=${locationId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter lots by product', async () => {
      if (!productId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/lots?productId=${productId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should search lots by lot number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory/lots?lotNo=LOT'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent lot', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/lots/${fakeId}`
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating lot for non-existent product', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: {
          productId: fakeProductId,
          locationId,
          lotNo: 'FAKE-LOT',
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent duplicate lot numbers for same product/location', async () => {
      if (!productId || !locationId) {
        console.log('Skipping test - missing product or location ID');
        return;
      }

      // Create first lot
      await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: {
          productId,
          locationId,
          lotNo: 'DUPLICATE-TEST',
        }
      });

      // Try to create second lot with same number
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: {
          productId,
          locationId,
          lotNo: 'DUPLICATE-TEST',
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });
  });

  describe('Stock Movements', () => {
    it('should record stock movement (receipt)', async () => {
      if (!productId || !locationId || !lotId) {
        console.log('Skipping test - missing IDs');
        return;
      }

      const movement = {
        productId,
        locationId,
        lotId,
        quantity: 100,
        unitCost: 5.50,
        refType: 'PO',
        refId: '123e4567-e89b-12d3-a456-426614174000',
        note: 'Initial stock receipt',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/movements',
        payload: movement
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('type', 'rcv');
      expect(payload.data).toHaveProperty('qtyDeltaBase', '100.000000');
      expect(payload.data).toHaveProperty('unitCost', '5.500000');
    });

    it('should record stock movement (issuance)', async () => {
      if (!productId || !locationId || !lotId) {
        console.log('Skipping test - missing IDs');
        return;
      }

      const movement = {
        productId,
        locationId,
        lotId,
        quantity: -25,
        refType: 'PROD',
        refId: '123e4567-e89b-12d3-a456-426614174001',
        note: 'Stock issued for production',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/movements',
        payload: movement
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('type', 'iss');
      expect(payload.data).toHaveProperty('qtyDeltaBase', '-25.000000');
    });

    it('should return 404 for movement with non-existent product', async () => {
      if (locationId) {
        const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/movements',
          payload: {
            productId: fakeProductId,
            locationId,
            quantity: 10,
            refType: 'ADJ',
            refId: '123e4567-e89b-12d3-a456-426614174000',
          }
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 404 for movement with non-existent lot', async () => {
      if (productId && locationId) {
        const fakeLotId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/movements',
          payload: {
            productId,
            locationId,
            lotId: fakeLotId,
            quantity: 10,
            refType: 'ADJ',
            refId: '123e4567-e89b-12d3-a456-426614174000',
          }
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });
  });

  describe('Inventory Valuation', () => {
    it('should calculate inventory valuation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/valuation',
        payload: {
          costMethod: 'average',
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('totalValue');
      expect(payload.data).toHaveProperty('locationBreakdown');
      expect(payload.data).toHaveProperty('productBreakdown');
      expect(payload.data).toHaveProperty('costMethod', 'average');
      expect(payload.data).toHaveProperty('calculatedAt');
      expect(Array.isArray(payload.data.locationBreakdown)).toBe(true);
      expect(Array.isArray(payload.data.productBreakdown)).toBe(true);
    });

    it('should calculate inventory valuation for specific location', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/valuation',
        payload: {
          locationId,
          costMethod: 'fifo',
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('costMethod', 'fifo');
    });

    it('should calculate inventory valuation for specific product', async () => {
      if (!productId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/valuation',
        payload: {
          productId,
          costMethod: 'average',
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
    });
  });

  describe('Product Cost Analysis', () => {
    it('should get product cost analysis', async () => {
      if (!productId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/cost/${productId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('productId', productId);
      expect(payload.data).toHaveProperty('productName');
      expect(payload.data).toHaveProperty('currentStock');
      expect(payload.data).toHaveProperty('averageCost');
      expect(payload.data).toHaveProperty('totalValue');
      expect(payload.data).toHaveProperty('lots');
      expect(payload.data).toHaveProperty('costTrend');
      expect(Array.isArray(payload.data.lots)).toBe(true);
      expect(Array.isArray(payload.data.costTrend)).toBe(true);
    });

    it('should get product cost analysis for specific location', async () => {
      if (!productId || !locationId) {
        console.log('Skipping test - missing IDs');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/cost/${productId}?locationId=${locationId}&costMethod=average`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('productId', productId);
    });

    it('should return 404 for non-existent product cost analysis', async () => {
      const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/cost/${fakeProductId}`
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });
  });
});