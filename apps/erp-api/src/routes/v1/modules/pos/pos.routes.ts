import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema, createBadRequestError } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import { posShifts, drawerMovements, locations } from '../../../../config/schema.js';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth.js';

// Movement kinds
const movementKinds = ['cash_in', 'cash_out', 'paid_out', 'drop'] as const;

// Create schemas from the database schema
const shiftInsertSchema = createInsertSchema(posShifts).omit({
  id: true,
  tenantId: true,
  openedAt: true,
  closedAt: true,
});

const drawerMovementInsertSchema = createInsertSchema(drawerMovements).omit({
  id: true,
  shiftId: true,
  createdAt: true,
});

// Response schemas
const shiftSelectSchema = createSelectSchema(posShifts);
const drawerMovementSelectSchema = createSelectSchema(drawerMovements);

const shiftResponseSchema = z.object({
  success: z.literal(true),
  data: shiftSelectSchema.extend({
    location: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  message: z.string(),
});

const shiftsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(shiftSelectSchema.extend({
    location: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  message: z.string(),
});

const drawerMovementResponseSchema = z.object({
  success: z.literal(true),
  data: drawerMovementSelectSchema,
  message: z.string(),
});

const drawerMovementsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(drawerMovementSelectSchema),
  message: z.string(),
});

const shiftCloseSchema = z.object({
  actualCash: z.string(),
  notes: z.string().optional(),
});

// Type aliases for better inference
type ShiftOpenRequest = FastifyRequest<{
  Body: z.infer<typeof shiftInsertSchema>;
}>;

type ShiftCloseRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof shiftCloseSchema>;
}>;

type DrawerMovementRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof drawerMovementInsertSchema>;
}>;

