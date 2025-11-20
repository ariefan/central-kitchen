import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/shared/utils/responses.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import { alerts, locations, products, lots, users } from '@/config/schema.js';
import { eq, and, desc, gte, lte, sql, type SQL } from 'drizzle-orm';

// Alert schemas
const alertQuerySchema = z.object({
  type: z.enum(['temperature_out_of_range', 'product_expiring', 'low_stock', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'acknowledged', 'resolved', 'dismissed']).optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

const acknowledgeAlertSchema = z.object({
  notes: z.string().max(1000).optional(),
});

const resolveAlertSchema = z.object({
  resolution: z.string().min(1).max(1000),
  notes: z.string().max(1000).optional(),
});

const snoozeAlertSchema = z.object({
  snoozeUntil: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export function alertRoutes(fastify: FastifyInstance) {
  // GET /api/v1/alerts - List all alerts
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all alerts with optional filters',
        tags: ['Alerts'],
        querystring: alertQuerySchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.any()),
            pagination: z.object({
              total: z.number(),
              limit: z.number(),
              offset: z.number(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof alertQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const query = request.query;

      const whereConditions: SQL[] = [eq(alerts.tenantId, context.tenantId)];

      if (query.type) {
        whereConditions.push(eq(alerts.type, query.type));
      }

      if (query.priority) {
        whereConditions.push(eq(alerts.priority, query.priority));
      }

      if (query.status) {
        whereConditions.push(eq(alerts.status, query.status));
      }

      if (query.locationId) {
        whereConditions.push(eq(alerts.locationId, query.locationId));
      }

      if (query.startDate) {
        whereConditions.push(gte(alerts.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        whereConditions.push(lte(alerts.createdAt, new Date(query.endDate)));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(alerts)
        .where(and(...whereConditions));

      const total = countResult?.count || 0;

      // Get paginated results
      const limit = query.limit || 20;
      const offset = query.offset || 0;

      const results = await db
        .select({
          alert: alerts,
          location: {
            id: locations.id,
            name: locations.name,
            code: locations.code,
          },
          product: {
            id: products.id,
            name: products.name,
            sku: products.sku,
          },
          lot: {
            id: lots.id,
            lotNo: lots.lotNo,
            expiryDate: lots.expiryDate,
          },
          createdByUser: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(alerts)
        .leftJoin(locations, eq(alerts.locationId, locations.id))
        .leftJoin(products, eq(alerts.productId, products.id))
        .leftJoin(lots, eq(alerts.lotId, lots.id))
        .leftJoin(users, eq(alerts.createdBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(alerts.createdAt))
        .limit(limit)
        .offset(offset);

      const items = results.map((r) => ({
        ...r.alert,
        location: r.location,
        product: r.product,
        lot: r.lot,
        createdByUser: r.createdByUser,
      }));

      return reply.send(createPaginatedResponse(items, total, limit, offset));
    }
  );

  // GET /api/v1/alerts/:id - Get single alert
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get alert by ID',
        tags: ['Alerts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);

      const results = await db
        .select({
          alert: alerts,
          location: {
            id: locations.id,
            name: locations.name,
            code: locations.code,
          },
          product: {
            id: products.id,
            name: products.name,
            sku: products.sku,
          },
          lot: {
            id: lots.id,
            lotNo: lots.lotNo,
            expiryDate: lots.expiryDate,
          },
          createdByUser: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(alerts)
        .leftJoin(locations, eq(alerts.locationId, locations.id))
        .leftJoin(products, eq(alerts.productId, products.id))
        .leftJoin(lots, eq(alerts.lotId, lots.id))
        .leftJoin(users, eq(alerts.createdBy, users.id))
        .where(and(eq(alerts.id, request.params.id), eq(alerts.tenantId, context.tenantId)))
        .limit(1);

      if (!results.length) {
        return createNotFoundError('Alert not found', reply);
      }

      const result = results[0]!;
      const responseData = {
        ...result.alert,
        location: result.location,
        product: result.product,
        lot: result.lot,
        createdByUser: result.createdByUser,
      };

      return reply.send(createSuccessResponse(responseData, 'Alert retrieved successfully'));
    }
  );

  // POST /api/v1/alerts/:id/acknowledge - Acknowledge alert
  fastify.post(
    '/:id/acknowledge',
    {
      schema: {
        description: 'Acknowledge an alert',
        tags: ['Alerts'],
        params: z.object({ id: z.string().uuid() }),
        body: acknowledgeAlertSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof acknowledgeAlertSchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);

      const [alert] = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.id, request.params.id), eq(alerts.tenantId, context.tenantId)))
        .limit(1);

      if (!alert) {
        return createNotFoundError('Alert not found', reply);
      }

      if (alert.status !== 'open') {
        return createBadRequestError('Alert can only be acknowledged when status is open', reply);
      }

      const [updated] = await db
        .update(alerts)
        .set({
          status: 'acknowledged',
          acknowledgedBy: context.userId,
          acknowledgedAt: new Date(),
          metadata: {
            ...(typeof alert.metadata === 'object' && alert.metadata !== null ? alert.metadata : {}),
            acknowledgeNotes: request.body.notes,
          },
          updatedAt: new Date(),
        })
        .where(eq(alerts.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse(updated, 'Alert acknowledged successfully'));
    }
  );

  // POST /api/v1/alerts/:id/resolve - Resolve alert
  fastify.post(
    '/:id/resolve',
    {
      schema: {
        description: 'Resolve an alert',
        tags: ['Alerts'],
        params: z.object({ id: z.string().uuid() }),
        body: resolveAlertSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof resolveAlertSchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);

      const [alert] = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.id, request.params.id), eq(alerts.tenantId, context.tenantId)))
        .limit(1);

      if (!alert) {
        return createNotFoundError('Alert not found', reply);
      }

      if (alert.status === 'resolved' || alert.status === 'dismissed') {
        return createBadRequestError('Alert is already resolved or dismissed', reply);
      }

      const [updated] = await db
        .update(alerts)
        .set({
          status: 'resolved',
          resolvedBy: context.userId,
          resolvedAt: new Date(),
          resolution: request.body.resolution,
          metadata: {
            ...(typeof alert.metadata === 'object' && alert.metadata !== null ? alert.metadata : {}),
            resolveNotes: request.body.notes,
          },
          updatedAt: new Date(),
        })
        .where(eq(alerts.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse(updated, 'Alert resolved successfully'));
    }
  );

  // POST /api/v1/alerts/:id/dismiss - Dismiss alert
  fastify.post(
    '/:id/dismiss',
    {
      schema: {
        description: 'Dismiss an alert',
        tags: ['Alerts'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1).max(500),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);

      const [alert] = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.id, request.params.id), eq(alerts.tenantId, context.tenantId)))
        .limit(1);

      if (!alert) {
        return createNotFoundError('Alert not found', reply);
      }

      const [updated] = await db
        .update(alerts)
        .set({
          status: 'dismissed',
          resolvedBy: context.userId,
          resolvedAt: new Date(),
          resolution: `Dismissed: ${request.body.reason}`,
          updatedAt: new Date(),
        })
        .where(eq(alerts.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse(updated, 'Alert dismissed successfully'));
    }
  );

  // POST /api/v1/alerts/:id/snooze - Snooze alert
  fastify.post(
    '/:id/snooze',
    {
      schema: {
        description: 'Snooze an alert until a specified time',
        tags: ['Alerts'],
        params: z.object({ id: z.string().uuid() }),
        body: snoozeAlertSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof snoozeAlertSchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);

      const [alert] = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.id, request.params.id), eq(alerts.tenantId, context.tenantId)))
        .limit(1);

      if (!alert) {
        return createNotFoundError('Alert not found', reply);
      }

      if (alert.status !== 'open' && alert.status !== 'acknowledged') {
        return createBadRequestError('Can only snooze open or acknowledged alerts', reply);
      }

      const [updated] = await db
        .update(alerts)
        .set({
          metadata: {
            ...(typeof alert.metadata === 'object' && alert.metadata !== null ? alert.metadata : {}),
            snoozeUntil: request.body.snoozeUntil,
            snoozeReason: request.body.reason,
            snoozedBy: context.userId,
            snoozedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(alerts.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse(updated, 'Alert snoozed successfully'));
    }
  );

  // GET /api/v1/alerts/stats - Get alert statistics
  fastify.get(
    '/stats',
    {
      schema: {
        description: 'Get alert statistics',
        tags: ['Alerts'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              total: z.number(),
              byStatus: z.record(z.number()),
              byPriority: z.record(z.number()),
              byType: z.record(z.number()),
              openCritical: z.number(),
              openHigh: z.number(),
              averageResolutionTimeHours: z.number().nullable(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { locationId?: string; startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const { locationId, startDate, endDate } = request.query;

      const whereConditions: SQL[] = [eq(alerts.tenantId, context.tenantId)];

      if (locationId) {
        whereConditions.push(eq(alerts.locationId, locationId));
      }

      if (startDate) {
        whereConditions.push(gte(alerts.createdAt, new Date(startDate)));
      }

      if (endDate) {
        whereConditions.push(lte(alerts.createdAt, new Date(endDate)));
      }

      const allAlerts = await db.select().from(alerts).where(and(...whereConditions));

      const total = allAlerts.length;
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byType: Record<string, number> = {};

      let openCritical = 0;
      let openHigh = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      allAlerts.forEach((alert) => {
        byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
        byPriority[alert.priority] = (byPriority[alert.priority] || 0) + 1;
        byType[alert.type] = (byType[alert.type] || 0) + 1;

        if (alert.status === 'open') {
          if (alert.priority === 'critical') openCritical++;
          if (alert.priority === 'high') openHigh++;
        }

        if (alert.status === 'resolved' && alert.resolvedAt) {
          const resolutionTimeMs = alert.resolvedAt.getTime() - alert.createdAt.getTime();
          totalResolutionTime += resolutionTimeMs / (1000 * 60 * 60); // Convert to hours
          resolvedCount++;
        }
      });

      const averageResolutionTimeHours = resolvedCount > 0 ? totalResolutionTime / resolvedCount : null;

      const stats = {
        total,
        byStatus,
        byPriority,
        byType,
        openCritical,
        openHigh,
        averageResolutionTimeHours,
      };

      return reply.send(createSuccessResponse(stats, 'Alert statistics retrieved successfully'));
    }
  );
}
