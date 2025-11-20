import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, getAuthCookies } from './test-setup';

describe('Returns Processing', () => {
  let app: any;
  let productId: string;
  let locationId: string;
  let uomId: string;
  let lotId: string;
  let customerId: string;
  let supplierId: string;
  let customerReturnId: string;
  let supplierReturnId: string;
  let postableReturnId: string;

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

    // Get a customer for testing
    const customersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: {
        Cookie: cookies
      }
    });
    const customersPayload = customersResponse.json();

    if (customersPayload.data && customersPayload.data.length > 0) {
      customerId = customersPayload.data[0].id;
    }

    // Get a supplier for testing
    const suppliersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers',
      headers: {
        Cookie: cookies
      }
    });
    const suppliersPayload = suppliersResponse.json();

    if (suppliersPayload.data && suppliersPayload.data.length > 0) {
      supplierId = suppliersPayload.data[0].id;
    }

    // Create a lot for testing
    if (productId && locationId) {
      const lotResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/inventory/lots',
        payload: {
          productId,
          locationId,
          lotNo: 'RETURNS-LOT-001',
          notes: 'Lot for returns testing',
        }
      }
    });

      if (lotResponse.statusCode === 201) {
        const lotPayload = lotResponse.json();
        lotId = lotPayload.data.id;
      }
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Return Orders Management', () => {
    it('should list all return orders', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/returns',
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

    it('should create a new customer return order', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId || !customerId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const newReturnOrder = {
        returnType: 'customer',
        referenceType: 'ORDER',
        referenceId: '123e4567-e89b-12d3-a456-426614174000',
        customerId,
        locationId,
        reason: 'Product defect - customer dissatisfied',
        totalAmount: 50.00,
        notes: 'Customer found product quality unsatisfactory',
        items: [
          {
            productId,
            lotId,
            uomId,
            quantity: 5,
            unitPrice: 10.00,
            reason: 'Wrong product delivered',
          },
        ],
      };

      const response = await app.inject({
      method: 'POST',
        url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: newReturnOrder
      }
    });

      if (response.statusCode !== 201) {
        console.log('=== RETURN CREATION FAILED ===');
        console.log('Status:', response.statusCode);
        console.log('Headers:', response.headers);
        console.log('Body:', response.json());
      }

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('returnType', 'customer');
      expect(payload.data).toHaveProperty('status', 'requested');
      expect(payload.data).toHaveProperty('items');
      expect(Array.isArray(payload.data.items)).toBe(true);
      expect(payload.data.items[0]).toHaveProperty('item');
      expect(payload.data.items[0]?.item).toHaveProperty('quantity', '5.000000');
      customerReturnId = payload.data.id;
    });

    it('should create a new supplier return order', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId || !supplierId) {
        console.log('Skipping test - missing required IDs');
        return;
      }

      const newReturnOrder = {
        returnType: 'supplier',
        referenceType: 'PO',
        referenceId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId,
        locationId,
        reason: 'Supplier goods damaged during shipping',
        totalAmount: 75.00,
        notes: 'Damaged packaging upon receipt',
        items: [
          {
            productId,
            uomId,
            quantity: 3,
            unitPrice: 25.00,
            reason: 'Damaged packaging',
          },
        ],
      };

      const response = await app.inject({
      method: 'POST',
        url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: newReturnOrder
      }
    });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('returnType', 'supplier');
      expect(payload.data).toHaveProperty('status', 'requested');
      expect(payload.data).toHaveProperty('items');
      expect(Array.isArray(payload.data.items)).toBe(true);
      supplierReturnId = payload.data.id;
    });

    it('should get return order by ID', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns/${customerReturnId}`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id', customerReturnId);
      expect(payload.data).toHaveProperty('items');
      expect(payload.data).toHaveProperty('customer');
      expect(payload.data).toHaveProperty('totalAmount');
    });

    it('should filter return orders by type (customer)', async () => {
      const response = await app.inject({
      method: 'GET',
        url: '/api/v1/returns?returnType=customer',
      headers: {
        Cookie: cookies
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by type (supplier)', async () => {
      const response = await app.inject({
      method: 'GET',
        url: '/api/v1/returns?returnType=supplier',
      headers: {
        Cookie: cookies
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by status', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/returns?status=requested',
      headers: {
        Cookie: cookies
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by customer', async () => {
    const cookies = await getAuthCookies();
    if (!customerId) {
        console.log('Skipping test - missing customer ID');
        return;
      }

      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns?customerId=${customerId}`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by supplier', async () => {
    const cookies = await getAuthCookies();
    if (!supplierId) {
        console.log('Skipping test - missing supplier ID');
        return;
      }

      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns?supplierId=${supplierId}`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by location', async () => {
    const cookies = await getAuthCookies();
    if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns?locationId=${locationId}`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by date range', async () => {
    const cookies = await getAuthCookies();
    const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns?dateFrom=${today}&dateTo=${tomorrow}`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should update return order basic information', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
      method: 'PATCH',
        url: `/api/v1/returns/${customerReturnId}`,
        payload: {
          reason: 'Updated reason for return',
          notes: 'Updated notes with additional details',
        }
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'Updated reason for return');
    });

    it('should approve customer return order', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/approve`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'approved');
      expect(payload.data).toHaveProperty('approvedAt');
    });

    it('should reject supplier return order', async () => {
    const cookies = await getAuthCookies();
    if (!supplierReturnId) {
        console.log('Skipping test - missing supplier return ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${supplierReturnId}/reject`,
        payload: {
          reason: 'Return period expired',
        }
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'rejected');
    });

    it('should complete approved return order', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/complete`
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'completed');
    });

    it('should post an approved return order to the ledger', async () => {
    const cookies = await getAuthCookies();
    if (!productId || !locationId || !uomId || !customerId) {
        console.log('Skipping test - missing required IDs for posting');
        return;
      }

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
          returnType: 'customer',
          referenceType: 'ORDER',
          referenceId: '123e4567-e89b-12d3-a456-426614174001',
          customerId,
          locationId,
          reason: 'Posting workflow verification',
          totalAmount: 30.0,
          items: [
            {
              productId,
              uomId,
              quantity: 3,
              unitPrice: 10,
              notes: 'Posting test item',
            },
          ],
        },
      }
    });

      expect(createResponse.statusCode).toBe(201);
      postableReturnId = createResponse.json().data.id;

      const approveResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${postableReturnId}/approve`,
      }
    });
      expect(approveResponse.statusCode).toBe(200);

      const postResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${postableReturnId}/post`,
      }
    });

      expect(postResponse.statusCode).toBe(200);
      const postPayload = postResponse.json();
      expect(postPayload).toHaveProperty('success', true);
      expect(postPayload.data).toHaveProperty('status', 'posted');
      expect(postPayload.data).toHaveProperty('items');
      expect(Array.isArray(postPayload.data.items)).toBe(true);
      expect(postPayload.data.items[0]).toHaveProperty('item');
    });

    it('should search return orders by text', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'GET',
        url: '/api/v1/returns?search=defect',
      headers: {
        Cookie: cookies
      }
    });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent return order', async () => {
    const cookies = await getAuthCookies();
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
      method: 'GET',
        url: `/api/v1/returns/${fakeId}`
      }
    });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating return order for non-existent location', async () => {
    const cookies = await getAuthCookies();
    if (productId && uomId && customerId) {
        const fakeLocationId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'customer',
            customerId,
            locationId: fakeLocationId,
            reason: 'Test return',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 404 when creating customer return for non-existent customer', async () => {
    const cookies = await getAuthCookies();
    if (productId && uomId && locationId) {
        const fakeCustomerId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'customer',
            customerId: fakeCustomerId,
            locationId,
            reason: 'Test return',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 404 when creating supplier return for non-existent supplier', async () => {
    const cookies = await getAuthCookies();
    if (productId && uomId && locationId) {
        const fakeSupplierId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'supplier',
            supplierId: fakeSupplierId,
            locationId,
            reason: 'Test return',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 400 when creating return order with non-existent product', async () => {
    const cookies = await getAuthCookies();
    if (locationId && uomId && customerId) {
        const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'customer',
            customerId,
            locationId,
            reason: 'Test return',
            items: [
              {
                productId: fakeProductId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(400);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should validate required return order fields', async () => {
    const cookies = await getAuthCookies();
    const response = await app.inject({
      method: 'POST',
        url: '/api/v1/returns',
        payload: {
          // Missing required fields
          notes: 'Incomplete return order',
        }
      }
    });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one item in return order', async () => {
    const cookies = await getAuthCookies();
    if (locationId && customerId) {
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
          payload: {
            returnType: 'customer',
            customerId,
            locationId,
            reason: 'Test return',
            items: [], // Empty items array
          }
        }
    });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should require customerId for customer returns', async () => {
    const cookies = await getAuthCookies();
    if (productId && locationId && uomId) {
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'customer',
            // Missing customerId
            locationId,
            reason: 'Test return',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should require supplierId for supplier returns', async () => {
    const cookies = await getAuthCookies();
    if (productId && locationId && uomId) {
        const response = await app.inject({
      method: 'POST',
          url: '/api/v1/returns',
      headers: {
        Cookie: cookies
      },
      payload: {
            returnType: 'supplier',
            // Missing supplierId
            locationId,
            reason: 'Test return',
            items: [
              {
                productId,
                uomId,
                quantity: 1,
              },
            ],
          }
        }
    });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should prevent updates when return is already processed', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      // Try to update a completed return order
      const response = await app.inject({
      method: 'PATCH',
        url: `/api/v1/returns/${customerReturnId}`,
        payload: {
          reason: 'Should not update',
        }
      }
    });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent approval of already approved returns', async () => {
    const cookies = await getAuthCookies();
    if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/approve`
      }
    });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent rejection of already rejected returns', async () => {
    const cookies = await getAuthCookies();
    if (!supplierReturnId) {
        console.log('Skipping test - missing supplier return ID');
        return;
      }

      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${supplierReturnId}/reject`,
        payload: {
          reason: 'Should not reject',
        }
      }
    });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent completion of non-approved returns', async () => {
    const cookies = await getAuthCookies();
    if (!supplierReturnId) {
        console.log('Skipping test - missing supplier return ID');
        return;
      }

      // Try to complete a rejected return order
      const response = await app.inject({
      method: 'POST',
        url: `/api/v1/returns/${supplierReturnId}/complete`
      }
    });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });
  });
});
