import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Waste Management', () => {
  let app: any;
  let productId: string;
  let locationId: string;
  let uomId: string;
  let lotId: string;
  let wasteRecordId: string;

  beforeAll(async () => {
    app = await getTestApp();
    const cookies = await getAuthCookies();

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
      // Use the base UOM of the first product
      uomId = productsPayload.data[0].baseUomId;
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

    // Create a lot for testing
    if (productId && locationId) {
      const lotResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        headers: {
          Cookie: cookies
        },
        payload: {
          productId,
          locationId,
          lotNo: 'WASTE-LOT-001',
          notes: 'Lot for waste testing',
        }
      });

      if (lotResponse.statusCode === 201) {
        const lotPayload = lotResponse.json();
        lotId = lotPayload.data.id;
      } else {
        console.log('Lot creation failed:', lotResponse.statusCode, lotResponse.json());
      }

      // Add some stock to the lot for waste recording
      if (lotId) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/movements',
          headers: {
            Cookie: cookies
          },
          payload: {
            productId,
            locationId,
            lotId,
            quantity: 100,
            unitCost: 2.50,
            refType: 'ADJ',
            refId: '123e4567-e89b-12d3-a456-426614174000',
            note: 'Initial stock for waste testing',
          }
        });
      }
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Waste Records Management', () => {
    it('should list all waste records', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/waste/records',
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

    it('should create a new waste record', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const newWasteRecord = {
        locationId,
        reason: 'spoilage',
        notes: 'Products expired due to temperature control failure',
        items: [
          {
            productId,
            lotId,
            uomId,
            quantity: 5,
            unitCost: 2.50,
            estimatedValue: 12.50,
            reason: 'Spoiled ingredients',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/records',
        headers: {
          Cookie: cookies
        },
        payload: newWasteRecord
      });

      if (response.statusCode !== 201) {
        console.log('=== WASTE CREATION FAILED ===');
        console.log('Status:', response.statusCode);
        console.log('Headers:', response.headers);
        console.log('Body:', response.json());
      }

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('reason', 'spoilage');
      expect(payload.data).toHaveProperty('status', 'draft');
      expect(payload.data).toHaveProperty('items');
      expect(Array.isArray(payload.data.items)).toBe(true);
      expect(payload.data.items[0]).toHaveProperty('qtyDelta', '-5.000000');
      wasteRecordId = payload.data.id;
    });

    it('should get waste record by ID', async () => {
    const cookies = await getAuthCookies();
    if (!wasteRecordId) {
        console.log('Skipping test - missing waste record ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/waste/records/${wasteRecordId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id', wasteRecordId);
      expect(payload.data).toHaveProperty('items');
      expect(payload.data).toHaveProperty('totalValue');
      expect(payload.data).toHaveProperty('totalQuantity');
    });

    it('should approve and post waste record', async () => {
    const cookies = await getAuthCookies();
    if (!wasteRecordId) {
        console.log('Skipping test - missing waste record ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/waste/records/${wasteRecordId}/approve`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'posted');
      expect(payload.data).toHaveProperty('approvedAt');
    });

    it('should filter waste records by reason', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/waste/records?reason=spoilage',
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter waste records by status', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/waste/records?status=posted',
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter waste records by location', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/waste/records?locationId=${locationId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter waste records by date range', async () => {
      const cookies = await getAuthCookies();
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/waste/records?dateFrom=${today}&dateTo=${tomorrow}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create waste record for damage', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const damageRecord = {
        locationId,
        reason: 'damage',
        notes: 'Products damaged during handling',
        items: [
          {
            productId,
            uomId,
            quantity: 3,
            unitCost: 2.50,
            estimatedValue: 7.50,
            reason: 'Container dropped',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/records',
        headers: {
          Cookie: cookies
        },
        payload: damageRecord
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'damage');
    });

    it('should create waste record for expiry', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const expiryRecord = {
        locationId,
        reason: 'expiry',
        notes: 'Products reached expiration date',
        items: [
          {
            productId,
            lotId,
            uomId,
            quantity: 2,
            unitCost: 2.50,
            estimatedValue: 5.00,
            reason: 'Expired items',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/records',
        headers: {
          Cookie: cookies
        },
        payload: expiryRecord
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'expiry');
    });

    it('should return 404 for non-existent waste record', async () => {
      const cookies = await getAuthCookies();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/waste/records/${fakeId}`,
        headers: {
          Cookie: cookies
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating waste record for non-existent location', async () => {
      const cookies = await getAuthCookies();
      if (productId && uomId) {
        const fakeLocationId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/waste/records',
          headers: {
            Cookie: cookies
          },
          payload: {
            locationId: fakeLocationId,
            reason: 'damage',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 400 when creating waste record with non-existent product', async () => {
      const cookies = await getAuthCookies();
      if (locationId && uomId) {
        const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/waste/records',
          headers: {
            Cookie: cookies
          },
          payload: {
            locationId,
            reason: 'damage',
            items: [
              {
                productId: fakeProductId,
                uomId,
                quantity: 1,
              },
            ],
          }
        });

        expect(response.statusCode).toBe(400);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should validate required waste record fields', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/records',
        headers: {
          Cookie: cookies
        },
        payload: {
          // Missing required fields
          notes: 'Incomplete waste record',
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one item in waste record', async () => {
      const cookies = await getAuthCookies();
      if (locationId) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/waste/records',
          headers: {
            Cookie: cookies
          },
          payload: {
            locationId,
            reason: 'damage',
            items: [], // Empty items array
          }
        });

        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('Waste Analysis', () => {
    it('should get waste analysis', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/analysis',
        headers: {
          Cookie: cookies
        },
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
      expect(payload.data.summary).toHaveProperty('totalRecords');
      expect(payload.data.summary).toHaveProperty('totalValue');
      expect(payload.data.summary).toHaveProperty('totalQuantity');
      expect(payload.data.summary).toHaveProperty('averageValuePerRecord');

      // Check arrays
      expect(Array.isArray(payload.data.byReason)).toBe(true);
      expect(Array.isArray(payload.data.byProduct)).toBe(true);
      expect(Array.isArray(payload.data.byLocation)).toBe(true);
    });

    it('should get waste analysis filtered by reason', async () => {
      const cookies = await getAuthCookies();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/analysis',
        headers: {
          Cookie: cookies
        },
        payload: {
          reason: 'spoilage',
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data.byReason).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            reason: 'spoilage',
          })
        ])
      );
    });

    it('should get waste analysis filtered by location', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/analysis',
        headers: {
          Cookie: cookies
        },
        payload: {
          locationId,
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
    });

    it('should get waste analysis filtered by date range', async () => {
      const cookies = await getAuthCookies();
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/analysis',
        headers: {
          Cookie: cookies
        },
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

    it('should get waste analysis filtered by product', async () => {
    const cookies = await getAuthCookies();
    if (!productId) {
        console.log('Skipping test - missing product ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/waste/analysis',
        headers: {
          Cookie: cookies
        },
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



