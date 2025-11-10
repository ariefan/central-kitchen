import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, createDeleteResponse, notFoundResponseSchema, deleteResponseSchema } from '@/shared/utils/responses';
import { createEntitySchemas } from '@/shared/utils/schemas';
import { db } from '@/config/database';
import { locations, locationTypes } from '@/config/schema';
import { eq } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth';

// Create schemas from the database schema (single source of truth)
const locationInsertSchema = createInsertSchema(locations, {
  type: z.enum(locationTypes),
  country: z.string().max(100).default('Indonesia'),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});


const { response: locationResponseSchema, listResponse: locationsResponseSchema } = createEntitySchemas(
  locations,
  {
    selectOverrides: {
      // Convert JSON fields to proper types
      metadata: z.any().nullable(),
    }
  }
);

export function locationRoutes(fastify: FastifyInstance) {
  // GET /api/v1/locations - List all locations
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all locations',
        tags: ['Locations'],
        querystring: z.object({
          type: z.enum(locationTypes).optional(),
          isActive: z.coerce.boolean().optional(),
        }),
        response: {
          200: locationsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const allLocations = await db.select().from(locations);
      return reply.send(createSuccessResponse(allLocations, 'Locations retrieved successfully'));
    }
  );

  // GET /api/v1/locations/:id - Get location by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get location by ID',
        tags: ['Locations'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: locationResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const location = await db.select().from(locations).where(eq(locations.id, request.params.id)).limit(1);

      if (!location.length) {
        return createNotFoundError('Location not found', reply);
      }

      return reply.send(createSuccessResponse(location[0], 'Location retrieved successfully'));
    }
  );

  // POST /api/v1/locations - Create new location
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new location',
        tags: ['Locations'],
        body: locationInsertSchema,
        response: {
          201: locationResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof locationInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const newLocation = {
        ...request.body,
        tenantId,
        metadata: request.body.metadata ? JSON.stringify(request.body.metadata) : undefined,
      };

      const result = await db.insert(locations).values(newLocation).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Location created successfully'));
    }
  );

  // DELETE /api/v1/locations/:id - Delete location
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete a location',
        tags: ['Locations'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: deleteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const result = await db
        .delete(locations)
        .where(eq(locations.id, request.params.id))
        .returning({ id: locations.id });

      if (!result.length) {
        return createNotFoundError('Location not found', reply);
      }

      return reply.send(createDeleteResponse('Location deleted successfully'));
    }
  );
}