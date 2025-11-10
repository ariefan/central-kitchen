import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

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

    // Get a customer for testing
    const customersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers'
    });
    const customersPayload = customersResponse.json();

    if (customersPayload.data && customersPayload.data.length > 0) {
      customerId = customersPayload.data[0].id;
    }

    // Get a supplier for testing
    const suppliersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers'
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
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/returns'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a new customer return order', async () => {
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
        payload: newReturnOrder
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
      expect(payload.data.items[0]).toHaveProperty('quantity', '5.000000');
      customerReturnId = payload.data.id;
    });

    it('should create a new supplier return order', async () => {
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
        payload: newReturnOrder
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
      if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns/${customerReturnId}`
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
        url: '/api/v1/returns?returnType=customer'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by type (supplier)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/returns?returnType=supplier'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/returns?status=requested'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by customer', async () => {
      if (!customerId) {
        console.log('Skipping test - missing customer ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns?customerId=${customerId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by supplier', async () => {
      if (!supplierId) {
        console.log('Skipping test - missing supplier ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns?supplierId=${supplierId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by location', async () => {
      if (!locationId) {
        console.log('Skipping test - missing location ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns?locationId=${locationId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter return orders by date range', async () => {
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns?dateFrom=${today}&dateTo=${tomorrow}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should update return order basic information', async () => {
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
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('reason', 'Updated reason for return');
    });

    it('should approve customer return order', async () => {
      if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/approve`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'approved');
      expect(payload.data).toHaveProperty('approvedAt');
    });

    it('should reject supplier return order', async () => {
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
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'rejected');
    });

    it('should complete approved return order', async () => {
      if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/complete`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('status', 'completed');
    });

    it('should search return orders by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/returns?search=defect'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent return order', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/returns/${fakeId}`
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating return order for non-existent location', async () => {
      if (productId && uomId && customerId) {
        const fakeLocationId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 404 when creating customer return for non-existent customer', async () => {
      if (productId && uomId && locationId) {
        const fakeCustomerId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 404 when creating supplier return for non-existent supplier', async () => {
      if (productId && uomId && locationId) {
        const fakeSupplierId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(404);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should return 400 when creating return order with non-existent product', async () => {
      if (locationId && uomId && customerId) {
        const fakeProductId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(400);
        const payload = response.json();
        expect(payload).toHaveProperty('success', false);
      }
    });

    it('should validate required return order fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/returns',
        payload: {
          // Missing required fields
          notes: 'Incomplete return order',
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one item in return order', async () => {
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
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should require customerId for customer returns', async () => {
      if (productId && locationId && uomId) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should require supplierId for supplier returns', async () => {
      if (productId && locationId && uomId) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/returns',
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
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should prevent updates when return is already processed', async () => {
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
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent approval of already approved returns', async () => {
      if (!customerReturnId) {
        console.log('Skipping test - missing customer return ID');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${customerReturnId}/approve`
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent rejection of already rejected returns', async () => {
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
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should prevent completion of non-approved returns', async () => {
      if (!supplierReturnId) {
        console.log('Skipping test - missing supplier return ID');
        return;
      }

      // Try to complete a rejected return order
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/returns/${supplierReturnId}/complete`
      });

      expect(response.statusCode).toBe(400);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });
  });
});