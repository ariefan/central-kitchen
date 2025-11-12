import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { productionOrders, recipes, locations, products, uoms, recipeItems, stockLedger } from '../../../../config/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth';

// Production Order schemas
const productionOrderCreateSchema = z.object({
  recipeId: z.string().uuid(),
  locationId: z.string().uuid(),
  plannedQtyBase: z.number().positive(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

const productionOrderUpdateSchema = z.object({
  plannedQtyBase: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
});

const productionOrderExecuteSchema = z.object({
  actualQtyBase: z.number().positive(),
  notes: z.string().optional(),
});

type ProductionOrderQuery = {
  status?: string;
  recipeId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Response schemas
const productionOrderResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const productionOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function productionOrderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/production-orders - List all production orders
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all production orders with recipe details',
        tags: ['Production Orders'],
        querystring: z.object({
          status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
          recipeId: z.string().uuid().optional(),
          locationId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: productionOrdersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, recipeId, locationId, dateFrom, dateTo } = request.query as ProductionOrderQuery;

      let whereConditions = [eq(productionOrders.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(productionOrders.status, status));
      }

      if (recipeId) {
        whereConditions.push(eq(productionOrders.recipeId, recipeId));
      }

      if (locationId) {
        whereConditions.push(eq(productionOrders.locationId, locationId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${productionOrders.scheduledAt} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${productionOrders.scheduledAt} <= ${new Date(dateTo)}`);
      }

      const allProductionOrders = await db.select({
        productionOrder: productionOrders,
        recipe: {
          id: recipes.id,
          code: recipes.code,
          name: recipes.name,
          yieldQtyBase: recipes.yieldQtyBase,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
        finishedProduct: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
        .from(productionOrders)
        .leftJoin(recipes, eq(productionOrders.recipeId, recipes.id))
        .leftJoin(locations, eq(productionOrders.locationId, locations.id))
        .leftJoin(products, eq(recipes.finishedProductId, products.id))
        .where(and(...whereConditions))
        .orderBy(desc(productionOrders.scheduledAt));

      return reply.send(createSuccessResponse(allProductionOrders, 'Production orders retrieved successfully'));
    }
  );

  // GET /api/v1/production-orders/:id - Get production order by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get production order by ID with full details',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const productionOrderData = await db.select({
        productionOrder: productionOrders,
        recipe: {
          id: recipes.id,
          code: recipes.code,
          name: recipes.name,
          instructions: recipes.instructions,
          yieldQtyBase: recipes.yieldQtyBase,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
        finishedProduct: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
        .from(productionOrders)
        .leftJoin(recipes, eq(productionOrders.recipeId, recipes.id))
        .leftJoin(locations, eq(productionOrders.locationId, locations.id))
        .leftJoin(products, eq(recipes.finishedProductId, products.id))
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!productionOrderData.length) {
        return createNotFoundError('Production order not found', reply);
      }

      const productionOrderRecord = productionOrderData[0]!;
      const recipeDetails = productionOrderRecord.recipe;

      if (!recipeDetails) {
        return createNotFoundError('Recipe details not found', reply);
      }

      const plannedQty = Number(productionOrderRecord.productionOrder.plannedQtyBase ?? 0);
      const recipeYieldQty = Number(recipeDetails.yieldQtyBase ?? 0);

      if (recipeYieldQty <= 0) {
        return createBadRequestError('Recipe yield quantity must be greater than zero', reply);
      }

      // Get recipe ingredients for production planning
      const ingredients = await db.select({
        item: recipeItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        uom: {
          id: uoms.id,
          code: uoms.code,
          name: uoms.name,
        },
      })
        .from(recipeItems)
        .leftJoin(products, eq(recipeItems.productId, products.id))
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(eq(recipeItems.recipeId, productionOrderRecord.productionOrder.recipeId))
        .orderBy(recipeItems.sortOrder);

      // Calculate required ingredient quantities
      const scaleFactor = plannedQty / recipeYieldQty;
      const requiredIngredients = ingredients.map(ingredient => ({
        ...ingredient.item,
        product: ingredient.product,
        uom: ingredient.uom,
        requiredQty: Number(ingredient.item.qtyBase) * scaleFactor,
      }));

      const productionOrderWithDetails = {
        ...productionOrderRecord.productionOrder,
        recipe: recipeDetails,
        location: productionOrderRecord.location,
        finishedProduct: productionOrderRecord.finishedProduct,
        ingredients: requiredIngredients,
        scaleFactor,
      };

      return reply.send(createSuccessResponse(productionOrderWithDetails, 'Production order retrieved successfully'));
    }
  );

  // POST /api/v1/production-orders - Create new production order
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new production order',
        tags: ['Production Orders'],
        body: productionOrderCreateSchema,
        response: {
          201: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof productionOrderCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Verify recipe exists and is active
      const recipeCheck = await db.select()
        .from(recipes)
        .where(and(
          eq(recipes.id, request.body.recipeId),
          eq(recipes.tenantId, tenantId),
          eq(recipes.isActive, true)
        ))
        .limit(1);

      if (!recipeCheck.length) {
        return createNotFoundError('Recipe not found or inactive', reply);
      }

      // Verify location exists
      const locationCheck = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

      if (!locationCheck.length) {
        return createNotFoundError('Location not found', reply);
      }

      // Generate production order number
      const orderNumber = `PROD-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newProductionOrder: typeof productionOrders.$inferInsert = {
        tenantId,
        orderNumber,
        recipeId: request.body.recipeId,
        locationId: request.body.locationId,
        plannedQtyBase: request.body.plannedQtyBase.toString(),
        scheduledAt: new Date(request.body.scheduledAt),
        notes: request.body.notes ?? null,
        createdBy: userId,
      };

      const result = await db.insert(productionOrders)
        .values(newProductionOrder)
        .returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Production order created successfully'));
    }
  );

  // PATCH /api/v1/production-orders/:id - Update production order
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update production order (scheduled only)',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: productionOrderUpdateSchema,
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof productionOrderUpdateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if production order exists and is scheduled
      const existingProductionOrder = await db.select()
        .from(productionOrders)
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.status, 'scheduled')
        ))
        .limit(1);

      if (!existingProductionOrder.length) {
        return createNotFoundError('Production order not found or cannot be edited', reply);
      }

      const updatePayload: Partial<typeof productionOrders.$inferInsert> & { updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (request.body.plannedQtyBase !== undefined) {
        updatePayload.plannedQtyBase = request.body.plannedQtyBase.toString();
      }

      if (request.body.scheduledAt) {
        updatePayload.scheduledAt = new Date(request.body.scheduledAt);
      }

      if (request.body.notes !== undefined) {
        updatePayload.notes = request.body.notes;
      }

      if (request.body.status) {
        updatePayload.status = request.body.status;
      }

      const result = await db.update(productionOrders)
        .set(updatePayload)
        .where(and(eq(productionOrders.id, request.params.id), eq(productionOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Production order updated successfully'));
    }
  );

  // POST /api/v1/production-orders/:id/start - Start production
  fastify.post(
    '/:id/start',
    {
      schema: {
        description: 'Start production order',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if production order exists and is scheduled
      const existingProductionOrder = await db.select()
        .from(productionOrders)
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.status, 'scheduled')
        ))
        .limit(1);

      if (!existingProductionOrder.length) {
        return createNotFoundError('Production order not found or not ready to start', reply);
      }

      const result = await db.update(productionOrders)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
          supervisedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(productionOrders.id, request.params.id), eq(productionOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Production started successfully'));
    }
  );

  // POST /api/v1/production-orders/:id/complete - Complete production
  fastify.post(
    '/:id/complete',
    {
      schema: {
        description: 'Complete production order with actual quantities',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: productionOrderExecuteSchema,
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof productionOrderExecuteSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if production order exists and is in progress
      const existingProductionOrder = await db.select()
        .from(productionOrders)
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.status, 'in_progress')
        ))
        .limit(1);

      if (!existingProductionOrder.length) {
        return createNotFoundError('Production order not found or not in progress', reply);
      }

      const result = await db.update(productionOrders)
        .set({
          status: 'completed',
          producedQtyBase: request.body.actualQtyBase.toString(),
          completedAt: new Date(),
          notes: request.body.notes ?? existingProductionOrder[0]!.notes,
          supervisedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(productionOrders.id, request.params.id), eq(productionOrders.tenantId, tenantId)))
        .returning();

      // Create inventory movements for production
      const ledgerEntries = [];
      const productionOrder = existingProductionOrder[0]!;
      const actualQuantity = request.body.actualQtyBase;

      // Get recipe details to calculate ingredient consumption
      const recipeDetails = await db
        .select({
          recipeId: recipeItems.recipeId,
          productId: recipeItems.productId,
          quantity: recipeItems.qtyBase,
        })
        .from(recipeItems)
        .where(eq(recipeItems.recipeId, productionOrder.recipeId));

      // 1. Record ingredient consumption (prod_out - components consumed)
      for (const ingredient of recipeDetails) {
        const requiredQuantity = (parseFloat(ingredient.quantity) * actualQuantity).toString();
        ledgerEntries.push({
          tenantId,
          productId: ingredient.productId,
          locationId: productionOrder.locationId,
          lotId: null, // Simple implementation for P2
          type: 'prod_out', // Production output (ingredients consumed)
          qtyDeltaBase: (-parseFloat(requiredQuantity)).toString(), // Negative for consumption
          unitCost: null, // Cost tracking can be added later
          refType: 'PRODUCTION_ORDER',
          refId: productionOrder.id,
          note: `Production Order ${productionOrder.id} - Ingredient consumption for ${actualQuantity} units`,
          createdBy: userId,
        });
      }

      // 2. Record finished goods production (prod_in - finished goods created)
      // Get the finished product from the recipe
      const recipe = await db
        .select({ productId: recipes.finishedProductId })
        .from(recipes)
        .where(eq(recipes.id, productionOrder.recipeId))
        .limit(1);

      if (recipe.length > 0) {
        ledgerEntries.push({
          tenantId,
          productId: recipe[0]!.productId,
          locationId: productionOrder.locationId,
          lotId: null, // Simple implementation for P2
          type: 'prod_in', // Production input (finished goods created)
          qtyDeltaBase: actualQuantity.toString(), // Positive for production
          unitCost: null, // Cost tracking can be added later
          refType: 'PRODUCTION_ORDER',
          refId: productionOrder.id,
          note: `Production Order ${productionOrder.id} - Produced ${actualQuantity} units`,
          createdBy: userId,
        });
      }

      // Insert all ledger entries
      if (ledgerEntries.length > 0) {
        try {
          await db.insert(stockLedger).values(ledgerEntries);
        } catch (error) {
          console.error('Production ledger insertion error:', error);
          // Continue even if ledger fails - production completion is more important
        }
      }

      return reply.send(createSuccessResponse(result[0], 'Production completed successfully'));
    }
  );

  // POST /api/v1/production-orders/:id/cancel - Cancel production order
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        description: 'Cancel production order',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().optional(),
        }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: { reason?: string }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if production order exists and can be cancelled
      const existingProductionOrder = await db.select()
        .from(productionOrders)
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId),
          sql`${productionOrders.status} IN ('scheduled', 'in_progress', 'on_hold')`
        ))
        .limit(1);

      if (!existingProductionOrder.length) {
        return createNotFoundError('Production order not found or cannot be cancelled', reply);
      }

      const currentMetadata = existingProductionOrder[0]!.metadata ?? {};
      const updatedMetadata = {
        ...currentMetadata,
        cancelReason: request.body.reason,
        cancelledAt: new Date(),
      };

      const result = await db.update(productionOrders)
        .set({
          status: 'cancelled',
          notes: request.body.reason ? `${existingProductionOrder[0]!.notes ?? ''} - CANCELLED: ${request.body.reason}`.trim() : existingProductionOrder[0]!.notes,
          metadata: updatedMetadata,
          updatedAt: new Date(),
        })
        .where(and(eq(productionOrders.id, request.params.id), eq(productionOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Production order cancelled successfully'));
    }
  );

  // POST /api/v1/production-orders/:id/hold - Put production order on hold
  fastify.post(
    '/:id/hold',
    {
      schema: {
        description: 'Put production order on hold',
        tags: ['Production Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().optional(),
        }),
        response: {
          200: productionOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: { reason?: string }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if production order exists and can be put on hold
      const existingProductionOrder = await db.select()
        .from(productionOrders)
        .where(and(
          eq(productionOrders.id, request.params.id),
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.status, 'scheduled')
        ))
        .limit(1);

      if (!existingProductionOrder.length) {
        return createNotFoundError('Production order not found or cannot be put on hold', reply);
      }

      const currentMetadata = existingProductionOrder[0]!.metadata ?? {};
      const updatedMetadata = {
        ...currentMetadata,
        holdReason: request.body.reason,
        heldAt: new Date(),
      };

      const result = await db.update(productionOrders)
        .set({
          status: 'on_hold',
          notes: request.body.reason ? `${existingProductionOrder[0]!.notes ?? ''} - ON HOLD: ${request.body.reason}`.trim() : existingProductionOrder[0]!.notes,
          metadata: updatedMetadata,
          updatedAt: new Date(),
        })
        .where(and(eq(productionOrders.id, request.params.id), eq(productionOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Production order put on hold successfully'));
    }
  );
}
