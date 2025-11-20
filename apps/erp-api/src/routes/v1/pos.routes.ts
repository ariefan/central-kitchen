import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof shiftQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const shifts = await posService.listShifts(request.query, context);
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
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const shift = await posService.getShift(request.params.id, context);
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
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof shiftInsertSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const shift = await posService.openShift(request.body, context);
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
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof shiftCloseSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const shift = await posService.closeShift(request.params.id, request.body, context);
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
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof drawerMovementInsertSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const movement = await posService.addDrawerMovement(request.params.id, request.body, context);
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
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const shift = await posService.getShift(request.params.id, context);
      if (!shift) {
        return createNotFoundError('Shift not found', reply);
      }

      const movements = await posService.listDrawerMovements(request.params.id);
      return reply.send(createSuccessResponse(movements, 'Movements retrieved successfully'));
    }
  );
}
