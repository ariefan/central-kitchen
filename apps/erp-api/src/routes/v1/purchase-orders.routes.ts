import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createNotFoundError,
  notFoundResponseSchema
} from '@/modules/shared/responses.js';
import {
  purchaseOrderCreateSchema,
  purchaseOrderUpdateSchema,
  purchaseOrderQuerySchema,
  purchaseOrderResponseSchema,
  purchaseOrderWithItemsResponseSchema,
  purchaseOrdersResponseSchema,
} from '@/modules/purchase-orders/purchase-order.schema.js';
import { purchaseOrderService } from '@/modules/purchase-orders/purchase-order.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';
import { requirePermission } from '@/shared/middleware/rbac.js';

export function purchaseOrderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/purchase-orders - List all purchase orders
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all purchase orders with pagination, sorting, and search',
        tags: ['Purchase Orders'],
        querystring: purchaseOrderQuerySchema,
        response: {
          200: purchaseOrdersResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const result = await purchaseOrderService.list(request.query, context);
      return reply.send(createPaginatedResponse(result.items, result.total, result.limit, result.offset));
    }
  );

  // GET /api/v1/purchase-orders/:id - Get purchase order by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get purchase order by ID with items',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: purchaseOrderWithItemsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const result = await purchaseOrderService.getById(id, context);

      if (!result) {
        return createNotFoundError('Purchase order not found', reply);
      }

      return reply.send(createSuccessResponse({
        ...result.order,
        items: result.items,
      }, 'Purchase order retrieved successfully'));
    }
  );

  // POST /api/v1/purchase-orders - Create new purchase order
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new purchase order',
        tags: ['Purchase Orders'],
        body: purchaseOrderCreateSchema,
        // Temporarily disable response validation to debug 500 errors
        // response: {
        //   201: purchaseOrderWithItemsResponseSchema,
        // },
      },
      onRequest: [requirePermission('purchase_order', 'create')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const result = await purchaseOrderService.create(request.body, context);
      return reply.status(201).send(createSuccessResponse(result, 'Purchase order created successfully'));
    }
  );

  // PATCH /api/v1/purchase-orders/:id - Update purchase order (draft only)
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update purchase order (draft only)',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: purchaseOrderUpdateSchema,
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'update')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      try {
        const result = await purchaseOrderService.update(id, request.body, context);
        if (!result) {
          return createNotFoundError('Purchase order not found', reply);
        }
        return reply.send(createSuccessResponse(result, 'Purchase order updated successfully'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('Only draft')) {
          return (reply as any).status(400).send({ success: false, error: 'Bad Request', message: error.message });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/purchase-orders/:id/submit - Submit purchase order for approval
  fastify.post(
    '/:id/submit',
    {
      schema: {
        description: 'Submit purchase order for approval',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'update')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const result = await purchaseOrderService.submit(id, context);
      if (!result) {
        return createNotFoundError('Purchase order not found or not in draft status', reply);
      }

      return reply.send(createSuccessResponse(result, 'Purchase order submitted for approval'));
    }
  );

  // POST /api/v1/purchase-orders/:id/approve - Approve purchase order
  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'approve')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const result = await purchaseOrderService.approve(id, context);
      if (!result) {
        return createNotFoundError('Purchase order not found or not in pending approval status', reply);
      }

      return reply.send(createSuccessResponse(result, 'Purchase order approved successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/reject - Reject purchase order
  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Reason is required'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'reject')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason: string };
      const result = await purchaseOrderService.reject(id, reason, context);
      if (!result) {
        return createNotFoundError('Purchase order not found or already processed', reply);
      }

      return reply.send(createSuccessResponse(result, 'Purchase order rejected successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/send - Mark purchase order as sent to supplier
  fastify.post(
    '/:id/send',
    {
      schema: {
        description: 'Mark purchase order as sent to supplier',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          notes: z.string().optional(),
          sentVia: z.enum(['email', 'portal', 'phone', 'fax', 'other']).default('email'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'update')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const body = request.body as { notes?: string; sentVia?: string };
      const result = await purchaseOrderService.markSent(id, body, context);
      if (!result) {
        return createNotFoundError('Purchase order not found or must be approved before sending', reply);
      }

      return reply.send(createSuccessResponse(result, 'Purchase order sent to supplier successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/cancel - Cancel purchase order
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        description: 'Cancel purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Reason is required'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('purchase_order', 'update')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason: string };
      const result = await purchaseOrderService.cancel(id, reason, context);
      if (!result) {
        return createNotFoundError('Purchase order not found or cannot be cancelled', reply);
      }

      return reply.send(createSuccessResponse(result, 'Purchase order cancelled successfully'));
    }
  );
}
