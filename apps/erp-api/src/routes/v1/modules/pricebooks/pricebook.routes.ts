import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { priceBooks, priceBookItems } from '@/config/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth';

// Price book schemas
const priceBookInsertSchema = createInsertSchema(priceBooks).omit({
  id: true,
  tenantId: true,
});

const priceBookItemInsertSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  price: z.string(),
});

const priceBookResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const priceBooksResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function priceBookRoutes(fastify: FastifyInstance) {
  // Price Book endpoints

  // GET /api/v1/pricebooks - List all price books
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all price books',
        tags: ['Price Books'],
        response: {
          200: priceBooksResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const allPriceBooks = await db.select().from(priceBooks)
        .where(eq(priceBooks.tenantId, tenantId));
      return reply.send(createSuccessResponse(allPriceBooks, 'Price books retrieved successfully'));
    }
  );

  // POST /api/v1/pricebooks - Create new price book
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new price book',
        tags: ['Price Books'],
        body: priceBookInsertSchema,
        response: {
          201: priceBookResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof priceBookInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const result = await db.insert(priceBooks).values({
        ...request.body,
        tenantId,
      }).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Price book created successfully'));
    }
  );

  // Price Book Item endpoints

  // GET /api/v1/pricebooks/:id/items - Get price book items
  fastify.get(
    '/:id/items',
    {
      schema: {
        description: 'Get price book items',
        tags: ['Price Books'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.any()),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      // First verify the price book belongs to this tenant
      const priceBook = await db.select().from(priceBooks)
        .where(and(
          eq(priceBooks.id, request.params.id),
          eq(priceBooks.tenantId, tenantId)
        ))
        .limit(1);

      if (!priceBook.length) {
        return createNotFoundError('Price book not found', reply);
      }

      const items = await db.select().from(priceBookItems)
        .where(eq(priceBookItems.priceBookId, request.params.id));
      return reply.send(createSuccessResponse(items, 'Price book items retrieved successfully'));
    }
  );

  // POST /api/v1/pricebooks/:id/items - Add item to price book
  fastify.post(
    '/:id/items',
    {
      schema: {
        description: 'Add item to price book',
        tags: ['Price Books'],
        params: z.object({ id: z.string().uuid() }),
        body: priceBookItemInsertSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof priceBookItemInsertSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      // First verify the price book belongs to this tenant
      const priceBook = await db.select().from(priceBooks)
        .where(and(
          eq(priceBooks.id, request.params.id),
          eq(priceBooks.tenantId, tenantId)
        ))
        .limit(1);

      if (!priceBook.length) {
        return createNotFoundError('Price book not found', reply);
      }

      const result = await db.insert(priceBookItems).values({
        productId: request.body.productId,
        variantId: request.body.variantId,
        locationId: request.body.locationId,
        price: request.body.price,
        priceBookId: request.params.id,
      }).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Price book item added successfully'));
    }
  );
}
