import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  deliveryQuerySchema,
  deliveryCreateSchema,
  deliveryUpdateSchema,
  deliveryResponseSchema,
  deliveriesResponseSchema,
  addressQuerySchema,
  addressCreateSchema,
  addressesResponseSchema,
  addressResponseSchema,
} from '@/modules/deliveries/delivery.schema.js';
import { deliveryService, DeliveryServiceError } from '@/modules/deliveries/delivery.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof DeliveryServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function deliveryRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all deliveries',
        tags: ['Deliveries'],
        querystring: deliveryQuerySchema,
        response: {
          200: deliveriesResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof deliveryQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const items = await deliveryService.listDeliveries(request.query, context);
      return reply.send(createSuccessResponse(items, 'Deliveries retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get delivery by ID',
        tags: ['Deliveries'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const delivery = await deliveryService.getDelivery(request.params.id, context);
      if (!delivery) {
        return createNotFoundError('Delivery not found', reply);
      }

      return reply.send(createSuccessResponse(delivery, 'Delivery retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new delivery',
        tags: ['Deliveries'],
        body: deliveryCreateSchema,
        response: {
          201: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof deliveryCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const delivery = await deliveryService.createDelivery(request.body, context);
        return reply.status(201).send(createSuccessResponse(delivery, 'Delivery created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update delivery status',
        tags: ['Deliveries'],
        params: z.object({ id: z.string().uuid() }),
        body: deliveryUpdateSchema,
        response: {
          200: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof deliveryUpdateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const delivery = await deliveryService.updateDelivery(request.params.id, request.body, context);
        if (!delivery) {
          return createNotFoundError('Delivery not found', reply);
        }

        return reply.send(createSuccessResponse(delivery, 'Delivery updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.get(
    '/addresses',
    {
      schema: {
        description: 'Get customer addresses',
        tags: ['Deliveries'],
        querystring: addressQuerySchema,
        response: {
          200: addressesResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof addressQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const addresses = await deliveryService.listAddresses(request.query, context);
      return reply.send(createSuccessResponse(addresses, 'Customer addresses retrieved successfully'));
    }
  );

  fastify.post(
    '/addresses',
    {
      schema: {
        description: 'Create new customer address',
        tags: ['Deliveries'],
        body: addressCreateSchema,
        response: {
          201: addressResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof addressCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const address = await deliveryService.createAddress(request.body, context);
        return reply.status(201).send(createSuccessResponse(address, 'Address created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
