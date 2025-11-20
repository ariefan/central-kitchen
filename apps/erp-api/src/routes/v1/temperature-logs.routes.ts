import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DEFAULT_TEMPERATURE_RANGES,
  isTemperatureOutOfRange,
  calculateTemperatureDeviation,
  type StorageArea,
} from '@contracts/erp';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createNotFoundError,
  notFoundResponseSchema,
} from '@/shared/utils/responses.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import { temperatureLogs, locations, users, alerts } from '@/config/schema.js';
import { eq, and, desc, gte, lte, sql, type SQL } from 'drizzle-orm';

// Simplified query schema matching DB
const temperatureLogQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  area: z.string().optional(),
  isAlert: z.boolean().optional(),
  minTemperature: z.number().optional(),
  maxTemperature: z.number().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

const temperatureLogCreateSchema = z.object({
  locationId: z.string().uuid(),
  area: z.string().optional(),
  temperature: z.number().min(-50).max(100),
  humidity: z.number().min(0).max(100).optional(),
  isAutomatic: z.boolean().default(false).optional(),
  deviceId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
});

export function temperatureLogRoutes(fastify: FastifyInstance) {
  // GET /api/v1/temperature-logs - List all temperature logs
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all temperature logs with optional filters',
        tags: ['Temperature Logs'],
        querystring: temperatureLogQuerySchema,
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
      request: FastifyRequest<{ Querystring: z.infer<typeof temperatureLogQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const query = request.query;

      const whereConditions: SQL[] = [eq(temperatureLogs.tenantId, context.tenantId)];

      // Apply filters
      if (query.locationId) {
        whereConditions.push(eq(temperatureLogs.locationId, query.locationId));
      }

      if (query.area) {
        whereConditions.push(eq(temperatureLogs.area, query.area));
      }

      if (query.isAlert !== undefined) {
        whereConditions.push(eq(temperatureLogs.isAlert, query.isAlert));
      }

      if (query.minTemperature !== undefined) {
        whereConditions.push(gte(temperatureLogs.temperature, query.minTemperature.toString()));
      }

      if (query.maxTemperature !== undefined) {
        whereConditions.push(lte(temperatureLogs.temperature, query.maxTemperature.toString()));
      }

      if (query.dateFrom) {
        whereConditions.push(gte(temperatureLogs.recordedAt, new Date(query.dateFrom)));
      }

      if (query.dateTo) {
        whereConditions.push(lte(temperatureLogs.recordedAt, new Date(query.dateTo)));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(temperatureLogs)
        .where(and(...whereConditions));

      const total = countResult?.count || 0;

      // Get paginated results
      const limit = query.limit || 20;
      const offset = query.offset || 0;

      const results = await db
        .select({
          log: temperatureLogs,
          location: {
            id: locations.id,
            name: locations.name,
            code: locations.code,
          },
          recordedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(temperatureLogs)
        .leftJoin(locations, eq(temperatureLogs.locationId, locations.id))
        .leftJoin(users, eq(temperatureLogs.recordedBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(temperatureLogs.recordedAt))
        .limit(limit)
        .offset(offset);

      const items = results.map((r) => {
        const metadata = (typeof r.log.metadata === 'object' && r.log.metadata !== null ? r.log.metadata : {}) as any;
        return {
          ...r.log,
          // Map DB fields to contract expectations
          isOutOfRange: r.log.isAlert,
          expectedMinTemp: metadata.expectedMin ?? null,
          expectedMaxTemp: metadata.expectedMax ?? null,
          deviation: metadata.deviation ?? null,
          isAutomatic: metadata.isAutomatic ?? false,
          photoUrl: metadata.photoUrl ?? null,
          alertId: metadata.alertId ?? null,
          notes: metadata.notes ?? null,
          // Relations
          location: r.location,
          recordedByUser: r.recordedByUser ? {
            id: r.recordedByUser.id,
            name: `${r.recordedByUser.firstName || ''} ${r.recordedByUser.lastName || ''}`.trim() || null,
            email: r.recordedByUser.email,
          } : null,
        };
      });

      return reply.send(createPaginatedResponse(items, total, limit, offset));
    }
  );

  // GET /api/v1/temperature-logs/:id - Get single temperature log
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get temperature log by ID',
        tags: ['Temperature Logs'],
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
          log: temperatureLogs,
          location: {
            id: locations.id,
            name: locations.name,
            code: locations.code,
          },
          recordedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(temperatureLogs)
        .leftJoin(locations, eq(temperatureLogs.locationId, locations.id))
        .leftJoin(users, eq(temperatureLogs.recordedBy, users.id))
        .where(
          and(eq(temperatureLogs.id, request.params.id), eq(temperatureLogs.tenantId, context.tenantId))
        )
        .limit(1);

      if (!results.length) {
        return createNotFoundError('Temperature log not found', reply);
      }

      const result = results[0]!;
      const metadata = (typeof result.log.metadata === 'object' && result.log.metadata !== null ? result.log.metadata : {}) as any;
      const responseData = {
        ...result.log,
        // Map DB fields to contract expectations
        isOutOfRange: result.log.isAlert,
        expectedMinTemp: metadata.expectedMin ?? null,
        expectedMaxTemp: metadata.expectedMax ?? null,
        deviation: metadata.deviation ?? null,
        isAutomatic: metadata.isAutomatic ?? false,
        photoUrl: metadata.photoUrl ?? null,
        alertId: metadata.alertId ?? null,
        notes: metadata.notes ?? null,
        // Relations
        location: result.location,
        recordedByUser: result.recordedByUser ? {
          id: result.recordedByUser.id,
          name: `${result.recordedByUser.firstName || ''} ${result.recordedByUser.lastName || ''}`.trim() || null,
          email: result.recordedByUser.email,
        } : null,
      };

      return reply.send(createSuccessResponse(responseData, 'Temperature log retrieved successfully'));
    }
  );

  // POST /api/v1/temperature-logs - Create new temperature log
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new temperature log (automatic alert generation if out of range)',
        tags: ['Temperature Logs'],
        body: temperatureLogCreateSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof temperatureLogCreateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const body = request.body;

      // Validate location exists
      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, body.locationId), eq(locations.tenantId, context.tenantId)))
        .limit(1);

      if (!location) {
        return createNotFoundError('Location not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        // Check temperature range
        const tempValue = body.temperature;
        const area = (body.area || 'other') as StorageArea;
        const tempRange = DEFAULT_TEMPERATURE_RANGES[area];
        const outOfRange = isTemperatureOutOfRange(tempValue, area);
        const deviation = outOfRange ? calculateTemperatureDeviation(tempValue, area) : null;

        // Create temperature log
        const [log] = await tx
          .insert(temperatureLogs)
          .values({
            tenantId: context.tenantId,
            locationId: body.locationId,
            area: body.area || null,
            temperature: tempValue.toString(),
            humidity: body.humidity?.toString() ?? null,
            deviceId: body.deviceId ?? null,
            recordedAt: new Date(),
            recordedBy: context.userId,
            isAlert: outOfRange,
            alertReason: outOfRange
              ? `Temperature ${deviation && deviation > 0 ? 'too high' : 'too low'}: ${tempValue}°C (range: ${tempRange.minTemp}°C to ${tempRange.maxTemp}°C)`
              : null,
            metadata: {
              expectedMin: tempRange.minTemp,
              expectedMax: tempRange.maxTemp,
              deviation,
              isAutomatic: body.isAutomatic ?? false,
              notes: body.notes,
              photoUrl: body.photoUrl,
            },
          })
          .returning();

        // Generate alert if out of range
        let alertId: string | null = null;
        if (outOfRange && log) {
          const absDeviation = Math.abs(deviation || 0);
          let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

          if (absDeviation > 10) priority = 'critical';
          else if (absDeviation > 5) priority = 'high';
          else if (absDeviation >= 2) priority = 'medium';

          const [alert] = await tx
            .insert(alerts)
            .values({
              tenantId: context.tenantId,
              locationId: body.locationId,
              alertType: 'temperature_out_of_range',
              priority,
              title: `Temperature ${deviation && deviation > 0 ? 'Too High' : 'Too Low'}${area !== 'other' ? ` in ${area.replace(/_/g, ' ')}` : ''}`,
              message: `Temperature reading ${tempValue}°C is outside acceptable range (${tempRange.minTemp}°C to ${tempRange.maxTemp}°C). Deviation: ${deviation?.toFixed(1)}°C`,
              referenceType: 'temperature_log',
              referenceId: log.id,
              metadata: {
                temperature: tempValue,
                expectedMin: tempRange.minTemp,
                expectedMax: tempRange.maxTemp,
                deviation,
                area: body.area,
                deviceId: body.deviceId,
              },
            })
            .returning();

          alertId = alert?.id ?? null;

          // Update temperature log with alert reference
          if (alertId) {
            const currentMetadata = (typeof log.metadata === 'object' && log.metadata !== null ? log.metadata : {}) as any;
            await tx
              .update(temperatureLogs)
              .set({
                metadata: {
                  ...currentMetadata,
                  alertId,
                } as any,
              })
              .where(eq(temperatureLogs.id, log.id));
          }
        }

        return log;
      });

      return reply.status(201).send(createSuccessResponse(result, 'Temperature log created successfully'));
    }
  );

  // GET /api/v1/temperature-logs/chart - Get chart data
  fastify.get(
    '/chart',
    {
      schema: {
        description: 'Get temperature chart data for visualization',
        tags: ['Temperature Logs'],
        querystring: z.object({
          locationId: z.string().uuid(),
          area: z.string().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { locationId: string; area?: string; dateFrom?: string; dateTo?: string };
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const { locationId, area, dateFrom, dateTo } = request.query;

      // Get location details
      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, locationId), eq(locations.tenantId, context.tenantId)))
        .limit(1);

      if (!location) {
        return createNotFoundError('Location not found', reply);
      }

      // Build where conditions
      const whereConditions: SQL[] = [
        eq(temperatureLogs.tenantId, context.tenantId),
        eq(temperatureLogs.locationId, locationId),
      ];

      if (area) {
        whereConditions.push(eq(temperatureLogs.area, area));
      }

      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 7); // Last 7 days

      const periodStart = dateFrom ? new Date(dateFrom) : defaultStartDate;
      const periodEnd = dateTo ? new Date(dateTo) : new Date();

      whereConditions.push(gte(temperatureLogs.recordedAt, periodStart));
      whereConditions.push(lte(temperatureLogs.recordedAt, periodEnd));

      // Get temperature data
      const data = await db
        .select()
        .from(temperatureLogs)
        .where(and(...whereConditions))
        .orderBy(temperatureLogs.recordedAt);

      // Get expected range
      const firstArea = (area || data[0]?.area || 'other') as StorageArea;
      const expectedRange = {
        minTemp: DEFAULT_TEMPERATURE_RANGES[firstArea].minTemp,
        maxTemp: DEFAULT_TEMPERATURE_RANGES[firstArea].maxTemp,
      };

      // Prepare chart data points
      const dataPoints = data.map((log) => ({
        timestamp: log.recordedAt,
        temperature: parseFloat(log.temperature),
        humidity: log.humidity ? parseFloat(log.humidity) : null,
        isOutOfRange: log.isAlert,
        area: log.area || 'other',
      }));

      // Calculate summary
      const temperatures = data.map((l) => parseFloat(l.temperature));
      const outOfRangeCount = data.filter((l) => l.isAlert).length;

      const summary = {
        totalReadings: data.length,
        outOfRangeCount,
        averageTemp: temperatures.length > 0 ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length : 0,
        minTemp: temperatures.length > 0 ? Math.min(...temperatures) : 0,
        maxTemp: temperatures.length > 0 ? Math.max(...temperatures) : 0,
        complianceRate: data.length > 0 ? ((data.length - outOfRangeCount) / data.length) * 100 : 100,
      };

      const responseData = {
        locationId,
        locationName: location.name,
        area: area || undefined,
        period: {
          startDate: periodStart,
          endDate: periodEnd,
        },
        expectedRange,
        dataPoints,
        summary,
      };

      return reply.send(createSuccessResponse(responseData, 'Temperature chart data retrieved successfully'));
    }
  );
}
