import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  goodsReceiptCreateSchema,
  goodsReceiptResponseSchema,
  goodsReceiptsResponseSchema,
  goodsReceiptQuerySchema,
} from '@/modules/goods-receipts/goods-receipt.schema.js';
import { goodsReceiptService } from '@/modules/goods-receipts/goods-receipt.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

export function goodsReceiptRoutes(fastify: FastifyInstance) {
  // GET /api/v1/goods-receipts - List all goods receipts
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all goods receipts',
        tags: ['Goods Receipts'],
        querystring: goodsReceiptQuerySchema,
        response: {
          200: goodsReceiptsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof goodsReceiptQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await goodsReceiptService.list(request.query, context);
      return reply.send(createSuccessResponse(result, 'Goods receipts retrieved successfully'));
    }
  );

  // GET /api/v1/goods-receipts/:id - Get goods receipt by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get goods receipt by ID with items',
        tags: ['Goods Receipts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: goodsReceiptResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await goodsReceiptService.getById(request.params.id, context);
      if (!result) {
        return createNotFoundError('Goods receipt not found', reply);
      }

      return reply.send(createSuccessResponse({
        ...result.receipt,
        items: result.items,
      }, 'Goods receipt retrieved successfully'));
    }
  );

  // POST /api/v1/goods-receipts - Create new goods receipt
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new goods receipt',
        tags: ['Goods Receipts'],
        body: goodsReceiptCreateSchema,
        response: {
          201: goodsReceiptResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof goodsReceiptCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await goodsReceiptService.create(request.body, context);
      if (!result) {
        return createNotFoundError('Failed to create goods receipt', reply);
      }
      return reply.status(201).send(createSuccessResponse(result, 'Goods receipt created successfully'));
    }
  );

  // POST /api/v1/goods-receipts/:id/post - Post goods receipt (finalize and update inventory)
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post goods receipt - finalize and update inventory',
        tags: ['Goods Receipts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: goodsReceiptResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await goodsReceiptService.post(request.params.id, context);
      if (!result) {
        return createNotFoundError('Goods receipt not found', reply);
      }

      return reply.send(createSuccessResponse(result, 'Goods receipt posted successfully'));
    }
  );
}
