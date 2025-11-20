import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  stockCountCreateSchema,
  stockCountUpdateSchema,
  stockCountLineCreateSchema,
  stockCountLineUpdateSchema,
  stockCountQuerySchema,
  stockCountResponseSchema,
  stockCountsResponseSchema,
  stockCountLinesResponseSchema,
  stockCountLineResponseSchema,
} from '@/modules/stock-counts/stock-count.schema.js';
import { stockCountService, StockCountServiceError } from '@/modules/stock-counts/stock-count.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof StockCountServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function stockCountRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all stock counts',
        tags: ['Stock Counts'],
        querystring: stockCountQuerySchema,
        response: {
          200: stockCountsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof stockCountQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await stockCountService.list(request.query, context);
      return reply.send(createSuccessResponse(result, 'Stock counts retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get stock count by ID with lines',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await stockCountService.getById(request.params.id, context);
      if (!result) {
        return createNotFoundError('Stock count not found', reply);
      }

      return reply.send(createSuccessResponse(result, 'Stock count retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new stock count',
        tags: ['Stock Counts'],
        body: stockCountCreateSchema,
        response: {
          201: stockCountResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof stockCountCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const result = await stockCountService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(result, 'Stock count created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update stock count (draft only)',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        body: stockCountUpdateSchema,
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof stockCountUpdateSchema> }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const result = await stockCountService.update(request.params.id, request.body, context);
        return reply.send(createSuccessResponse(result, 'Stock count updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.get(
    '/:id/lines',
    {
      schema: {
        description: 'Get lines for a stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountLinesResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const lines = await stockCountService.listLines(request.params.id, context);
        return reply.send(createSuccessResponse(lines, 'Stock count lines retrieved successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/lines',
    {
      schema: {
        description: 'Add line to stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ id: z.string().uuid() }),
        body: stockCountLineCreateSchema,
        response: {
          201: stockCountLineResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof stockCountLineCreateSchema> }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const line = await stockCountService.addLine(request.params.id, request.body, context);
        return reply.status(201).send(createSuccessResponse(line, 'Stock count line added successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/lines/:lineId',
    {
      schema: {
        description: 'Update stock count line',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ lineId: z.string().uuid() }),
        body: stockCountLineUpdateSchema,
        response: {
          200: stockCountLineResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { lineId: string }; Body: z.infer<typeof stockCountLineUpdateSchema> }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const line = await stockCountService.updateLine(request.params.lineId, request.body, context);
        return reply.send(createSuccessResponse(line, 'Stock count line updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.delete(
    '/lines/:lineId',
    {
      schema: {
        description: 'Remove line from stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ lineId: z.string().uuid() }),
        response: {
          200: stockCountLineResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { lineId: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const line = await stockCountService.deleteLine(request.params.lineId, context);
        return reply.send(createSuccessResponse(line, 'Stock count line removed successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/review',
    {
      schema: {
        description: 'Compute variance and mark stock count as reviewed',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const result = await stockCountService.review(request.params.id, context);
        return reply.send(createSuccessResponse(result, 'Stock count reviewed successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post stock count variance to ledger',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const result = await stockCountService.post(request.params.id, context);
        return reply.send(createSuccessResponse(result, 'Stock count variance posted to ledger successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
