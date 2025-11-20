import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  productionOrderQuerySchema,
  productionOrderCreateSchema,
  productionOrderUpdateSchema,
  productionOrderExecuteSchema,
  productionOrderResponseSchema,
  productionOrdersResponseSchema,
} from '@/modules/production-orders/production-order.schema.js';
import { productionOrderService, ProductionOrderServiceError } from '@/modules/production-orders/production-order.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof ProductionOrderServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function productionOrderRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all production orders with recipe details',
        tags: ['Production Orders'],
        querystring: productionOrderQuerySchema,
        response: {
          200: productionOrdersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof productionOrderQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const orders = await productionOrderService.list(request.query, context);
      return reply.send(createSuccessResponse(orders, 'Production orders retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get production order by ID with full details',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const order = await productionOrderService.getById(request.params.id, context);
      if (!order) {
        return createNotFoundError('Production order not found', reply);
      }

      return reply.send(createSuccessResponse(order, 'Production order retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new production order',
        tags: ['Production Orders'],
        body: productionOrderCreateSchema,
        response: {
          201: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof productionOrderCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const order = await productionOrderService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(order, 'Production order created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update production order (scheduled only)',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: productionOrderUpdateSchema,
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof productionOrderUpdateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const order = await productionOrderService.update(request.params.id, request.body, context);
        if (!order) {
          return createNotFoundError('Production order not found or cannot be edited', reply);
        }

        return reply.send(createSuccessResponse(order, 'Production order updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/start',
    {
      schema: {
        description: 'Start production order',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const order = await productionOrderService.start(request.params.id, context);
      if (!order) {
        return createNotFoundError('Production order not found or not ready to start', reply);
      }

      return reply.send(createSuccessResponse(order, 'Production started successfully'));
    }
  );

  fastify.post(
    '/:id/complete',
    {
      schema: {
        description: 'Complete production order with actual quantities',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: productionOrderExecuteSchema,
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof productionOrderExecuteSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const order = await productionOrderService.complete(request.params.id, request.body, context);
        if (!order) {
          return createNotFoundError('Production order not found or not in progress', reply);
        }

        return reply.send(createSuccessResponse(order, 'Production completed successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/cancel',
    {
      schema: {
        description: 'Cancel production order',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ reason: z.string().optional() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const order = await productionOrderService.cancel(request.params.id, request.body.reason, context);
      if (!order) {
        return createNotFoundError('Production order not found or cannot be cancelled', reply);
      }

      return reply.send(createSuccessResponse(order, 'Production order cancelled successfully'));
    }
  );

  fastify.post(
    '/:id/hold',
    {
      schema: {
        description: 'Put production order on hold',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ reason: z.string().optional() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const order = await productionOrderService.hold(request.params.id, request.body.reason, context);
      if (!order) {
        return createNotFoundError('Production order not found or cannot be put on hold', reply);
      }

      return reply.send(createSuccessResponse(order, 'Production order put on hold successfully'));
    }
  );
}
