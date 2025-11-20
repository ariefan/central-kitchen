import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  returnOrderCreateSchema,
  returnOrderUpdateSchema,
  returnOrderQuerySchema,
  returnOrderResponseSchema,
  returnOrdersResponseSchema,
} from '@/modules/returns/return.schema.js';
import { returnService, ReturnServiceError } from '@/modules/returns/return.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

type ReturnListQuery = z.infer<typeof returnOrderQuerySchema>;
type ReturnCreateBody = z.infer<typeof returnOrderCreateSchema>;
type ReturnUpdateBody = z.infer<typeof returnOrderUpdateSchema>;

const rejectionSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof ReturnServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function returnRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all return orders with optional filters',
        tags: ['Returns'],
        querystring: returnOrderQuerySchema,
        response: {
          200: returnOrdersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ReturnListQuery }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const results = await returnService.list(request.query, context);
      return reply.send(createSuccessResponse(results, 'Return orders retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get return order by ID with items',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await returnService.getById(request.params.id, context);
      if (!result) {
        return createNotFoundError('Return order not found', reply);
      }

      return reply.send(createSuccessResponse(result, 'Return order retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new return order',
        tags: ['Returns'],
        body: returnOrderCreateSchema,
        response: {
          201: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: ReturnCreateBody }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);

      try {
        const created = await returnService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(created, 'Return order created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update return order details',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        body: returnOrderUpdateSchema,
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: ReturnUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const updated = await returnService.update(request.params.id, request.body, context);
        if (!updated) {
          return createNotFoundError('Return order not found', reply);
        }

        return reply.send(createSuccessResponse(updated, 'Return order updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve a return order',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const approved = await returnService.approve(request.params.id, context);
        if (!approved) {
          return createNotFoundError('Return order not found', reply);
        }

        return reply.send(createSuccessResponse(approved, 'Return order approved successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject a return order',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        body: rejectionSchema,
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof rejectionSchema> }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const rejected = await returnService.reject(request.params.id, request.body.reason, context);
        if (!rejected) {
          return createNotFoundError('Return order not found', reply);
        }

        return reply.send(createSuccessResponse(rejected, 'Return order rejected successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post a return order to stock ledger',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const posted = await returnService.post(request.params.id, context);
        if (!posted) {
          return createNotFoundError('Return order not found', reply);
        }

        return reply.send(createSuccessResponse(posted, 'Return order posted successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/complete',
    {
      schema: {
        description: 'Mark return order as completed',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const completed = await returnService.complete(request.params.id, context);
        if (!completed) {
          return createNotFoundError('Return order not found', reply);
        }

        return reply.send(createSuccessResponse(completed, 'Return order completed successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
