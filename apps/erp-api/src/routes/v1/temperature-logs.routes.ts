import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  temperatureLogCreateSchema,
  temperatureLogQuerySchema,
  temperatureLogResponseSchema,
  temperatureLogsResponseSchema,
  temperatureChartResponseSchema,
  complianceReportSchema,
  DEFAULT_TEMPERATURE_RANGES,
  isTemperatureOutOfRange,
  calculateTemperatureDeviation,
  generateComplianceSummary,
  type TemperatureLogCreate,
  type TemperatureLogQuery,
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
          200: temperatureLogsResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: TemperatureLogQuery }>,
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

      if (query.isAutomatic !== undefined) {
        whereConditions.push(eq(temperatureLogs.isAutomatic, query.isAutomatic));
      }

      if (query.isOutOfRange !== undefined) {
        whereConditions.push(eq(temperatureLogs.isOutOfRange, query.isOutOfRange));
      }

      if (query.minTemperature !== undefined) {
        whereConditions.push(gte(temperatureLogs.temperature, query.minTemperature.toString()));
      }

      if (query.maxTemperature !== undefined) {
        whereConditions.push(lte(temperatureLogs.temperature, query.maxTemperature.toString()));
      }

      if (query.startDate) {
        whereConditions.push(gte(temperatureLogs.recordedAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        whereConditions.push(lte(temperatureLogs.recordedAt, new Date(query.endDate)));
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
            name: users.name,
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

      const items = results.map((r) => ({
        ...r.log,
        location: r.location,
        recordedByUser: r.recordedByUser,
      }));

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
          200: temperatureLogResponseSchema,
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
            name: users.name,
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
      const responseData = {
        ...result.log,
        location: result.location,
        recordedByUser: result.recordedByUser,
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
          201: temperatureLogResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: TemperatureLogCreate }>, reply: FastifyReply) => {
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
        const area = body.area as StorageArea;
        const tempRange = DEFAULT_TEMPERATURE_RANGES[area];
        const outOfRange = isTemperatureOutOfRange(tempValue, area);
        const deviation = outOfRange ? calculateTemperatureDeviation(tempValue, area) : null;

        // Create temperature log
        const [log] = await tx
          .insert(temperatureLogs)
          .values({
            tenantId: context.tenantId,
            locationId: body.locationId,
            area: body.area,
            temperature: tempValue.toString(),
            humidity: body.humidity?.toString() ?? null,
            isAutomatic: body.isAutomatic,
            recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
            recordedBy: context.userId,
            isOutOfRange: outOfRange,
            expectedMinTemp: tempRange.minTemp,
            expectedMaxTemp: tempRange.maxTemp,
            deviation: deviation,
            notes: body.notes ?? null,
            photoUrl: body.photoUrl ?? null,
            alertId: null, // Will be updated if alert created
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
              type: 'temperature_out_of_range',
              priority,
              title: `Temperature ${deviation && deviation > 0 ? 'Too High' : 'Too Low'} in ${area.replace(/_/g, ' ')}`,
              message: `Temperature reading ${tempValue}°C is outside acceptable range (${tempRange.minTemp}°C to ${tempRange.maxTemp}°C). Deviation: ${deviation?.toFixed(1)}°C`,
              status: 'open',
              refType: 'temperature_log',
              refId: log.id,
              metadata: {
                temperature: tempValue,
                expectedMin: tempRange.minTemp,
                expectedMax: tempRange.maxTemp,
                deviation,
                area: body.area,
                isAutomatic: body.isAutomatic,
              },
              createdBy: context.userId,
            })
            .returning();

          if (alert) {
            alertId = alert.id;

            // Update temperature log with alert ID
            await tx
              .update(temperatureLogs)
              .set({ alertId: alert.id })
              .where(eq(temperatureLogs.id, log.id));
          }
        }

        // Get location and user details
        const [locationData] = await tx
          .select({
            id: locations.id,
            name: locations.name,
            code: locations.code,
          })
          .from(locations)
          .where(eq(locations.id, body.locationId))
          .limit(1);

        const [userData] = await tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, context.userId))
          .limit(1);

        return {
          ...log!,
          alertId: alertId || log!.alertId,
          location: locationData || null,
          recordedByUser: userData || null,
        };
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
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }),
        response: {
          200: temperatureChartResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { locationId: string; area?: string; startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const { locationId, area, startDate, endDate } = request.query;

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

      const periodStart = startDate ? new Date(startDate) : defaultStartDate;
      const periodEnd = endDate ? new Date(endDate) : new Date();

      whereConditions.push(gte(temperatureLogs.recordedAt, periodStart));
      whereConditions.push(lte(temperatureLogs.recordedAt, periodEnd));

      // Get temperature data
      const data = await db
        .select()
        .from(temperatureLogs)
        .where(and(...whereConditions))
        .orderBy(temperatureLogs.recordedAt);

      // Get expected range (use first area from data or provided area)
      const firstArea = (area || data[0]?.area) as StorageArea | undefined;
      const expectedRange = firstArea
        ? {
            minTemp: DEFAULT_TEMPERATURE_RANGES[firstArea].minTemp,
            maxTemp: DEFAULT_TEMPERATURE_RANGES[firstArea].maxTemp,
          }
        : null;

      // Prepare chart data points
      const dataPoints = data.map((log) => ({
        timestamp: log.recordedAt,
        temperature: parseFloat(log.temperature),
        humidity: log.humidity ? parseFloat(log.humidity) : null,
        isOutOfRange: log.isOutOfRange,
        area: log.area,
      }));

      // Calculate summary
      const summary = generateComplianceSummary(
        data.map((log) => ({
          temperature: parseFloat(log.temperature),
          isOutOfRange: log.isOutOfRange,
          recordedAt: log.recordedAt,
        }))
      );

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

  // GET /api/v1/temperature-logs/compliance - Get compliance report
  fastify.get(
    '/compliance',
    {
      schema: {
        description: 'Generate HACCP compliance report',
        tags: ['Temperature Logs'],
        querystring: z.object({
          locationId: z.string().uuid(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }),
        response: {
          200: complianceReportSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { locationId: string; startDate?: string; endDate?: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const { locationId, startDate, endDate } = request.query;

      // Get location details
      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, locationId), eq(locations.tenantId, context.tenantId)))
        .limit(1);

      if (!location) {
        return createNotFoundError('Location not found', reply);
      }

      // Default to last 30 days
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const periodStart = startDate ? new Date(startDate) : defaultStartDate;
      const periodEnd = endDate ? new Date(endDate) : new Date();

      // Get all temperature data for the period
      const data = await db
        .select()
        .from(temperatureLogs)
        .where(
          and(
            eq(temperatureLogs.tenantId, context.tenantId),
            eq(temperatureLogs.locationId, locationId),
            gte(temperatureLogs.recordedAt, periodStart),
            lte(temperatureLogs.recordedAt, periodEnd)
          )
        )
        .orderBy(temperatureLogs.area, temperatureLogs.recordedAt);

      // Group by area
      const areaMap = new Map<string, typeof data>();
      data.forEach((log) => {
        if (!areaMap.has(log.area)) {
          areaMap.set(log.area, []);
        }
        areaMap.get(log.area)!.push(log);
      });

      // Generate area reports
      const areas = Array.from(areaMap.entries()).map(([area, logs]) => {
        const tempRange = DEFAULT_TEMPERATURE_RANGES[area as StorageArea];
        const totalReadings = logs.length;
        const outOfRangeReadings = logs.filter((l) => l.isOutOfRange).length;
        const compliantReadings = totalReadings - outOfRangeReadings;
        const complianceRate = totalReadings > 0 ? (compliantReadings / totalReadings) * 100 : 100;

        const temperatures = logs.map((l) => parseFloat(l.temperature));
        const averageTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length || 0;

        const incidents = logs
          .filter((l) => l.isOutOfRange)
          .map((l) => ({
            timestamp: l.recordedAt,
            temperature: parseFloat(l.temperature),
            deviation: l.deviation || 0,
            correctiveAction: l.notes,
          }));

        return {
          area,
          expectedRange: {
            minTemp: tempRange.minTemp,
            maxTemp: tempRange.maxTemp,
          },
          totalReadings,
          compliantReadings,
          outOfRangeReadings,
          complianceRate,
          averageTemp,
          incidents,
        };
      });

      // Calculate overall compliance
      const totalReadings = data.length;
      const totalOutOfRange = data.filter((l) => l.isOutOfRange).length;
      const overallCompliance = totalReadings > 0 ? ((totalReadings - totalOutOfRange) / totalReadings) * 100 : 100;

      const reportData = {
        reportPeriod: {
          startDate: periodStart,
          endDate: periodEnd,
        },
        locationId,
        locationName: location.name,
        areas,
        overallCompliance,
        totalIncidents: totalOutOfRange,
        generatedAt: new Date(),
        generatedBy: context.userId,
      };

      return reply.send(createSuccessResponse(reportData, 'Compliance report generated successfully'));
    }
  );
}
