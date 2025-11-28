import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  notFoundResponseSchema,
  createBadRequestError,
} from '@/modules/shared/responses.js';
import {
  shiftInsertSchema,
  drawerMovementInsertSchema,
  shiftCloseSchema,
  shiftResponseSchema,
  shiftsResponseSchema,
  drawerMovementResponseSchema,
  drawerMovementsResponseSchema,
  shiftQuerySchema,
  movementKinds,
} from '@/modules/pos/pos.schema.js';
import { posService } from '@/modules/pos/pos.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';
import { requirePermission } from '@/shared/middleware/rbac.js';

export function posRoutes(fastify: FastifyInstance) {
  // GET /api/v1/pos/shifts - List shifts for a location
  fastify.get(
    '/shifts',
    {
      schema: {
        description: 'Get POS shifts for a location',
        tags: ['POS', 'Shifts'],
        querystring: shiftQuerySchema,
        response: {
          200: shiftsResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const query = request.query as z.infer<typeof shiftQuerySchema>;
      const shifts = await posService.listShifts(query, context);
      return reply.send(createSuccessResponse(shifts, 'Shifts retrieved successfully'));
    }
  );

  // GET /api/v1/pos/shifts/:id - Get specific shift
  fastify.get(
    '/shifts/:id',
    {
      schema: {
        description: 'Get specific POS shift',
        tags: ['POS', 'Shifts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: shiftResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const shift = await posService.getShift(id, context);
      if (!shift) {
        return createNotFoundError('Shift not found', reply);
      }

      return reply.send(createSuccessResponse(shift, 'Shift retrieved successfully'));
    }
  );

  // POST /api/v1/pos/shifts - Open a new shift
  fastify.post(
    '/shifts',
    {
      schema: {
        description: 'Open a new POS shift',
        tags: ['POS', 'Shifts'],
        body: shiftInsertSchema.extend({
          floatAmount: z.string().optional(),
        }),
        response: {
          201: shiftResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'operate')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const body = request.body as z.infer<typeof shiftInsertSchema>;
      try {
        const shift = await posService.openShift(body, context);
        return reply.status(201).send(createSuccessResponse(shift, 'Shift opened successfully'));
      } catch (error) {
        return createBadRequestError(error instanceof Error ? error.message : 'Failed to open shift', reply);
      }
    }
  );

  // POST /api/v1/pos/shifts/:id/close - Close a shift
  fastify.post(
    '/shifts/:id/close',
    {
      schema: {
        description: 'Close a POS shift and calculate variance',
        tags: ['POS', 'Shifts'],
        params: z.object({ id: z.string().uuid() }),
        body: shiftCloseSchema,
        response: {
          200: shiftResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'operate')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof shiftCloseSchema>;
      const shift = await posService.closeShift(id, body, context);
      if (!shift) {
        return createNotFoundError('Open shift not found', reply);
      }

      return reply.send(createSuccessResponse(shift, 'Shift closed successfully'));
    }
  );

  // POST /api/v1/pos/shifts/:id/movements - Add cash movement to shift
  fastify.post(
    '/shifts/:id/movements',
    {
      schema: {
        description: 'Add cash movement to shift',
        tags: ['POS', 'Shifts', 'Drawer Movements'],
        params: z.object({ id: z.string().uuid() }),
        body: drawerMovementInsertSchema.extend({
          amount: z.string(),
          kind: z.enum(movementKinds),
        }),
        response: {
          201: drawerMovementResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'operate')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof drawerMovementInsertSchema>;
      try {
        const movement = await posService.addDrawerMovement(id, body, context);
        if (!movement) {
          return createNotFoundError('Open shift not found', reply);
        }
        return reply.status(201).send(createSuccessResponse(movement, 'Cash movement added successfully'));
      } catch (error) {
        return createBadRequestError(error instanceof Error ? error.message : 'Failed to add drawer movement', reply);
      }
    }
  );

  // GET /api/v1/pos/shifts/:id/movements - Get movements for a shift
  fastify.get(
    '/shifts/:id/movements',
    {
      schema: {
        description: 'Get cash movements for a shift',
        tags: ['POS', 'Shifts', 'Drawer Movements'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: drawerMovementsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('pos', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const { id } = request.params as { id: string };
      const shift = await posService.getShift(id, context);
      if (!shift) {
        return createNotFoundError('Shift not found', reply);
      }

      const movements = await posService.listDrawerMovements(id);
      return reply.send(createSuccessResponse(movements, 'Movements retrieved successfully'));
    }
  );

  // GET /api/v1/pos/kds - Kitchen Display System endpoint
  fastify.get(
    '/kds',
    {
      schema: {
        description: 'Get orders for Kitchen Display System with prep status tracking',
        tags: ['POS', 'Kitchen', 'KDS'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          station: z.enum(['hot', 'cold', 'drinks', 'dessert', 'all']).default('all'),
          kitchenStatus: z.enum(['confirmed', 'preparing', 'ready', 'completed']).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.object({
              id: z.string(),
              orderNumber: z.string(),
              type: z.string(),
              tableNo: z.string().nullable(),
              kitchenStatus: z.string(),
              status: z.string(),
              createdAt: z.date(),
              totalItems: z.number(),
              items: z.array(z.object({
                id: z.string(),
                productId: z.string(),
                productName: z.string(),
                quantity: z.string(),
                prepStatus: z.string(),
                station: z.string().nullable(),
                notes: z.string().nullable(),
              })),
            })),
            message: z.string(),
          }),
        },
      },
      onRequest: [requirePermission('pos', 'read')],
    },
    async (request, reply) => {
      const context = buildRequestContext(request);
      const query = request.query as {
        locationId?: string;
        station?: string;
        kitchenStatus?: string;
        limit?: number;
      };
      const { locationId, station, kitchenStatus, limit } = query;

      const orders = await posService.getKitchenOrders({
        tenantId: context.tenantId,
        locationId,
        station: station || 'all',
        kitchenStatus,
        limit: limit || 50,
      });

      return reply.send(createSuccessResponse(orders, 'Kitchen orders retrieved successfully'));
    }
  );
}