export function posRoutes(fastify: FastifyInstance) {
  // GET /api/v1/pos/shifts - List shifts for a location
  fastify.get(
    '/shifts',
    {
      schema: {
        description: 'Get POS shifts for a location',
        tags: ['POS', 'Shifts'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          status: z.enum(['open', 'closed', 'all']).default('all'),
        }),
        response: {
          200: shiftsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{Querystring: {locationId?: string, status?: string}}>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, status } = request.query;

      let whereConditions = [eq(posShifts.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(posShifts.locationId, locationId));
      }

      if (status === 'open') {
        whereConditions.push(isNull(posShifts.closedAt));
      } else if (status === 'closed') {
        whereConditions.push(sql`${posShifts.closedAt} IS NOT NULL`);
      }

      const shifts = await db
        .select({
          id: posShifts.id,
          tenantId: posShifts.tenantId,
          locationId: posShifts.locationId,
          deviceId: posShifts.deviceId,
          openedBy: posShifts.openedBy,
          openedAt: posShifts.openedAt,
          closedBy: posShifts.closedBy,
          closedAt: posShifts.closedAt,
          floatAmount: posShifts.floatAmount,
          expectedCash: posShifts.expectedCash,
          actualCash: posShifts.actualCash,
          variance: posShifts.variance,
          location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(posShifts)
        .leftJoin(locations, eq(posShifts.locationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(desc(posShifts.openedAt));

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
      const tenantId = getTenantId(request);

      const shift = await db
        .select({
          id: posShifts.id,
          tenantId: posShifts.tenantId,
          locationId: posShifts.locationId,
          deviceId: posShifts.deviceId,
          openedBy: posShifts.openedBy,
          openedAt: posShifts.openedAt,
          closedBy: posShifts.closedBy,
          closedAt: posShifts.closedAt,
          floatAmount: posShifts.floatAmount,
          expectedCash: posShifts.expectedCash,
          actualCash: posShifts.actualCash,
          variance: posShifts.variance,
                location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(posShifts)
            .leftJoin(locations, eq(posShifts.locationId, locations.id))
        .where(and(
          eq(posShifts.id, request.params.id),
          eq(posShifts.tenantId, tenantId)
        ))
        .limit(1);

      if (!shift.length) {
        return createNotFoundError('Shift not found', reply);
      }

      return reply.send(createSuccessResponse(shift[0], 'Shift retrieved successfully'));
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
    async (request: ShiftOpenRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if there's already an open shift for this location
      const existingOpenShift = await db
        .select()
        .from(posShifts)
        .where(and(
          eq(posShifts.tenantId, tenantId),
          eq(posShifts.locationId, request.body.locationId),
          isNull(posShifts.closedAt)
        ))
        .limit(1);

      if (existingOpenShift.length) {
        return createBadRequestError('There is already an open shift for this location', reply);
      }

      const newShift = {
        ...request.body,
        tenantId,
        openedBy: userId,
        floatAmount: request.body.floatAmount ?? "0.00",
      };

      const result = await db.insert(posShifts).values(newShift).returning();

      if (!result.length) {
        return createNotFoundError('Shift creation failed', reply);
      }

      // Get the full shift with user and location info
      const fullShift = await db
        .select({
          id: posShifts.id,
          tenantId: posShifts.tenantId,
          locationId: posShifts.locationId,
          deviceId: posShifts.deviceId,
          openedBy: posShifts.openedBy,
          openedAt: posShifts.openedAt,
          closedBy: posShifts.closedBy,
          closedAt: posShifts.closedAt,
          floatAmount: posShifts.floatAmount,
          expectedCash: posShifts.expectedCash,
          actualCash: posShifts.actualCash,
          variance: posShifts.variance,
                  location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(posShifts)
                .leftJoin(locations, eq(posShifts.locationId, locations.id))
        .where(eq(posShifts.id, result[0]!.id))
        .limit(1);

      return reply.status(201).send(createSuccessResponse(fullShift[0]!, 'Shift opened successfully'));
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
    async (request: ShiftCloseRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if shift exists and is open
      const existingShift = await db
        .select()
        .from(posShifts)
        .where(and(
          eq(posShifts.id, request.params.id),
          eq(posShifts.tenantId, tenantId),
          isNull(posShifts.closedAt)
        ))
        .limit(1);

      if (!existingShift.length) {
        return createNotFoundError('Open shift not found', reply);
      }

      // Calculate expected cash (float + sales)
      // TODO: Sum up actual sales from orders and other payments for this shift
      const expectedCash = existingShift[0]!.floatAmount; // This should include sales calculations

      // Calculate variance
      const variance = (parseFloat(request.body.actualCash) - parseFloat(expectedCash.toString())).toString();

      const result = await db
        .update(posShifts)
        .set({
          actualCash: request.body.actualCash,
          expectedCash,
          variance,
          closedBy: userId,
          closedAt: new Date(),
        })
        .where(and(
          eq(posShifts.id, request.params.id),
          eq(posShifts.tenantId, tenantId)
        ))
        .returning();

      // Get the full shift with user info
      const fullShift = await db
        .select({
          id: posShifts.id,
          tenantId: posShifts.tenantId,
          locationId: posShifts.locationId,
          deviceId: posShifts.deviceId,
          openedBy: posShifts.openedBy,
          openedAt: posShifts.openedAt,
          closedBy: posShifts.closedBy,
          closedAt: posShifts.closedAt,
          floatAmount: posShifts.floatAmount,
          expectedCash: posShifts.expectedCash,
          actualCash: posShifts.actualCash,
          variance: posShifts.variance,
                location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(posShifts)
            .leftJoin(locations, eq(posShifts.locationId, locations.id))
        .where(eq(posShifts.id, result[0]!.id))
        .limit(1);

      return reply.send(createSuccessResponse(fullShift[0]!, 'Shift closed successfully'));
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
    async (request: DrawerMovementRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if shift exists and is open
      const existingShift = await db
        .select()
        .from(posShifts)
        .where(and(
          eq(posShifts.id, request.params.id),
          eq(posShifts.tenantId, tenantId),
          isNull(posShifts.closedAt)
        ))
        .limit(1);

      if (!existingShift.length) {
        return createNotFoundError('Open shift not found', reply);
      }

      const newMovement = {
        ...request.body,
        shiftId: request.params.id,
        createdBy: userId,
      };

      const result = await db.insert(drawerMovements).values(newMovement).returning();

      // Get the full movement with user info
      const fullMovement = await db
        .select({
          id: drawerMovements.id,
          shiftId: drawerMovements.shiftId,
          kind: drawerMovements.kind,
          amount: drawerMovements.amount,
          reason: drawerMovements.reason,
          createdBy: drawerMovements.createdBy,
          createdAt: drawerMovements.createdAt,
              })
        .from(drawerMovements)
                .where(eq(drawerMovements.id, result[0]!.id))
        .limit(1);

      return reply.status(201).send(createSuccessResponse(fullMovement[0]!, 'Cash movement added successfully'));
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
      const tenantId = getTenantId(request);

      // Check if shift exists
      const existingShift = await db
        .select()
        .from(posShifts)
        .where(and(
          eq(posShifts.id, request.params.id),
          eq(posShifts.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingShift.length) {
        return createNotFoundError('Shift not found', reply);
      }

      const movements = await db
        .select({
          id: drawerMovements.id,
          shiftId: drawerMovements.shiftId,
          kind: drawerMovements.kind,
          amount: drawerMovements.amount,
          reason: drawerMovements.reason,
          createdBy: drawerMovements.createdBy,
          createdAt: drawerMovements.createdAt,
              })
        .from(drawerMovements)
                .where(eq(drawerMovements.shiftId, request.params.id))
        .orderBy(drawerMovements.createdAt);

      return reply.send(createSuccessResponse(movements, 'Movements retrieved successfully'));
    }
  );
}