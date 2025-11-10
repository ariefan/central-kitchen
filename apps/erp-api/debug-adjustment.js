import fastify from 'fastify';

const app = fastify({ logger: false });

// Add basic setup
app.post('/test-adjustment', async (request, reply) => {
  try {
    console.log('Request body:', request.body);

    // This will trigger the actual adjustment creation logic
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/adjustments',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'test-tenant-1',
        'x-user-id': 'test-user-1'
      },
      payload: {
        locationId: 'test-location-1',
        reason: 'damage',
        notes: 'Test damage adjustment',
        items: [
          {
            productId: 'test-product-1',
            lotId: 'test-lot-1',
            uomId: 'test-uom-1',
            qtyDelta: -5,
            unitCost: 3.50,
            reason: 'Test item damage',
          },
        ],
      }
    });

    console.log('Response status:', response.statusCode);
    console.log('Response body:', response.json());

    return reply.send(response.json());
  } catch (error) {
    console.error('Error:', error);
    return reply.status(500).send({ error: error.message });
  }
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3001 });
    console.log('Debug server running on port 3001');

    // Make test request
    console.log('\nMaking test request...');
    const testResponse = await app.inject({
      method: 'POST',
      url: '/test-adjustment',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'test-tenant-1',
        'x-user-id': 'test-user-1'
      },
      payload: {
        locationId: 'test-location-1',
        reason: 'damage',
        notes: 'Test damage adjustment',
        items: [
          {
            productId: 'test-product-1',
            lotId: 'test-lot-1',
            uomId: 'test-uom-1',
            qtyDelta: -5,
            unitCost: 3.50,
            reason: 'Test item damage',
          },
        ],
      }
    });

    console.log('Test response status:', testResponse.statusCode);
    console.log('Test response body:', JSON.stringify(testResponse.json(), null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();