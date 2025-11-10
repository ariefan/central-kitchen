import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Inventory Adjustments', () => {
  let app: any;
  let productId: string;
  let locationId: string;
  let uomId: string;
  let lotId: string;
  let adjustmentId: string;

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
      // Use the base UOM of the first product
      uomId = productsPayload.data[0].baseUomId;
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

    // Create a lot for testing
    if (productId && locationId) {
      const lotResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: {
          productId,
          locationId,
          lotNo: 'ADJ-LOT-001',
          notes: 'Lot for adjustments testing',
        }
      });

      if (lotResponse.statusCode === 201) {
        const lotPayload = lotResponse.json();
        lotId = lotPayload.data.id;
      }

      // Add some stock to the lot for adjustments
      if (lotId) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/movements',
          payload: {
            productId,
            locationId,
            lotId,
            quantity: 100,
            unitCost: 3.50,
            refType: 'ADJ',
            refId: '123e4567-e89b-12d3-a456-426614174000',
            note: 'Initial stock for adjustments testing',
          }
        });
      }
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Stock Adjustments Management', () => {
    it('should list all stock adjustments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/adjustments'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a damage adjustment', async () => {
      if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const newAdjustment = {
        locationId,
        reason: 'damage',
        notes: 'Products damaged during handling',
        items: [
          {
            productId,
            lotId,
            uomId,
            qtyDelta: -5, // Reduce stock for damage
            unitCost: 3.50,
            reason: 'Container dropped',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: newAdjustment
      });

      // Debug: Log the actual response if it fails
      if (response.statusCode !== 201) {
        console.log('=== ADJUSTMENT CREATION FAILED ===');
        console.log('Status:', response.statusCode);
        console.log('Headers:', response.headers);
        console.log('Body:', response.json());
        console.log('Request payload:', newAdjustment);
      }

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('reason', 'damage');
      expect(payload.data).toHaveProperty('status', 'draft');
      expect(payload.data).toHaveProperty('items');
      expect(Array.isArray(payload.data.items)).toBe(true);
      expect(payload.data.items[0]).toHaveProperty('qtyDelta', '-5.000000');
      adjustmentId = payload.data.id;
    });

    it('should create an expiry adjustment', async () => {
      if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const expiryAdjustment = {
        locationId,
        reason: 'expiry',
        notes: 'Products reached expiration date',
        items: [
          {
            productId,
            lotId,
            uomId,
            qtyDelta: -3,
            unitCost: 3.50,
            reason: 'Expired items',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: expiryAdjustment
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'expiry');
      expect(payload.data).toHaveProperty('status', 'draft');
    });

    it('should create a theft adjustment', async () => {
      if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const theftAdjustment = {
        locationId,
        reason: 'theft',
        notes: 'Missing items due to theft',
        items: [
          {
            productId,
            uomId,
            qtyDelta: -2,
            unitCost: 3.50,
            reason: 'Theft incident',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: theftAdjustment
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'theft');
    });

    it('should create a found adjustment', async () => {
      if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const foundAdjustment = {
        locationId,
        reason: 'found',
        notes: 'Found missing items during inventory count',
        items: [
          {
            productId,
            uomId,
            qtyDelta: 1,
            unitCost: 3.50,
            reason: 'Found during count',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: foundAdjustment
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'found');
      expect(payload.data.items[0]).toHaveProperty('qtyDelta', '1.000000');
    });

    it('should create a correction adjustment', async () => {
      if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const correctionAdjustment = {
        locationId,
        reason: 'correction',
        notes: 'System data correction',
        items: [
          {
            productId,
            uomId,
            qtyDelta: -1,
            unitCost: 3.50,
            reason: 'Data entry error',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: correctionAdjustment
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'correction');
    });

    it('should get adjustment by ID', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/adjustments/${adjustmentId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id', adjustmentId);
      expect(payload.data).toHaveProperty('items');
      expect(payload.data).toHaveProperty('location');
      expect(payload.data).toHaveProperty('adjNumber');
    });

    it('should filter adjustments by reason', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/adjustments?reason=damage'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter adjustments by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/adjustments?status=draft'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter adjustments by location', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/adjustments?locationId=${locationId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter adjustments by date range', async () => {
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/adjustments?dateFrom=${today}&dateTo=${tomorrow}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should search adjustments by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/adjustments?search=damaged'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should update adjustment basic information', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/adjustments/${adjustmentId}`,
        payload: {
          reason: 'correction',
          notes: 'Updated notes for adjustment',
        }
      });

      if (response.statusCode !== 200) {
        console.log('=== ADJUSTMENT UPDATE FAILED ===');
        console.log('Status:', response.statusCode);
        console.log('Headers:', response.headers);
        console.log('Body:', response.json());
      }

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'correction');
    });

    it('should approve adjustment', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/adjustments/${adjustmentId}/approve`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'approved');
      expect(payload.data).toHaveProperty('approvedAt');
    });

    it('should post approved adjustment to stock ledger', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/adjustments/${adjustmentId}/post`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'posted');
    });

    it('should return 404 for non-existent adjustment', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/adjustments/${fakeId}`
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating adjustment for non-existent location', async () => {
      if (productId && uomId) {
        const fakeLocationId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/adjustments',
          payload: {
            locationId: fakeLocationId,
            reason: 'damage',
            items: [
              {
                productId,
                uomId,
                qtyDelta: -1,
              },
            ],
          }
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 400 when creating adjustment with non-existent product', async () => {
      if (locationId && uomId) {
        const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/adjustments',
          payload: {
            locationId,
            reason: 'damage',
            items: [
              {
                productId: fakeProductId,
                uomId,
                qtyDelta: -1,
              },
            ],
          }
        });

        expect(response.statusCode).toBe(400);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should validate required adjustment fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments',
        payload: {
          // Missing required fields
          notes: 'Incomplete adjustment',
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one item in adjustment', async () => {
      if (locationId) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/adjustments',
          payload: {
            locationId,
            reason: 'damage',
            items: [], // Empty items array
          }
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should prevent updates when adjustment is posted', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      // Try to update a posted adjustment
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/adjustments/${adjustmentId}`,
        payload: {
          reason: 'Should not update',
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent approval of non-draft adjustments', async () => {
      if (!adjustmentId) {
        console.log('Skipping test - missing adjustment ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/adjustments/${adjustmentId}/approve`
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent posting of non-approved adjustments', async () => {
      // Create a new adjustment that won't be approved
      if (productId && locationId && uomId) {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/adjustments',
          payload: {
            locationId,
            reason: 'damage',
            items: [
              {
                productId,
                uomId,
                qtyDelta: -1,
              },
            ],
          }
        });

        const newAdjustmentId = createResponse.json().data.id;

        // Try to post without approval
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/adjustments/${newAdjustmentId}/post`
        });

        expect(response.statusCode).toBe(400);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });
  });

  describe('Adjustments Analysis', () => {
    it('should get adjustments analysis', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments/analysis',
        payload: {
          // No filters - get all data
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('summary');
      expect(payload.data).toHaveProperty('byReason');
      expect(payload.data).toHaveProperty('byProduct');
      expect(payload.data).toHaveProperty('byLocation');
      expect(payload.data).toHaveProperty('period');

      // Check summary structure
      expect(payload.data.summary).toHaveProperty('totalAdjustments');
      expect(payload.data.summary).toHaveProperty('totalValue');
      expect(payload.data.summary).toHaveProperty('totalQuantity');
      expect(payload.data.summary).toHaveProperty('averageValuePerAdjustment');

      // Check arrays
      expect(Array.isArray(payload.data.byReason)).toBe(true);
      expect(Array.isArray(payload.data.byProduct)).toBe(true);
      expect(Array.isArray(payload.data.byLocation)).toBe(true);
    });

    it('should get adjustments analysis filtered by reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments/analysis',
        payload: {
          reason: 'damage',
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
        expect(payload).toHaveProperty('success', true);
      expect(payload.data.byReason).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            reason: 'damage',
          })
        ])
      );
    });

    it('should get adjustments analysis filtered by location', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments/analysis',
        payload: {
          locationId,
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
    });

    it('should get adjustments analysis filtered by date range', async () => {
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments/analysis',
        payload: {
          dateFrom: today,
          dateTo: tomorrow,
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.period.from).toBe(today);
      expect(payload.data.period.to).toBe(tomorrow);
    });

    it('should get adjustments analysis filtered by product', async () => {
      if (!productId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/adjustments/analysis',
        payload: {
          productId,
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
    });
  });
});