import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './test-setup';

describe('Deliveries', () => {
  let app: any;
  let customerId: string;
  let orderId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Get a customer for testing
    const customersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers'
    });
    const customersPayload = customersResponse.json();
    if (customersPayload.data.items && customersPayload.data.items.length > 0) {
      customerId = customersPayload.data.items[0].id;
    } else {
      // Create a test customer
      const customerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        payload: {
          name: 'Test Customer for Delivery',
          email: 'delivery-test@example.com',
          phone: '+1234567890',
        }
      });
      const customerPayload = customerResponse.json();
      customerId = customerPayload.data.id;
    }

    // Get an order for testing
    const ordersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/orders'
    });
    const ordersPayload = ordersResponse.json();
    if (ordersPayload.data && ordersPayload.data.length > 0) {
      orderId = ordersPayload.data[0].id;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Delivery Management', () => {
    it('should list all deliveries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a new delivery', async () => {
      if (!orderId) {
        console.log('Skipping test - missing order ID');
        return;
      }

      const timestamp = Date.now();
      const newDelivery = {
        orderId,
        provider: 'Test Delivery Service',
        trackingCode: `TRACK-${timestamp}`,
        fee: 12.50,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: newDelivery
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('orderId', orderId);
      expect(payload.data).toHaveProperty('provider', 'Test Delivery Service');
      expect(payload.data).toHaveProperty('trackingCode', `TRACK-${timestamp}`);
      expect(payload.data).toHaveProperty('fee', '12.50');
      expect(payload.data).toHaveProperty('status', 'requested');
    });

    it('should get delivery by ID', async () => {
      if (!orderId) {
        console.log('Skipping test - missing order ID');
        return;
      }

      // First create a delivery
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          orderId,
          provider: 'Get Test Delivery',
          trackingCode: 'GET-TEST-123',
          fee: 8.75,
        }
      });

      const createPayload = createResponse.json();
      const deliveryId = createPayload.data.id;

      // Then get it by ID
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/deliveries/${deliveryId}`
      });

      expect(getResponse.statusCode).toBe(200);
      const getPayload = getResponse.json();
      expect(getPayload).toHaveProperty('success', true);
      expect(getPayload.data.deliveries).toHaveProperty('id', deliveryId);
      expect(getPayload.data.deliveries).toHaveProperty('provider', 'Get Test Delivery');
      expect(getPayload.data.deliveries).toHaveProperty('trackingCode', 'GET-TEST-123');
    });

    it('should update delivery status', async () => {
      if (!orderId) {
        console.log('Skipping test - missing order ID');
        return;
      }

      // First create a delivery
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          orderId,
          provider: 'Update Test Delivery',
        }
      });

      const createPayload = createResponse.json();
      const deliveryId = createPayload.data.id;

      // Then update its status
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deliveries/${deliveryId}`,
        payload: {
          status: 'assigned',
          provider: 'Updated Provider',
          trackingCode: 'UPDATED-123',
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatePayload = updateResponse.json();
      expect(updatePayload).toHaveProperty('success', true);
      expect(updatePayload.data).toHaveProperty('status', 'assigned');
      expect(updatePayload.data).toHaveProperty('provider', 'Updated Provider');
      expect(updatePayload.data).toHaveProperty('trackingCode', 'UPDATED-123');
    });

    it('should mark delivery as delivered', async () => {
      if (!orderId) {
        console.log('Skipping test - missing order ID');
        return;
      }

      // First create a delivery
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          orderId,
          provider: 'Final Delivery Test',
          trackingCode: 'FINAL-TEST-123',
        }
      });

      const createPayload = createResponse.json();
      const deliveryId = createPayload.data.id;

      // Then mark it as delivered
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deliveries/${deliveryId}`,
        payload: {
          status: 'delivered',
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatePayload = updateResponse.json();
      expect(updatePayload).toHaveProperty('success', true);
      expect(updatePayload.data).toHaveProperty('status', 'delivered');
    });

    it('should filter deliveries by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries?status=requested'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter deliveries by provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries?provider=Test%20Delivery%20Service'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 for non-existent delivery', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/deliveries/${fakeId}`
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should return 404 when creating delivery for non-existent order', async () => {
      const fakeOrderId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          orderId: fakeOrderId,
          provider: 'Test Provider',
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });
  });

  describe('Customer Addresses', () => {
    it('should list all addresses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries/addresses'
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload).toHaveProperty('data');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should create a new customer address', async () => {
      if (!customerId) {
        console.log('Skipping test - missing customer ID');
        return;
      }

      const timestamp = Date.now();
      const newAddress = {
        customerId,
        label: 'Home Address',
        line1: '123 Test Street',
        line2: 'Apartment 4B',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country',
        lat: '40.7128',
        lon: '-74.0060',
        isDefault: true,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries/addresses',
        payload: newAddress
      });

      expect(response.statusCode).toBe(201);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('customerId', customerId);
      expect(payload.data).toHaveProperty('line1', '123 Test Street');
      expect(payload.data).toHaveProperty('isDefault', true);
    });

    it('should filter addresses by customer', async () => {
      if (!customerId) {
        console.log('Skipping test - missing customer ID');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/deliveries/addresses?customerId=${customerId}`
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty('success', true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should return 404 when creating address for non-existent customer', async () => {
      const fakeCustomerId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries/addresses',
        payload: {
          customerId: fakeCustomerId,
          line1: 'Test Street',
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = response.json();
      expect(payload).toHaveProperty('success', false);
    });

    it('should validate required address fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries/addresses',
        payload: {
          // Missing required fields
          city: 'Test City',
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});