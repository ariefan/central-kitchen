import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { uomConversions, uoms } from '@/config/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth';

// Schemas
const uomConversionCreateSchema = z.object({
  fromUomId: z.string().uuid("From UOM is required"),
  toUomId: z.string().uuid("To UOM is required"),
  factor: z.number().positive("Conversion factor must be positive"),
});

const uomConversionUpdateSchema = uomConversionCreateSchema.partial();

type UOMConversionQuery = {
  fromUomId?: string;
  toUomId?: string;
};

// Response schemas
const uomConversionResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const uomConversionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function uomConversionRoutes(fastify: FastifyInstance) {
  // GET /api/v1/uom-conversions - List all UOM conversions
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all UOM conversions',
        tags: ['UOM Conversions'],
        querystring: z.object({
          fromUomId: z.string().uuid().optional(),
          toUomId: z.string().uuid().optional(),
        }),
        response: {
          200: uomConversionsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromUomId, toUomId } = request.query as UOMConversionQuery;

      let whereConditions = [];

      if (fromUomId) {
        whereConditions.push(eq(uomConversions.fromUomId, fromUomId));
      }

      if (toUomId) {
        whereConditions.push(eq(uomConversions.toUomId, toUomId));
      }

      const allConversions = await db.select({
        conversion: uomConversions,
        fromUom: uoms,
        toUom: { id: uoms.id, name: uoms.name, code: uoms.code, symbol: uoms.symbol, kind: uoms.kind },
      })
        .from(uomConversions)
        .leftJoin(uoms, eq(uomConversions.fromUomId, uoms.id))
        .where(and(...whereConditions))
        .orderBy(uoms.code);

      return reply.send(createSuccessResponse(allConversions, 'UOM conversions retrieved successfully'));
    }
  );

  // GET /api/v1/uom-conversions/:id - Get UOM conversion by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get UOM conversion by ID',
        tags: ['UOM Conversions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: uomConversionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const conversionData = await db.select({
        conversion: uomConversions,
        fromUom: uoms,
        toUom: { id: uoms.id, name: uoms.name, code: uoms.code, symbol: uoms.symbol, kind: uoms.kind },
      })
        .from(uomConversions)
        .leftJoin(uoms, eq(uomConversions.fromUomId, uoms.id))
        .where(eq(uomConversions.id, request.params.id))
        .limit(1);

      if (!conversionData.length) {
        return createNotFoundError('UOM conversion not found', reply);
      }

      // Get the "to" UOM separately
      const conversion = conversionData[0];
      const toUomData = await db.select()
        .from(uoms)
        .where(eq(uoms.id, conversion.conversion.toUomId))
        .limit(1);

      const conversionWithUOMs = {
        ...conversion!.conversion,
        fromUom: conversion.fromUom,
        toUom: toUomData[0],
      };

      return reply.send(createSuccessResponse(conversionWithUOMs, 'UOM conversion retrieved successfully'));
    }
  );

  // POST /api/v1/uom-conversions - Create new UOM conversion
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new UOM conversion',
        tags: ['UOM Conversions'],
        body: uomConversionCreateSchema,
        response: {
          201: uomConversionResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof uomConversionCreateSchema> }>, reply: FastifyReply) => {
      // Check if conversion already exists
      const existingConversion = await db.select()
        .from(uomConversions)
        .where(and(
          eq(uomConversions.fromUomId, request.body.fromUomId),
          eq(uomConversions.toUomId, request.body.toUomId)
        ))
        .limit(1);

      if (existingConversion.length) {
        return reply.status(400).send({
          success: false,
          message: 'Conversion between these UOMs already exists',
        });
      }

      const newConversion = {
        fromUomId: request.body.fromUomId,
        toUomId: request.body.toUomId,
        factor: request.body.factor.toString(),
      };

      const [conversion] = await db.insert(uomConversions).values(newConversion).returning();

      return reply.status(201).send(createSuccessResponse(conversion, 'UOM conversion created successfully'));
    }
  );

  // PATCH /api/v1/uom-conversions/:id - Update UOM conversion
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update UOM conversion',
        tags: ['UOM Conversions'],
        params: z.object({ id: z.string().uuid() }),
        body: uomConversionUpdateSchema,
        response: {
          200: uomConversionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof uomConversionUpdateSchema>> }>, reply: FastifyReply) => {
      const result = await db.update(uomConversions)
        .set({
          ...request.body,
          factor: request.body.factor?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(uomConversions.id, request.params.id))
        .returning();

      if (!result.length) {
        return createNotFoundError('UOM conversion not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'UOM conversion updated successfully'));
    }
  );

  // DELETE /api/v1/uom-conversions/:id - Delete UOM conversion
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete UOM conversion',
        tags: ['UOM Conversions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: uomConversionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const result = await db.delete(uomConversions)
        .where(eq(uomConversions.id, request.params.id))
        .returning();

      if (!result.length) {
        return createNotFoundError('UOM conversion not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'UOM conversion deleted successfully'));
    }
  );

  // POST /api/v1/uom-conversions/calculate - Calculate conversion
  fastify.post(
    '/calculate',
    {
      schema: {
        description: 'Calculate conversion between UOMs',
        tags: ['UOM Conversions'],
        body: z.object({
          fromUomId: z.string().uuid(),
          toUomId: z.string().uuid(),
          quantity: z.number().positive(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              fromUom: z.any(),
              toUom: z.any(),
              originalQuantity: z.number(),
              convertedQuantity: z.number(),
              conversionFactor: z.number(),
              path: z.array(z.any()).optional(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: { fromUomId: string; toUomId: string; quantity: number } }>, reply: FastifyReply) => {
      const { fromUomId, toUomId, quantity } = request.body;

      // Try direct conversion first
      const directConversion = await db.select({
        conversion: uomConversions,
        fromUom: uoms,
        toUom: { id: uoms.id, name: uoms.name, code: uoms.code, symbol: uoms.symbol, kind: uoms.kind },
      })
        .from(uomConversions)
        .leftJoin(uoms, eq(uomConversions.fromUomId, uoms.id))
        .where(and(
          eq(uomConversions.fromUomId, fromUomId),
          eq(uomConversions.toUomId, toUomId)
        ))
        .limit(1);

      if (directConversion.length) {
        const conversion = directConversion[0];
        const toUomData = await db.select()
          .from(uoms)
          .where(eq(uoms.id, conversion.conversion.toUomId))
          .limit(1);

        const factor = parseFloat(conversion.conversion.factor);
        const convertedQuantity = quantity * factor;

        return reply.send(createSuccessResponse({
          fromUom: conversion.fromUom,
          toUom: toUomData[0],
          originalQuantity: quantity,
          convertedQuantity,
          conversionFactor: factor,
          path: [conversion],
        }, 'Conversion calculated successfully'));
      }

      // Try reverse conversion
      const reverseConversion = await db.select({
        conversion: uomConversions,
        fromUom: uoms,
        toUom: { id: uoms.id, name: uoms.name, code: uoms.code, symbol: uoms.symbol, kind: uoms.kind },
      })
        .from(uomConversions)
        .leftJoin(uoms, eq(uomConversions.fromUomId, uoms.id))
        .where(and(
          eq(uomConversions.fromUomId, toUomId),
          eq(uomConversions.toUomId, fromUomId)
        ))
        .limit(1);

      if (reverseConversion.length) {
        const conversion = reverseConversion[0];
        const fromUomData = await db.select()
          .from(uoms)
          .where(eq(uoms.id, conversion.conversion.toUomId))
          .limit(1);

        const toUomData = await db.select()
          .from(uoms)
          .where(eq(uoms.id, conversion.conversion.fromUomId))
          .limit(1);

        const factor = parseFloat(conversion.conversion.factor);
        const convertedQuantity = quantity / factor;

        return reply.send(createSuccessResponse({
          fromUom: fromUomData[0],
          toUom: toUomData[0],
          originalQuantity: quantity,
          convertedQuantity,
          conversionFactor: 1 / factor,
          path: [conversion],
        }, 'Conversion calculated successfully'));
      }

      // No direct conversion found
      const fromUomData = await db.select()
        .from(uoms)
        .where(eq(uoms.id, fromUomId))
        .limit(1);

      const toUomData = await db.select()
        .from(uoms)
        .where(eq(uoms.id, toUomId))
        .limit(1);

      return reply.status(400).send({
        success: false,
        message: 'No conversion path found between these UOMs',
        data: {
          fromUom: fromUomData[0],
          toUom: toUomData[0],
        }
      });
    }
  );
}