import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { recipes, recipeItems, products, uoms } from '@/config/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth';

// Recipe Item schemas
const recipeItemSchema = z.object({
  productId: z.string().uuid(),
  qtyBase: z.number().positive(),
  notes: z.string().optional(),
});

const recipeItemCreateSchema = recipeItemSchema.extend({
  sortOrder: z.number().int().min(0).default(0),
});

// Recipe schemas
const recipeCreateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  finishedProductId: z.string().uuid(),
  yieldQtyBase: z.number().positive(),
  instructions: z.string().optional(),
  items: z.array(recipeItemCreateSchema).min(1, 'At least one ingredient is required'),
});

const recipeUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  finishedProductId: z.string().uuid().optional(),
  yieldQtyBase: z.number().positive().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

const recipeScaleSchema = z.object({
  scaleFactor: z.number().positive().optional(),
  targetYieldQty: z.number().positive().optional(),
}).refine(
  (data) => data.scaleFactor !== undefined || data.targetYieldQty !== undefined,
  {
    message: "Either scaleFactor or targetYieldQty must be provided",
    path: ["scaleFactor"],
  }
);

type RecipeQuery = {
  code?: string;
  finishedProductId?: string;
  isActive?: boolean;
  search?: string;
};

// Response schemas
const recipeResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const recipesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function recipeRoutes(fastify: FastifyInstance) {
  // GET /api/v1/recipes - List all recipes
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all recipes with ingredients',
        tags: ['Recipes'],
        querystring: z.object({
          code: z.string().optional(),
          finishedProductId: z.string().uuid().optional(),
          isActive: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
          search: z.string().optional(),
        }),
        response: {
          200: recipesResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { code, finishedProductId, isActive, search } = request.query as RecipeQuery;

      let whereConditions = [eq(recipes.tenantId, tenantId)];

      if (code) {
        whereConditions.push(eq(recipes.code, code));
      }

      if (finishedProductId) {
        whereConditions.push(eq(recipes.finishedProductId, finishedProductId));
      }

      if (typeof isActive === 'boolean') {
        whereConditions.push(eq(recipes.isActive, isActive));
      }

      if (search) {
        whereConditions.push(sql`(recipes.name ILIKE ${'%' + search + '%'} OR recipes.code ILIKE ${'%' + search + '%'})`);
      }

      const allRecipes = await db.select({
        recipe: recipes,
        finishedProduct: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
        .from(recipes)
        .leftJoin(products, eq(recipes.finishedProductId, products.id))
        .where(and(...whereConditions))
        .orderBy(desc(recipes.updatedAt));

      // Get ingredients for each recipe
      const recipesWithIngredients = await Promise.all(
        allRecipes.map(async (recipeRow) => {
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
            .where(eq(recipeItems.recipeId, recipeRow.recipe.id))
            .orderBy(recipeItems.sortOrder);

          return {
            ...recipeRow.recipe,
            finishedProduct: recipeRow.finishedProduct,
            ingredients,
          };
        })
      );

      return reply.send(createSuccessResponse(recipesWithIngredients, 'Recipes retrieved successfully'));
    }
  );

  // GET /api/v1/recipes/:id - Get recipe by ID with ingredients
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get recipe by ID with full ingredient list',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: recipeResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const recipeData = await db.select({
        recipe: recipes,
        finishedProduct: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
        .from(recipes)
        .leftJoin(products, eq(recipes.finishedProductId, products.id))
        .where(and(
          eq(recipes.id, request.params.id),
          eq(recipes.tenantId, tenantId)
        ))
        .limit(1);

      if (!recipeData.length) {
        return createNotFoundError('Recipe not found', reply);
      }

      const recipeRecord = recipeData[0]!;

      // Get detailed ingredients with UOM information
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
        .where(eq(recipeItems.recipeId, request.params.id))
        .orderBy(recipeItems.sortOrder);

      const recipeWithIngredients = {
        ...recipeRecord.recipe,
        finishedProduct: recipeRecord.finishedProduct,
        ingredients,
      };

      return reply.send(createSuccessResponse(recipeWithIngredients, 'Recipe retrieved successfully'));
    }
  );

  // GET /api/v1/recipes/:id/cost - Calculate recipe cost
  fastify.get(
    '/:id/cost',
    {
      schema: {
        description: 'Calculate total cost of recipe ingredients',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          scaleFactor: z.number().positive().optional().default(1),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              recipeId: z.string().uuid(),
              recipeName: z.string(),
              baseYieldQty: z.number(),
              scaleFactor: z.number(),
              totalCost: z.number(),
              costPerUnit: z.number(),
              ingredientCosts: z.array(z.object({
                productId: z.string().uuid(),
                productName: z.string(),
                quantity: z.number(),
                unitCost: z.number(),
                totalCost: z.number(),
              })),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Querystring: { scaleFactor?: number }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { scaleFactor = 1 } = request.query;

      const recipeData = await db.select()
        .from(recipes)
        .where(and(
          eq(recipes.id, request.params.id),
          eq(recipes.tenantId, tenantId)
        ))
        .limit(1);

      if (!recipeData.length) {
        return createNotFoundError('Recipe not found', reply);
      }

      const recipe = recipeData[0]!;

      // Get ingredients with current costs (simplified - using last purchase cost)
      const ingredients = await db.select({
        item: recipeItems,
        product: {
          id: products.id,
          name: products.name,
          baseUomId: products.baseUomId,
        },
      })
        .from(recipeItems)
        .leftJoin(products, eq(recipeItems.productId, products.id))
        .where(eq(recipeItems.recipeId, request.params.id))
        .orderBy(recipeItems.sortOrder);

      // For now, use placeholder costs - in real implementation would fetch from inventory/PO history
      const validIngredients = ingredients.filter((ingredient): ingredient is typeof ingredient & { product: NonNullable<typeof ingredient.product> } => ingredient.product !== null);

      if (validIngredients.length !== ingredients.length) {
        return createBadRequestError('One or more ingredients are missing product details', reply);
      }

      const ingredientCosts = validIngredients.map(ingredient => ({
        productId: ingredient.product.id,
        productName: ingredient.product.name,
        quantity: Number(ingredient.item.qtyBase) * scaleFactor,
        unitCost: 0, // TODO: Implement cost fetching from inventory/purchase history
        totalCost: 0, // TODO: Calculate based on unitCost * quantity
      }));

      const totalCost = ingredientCosts.reduce((sum, ing) => sum + ing.totalCost, 0);
      const scaledYieldQty = Number(recipe.yieldQtyBase) * scaleFactor;
      const costPerUnit = scaledYieldQty > 0 ? totalCost / scaledYieldQty : 0;

      return reply.send(createSuccessResponse({
        recipeId: recipe.id,
        recipeName: recipe.name,
        baseYieldQty: Number(recipe.yieldQtyBase),
        scaleFactor,
        totalCost,
        costPerUnit,
        ingredientCosts,
      }, 'Recipe cost calculated successfully'));
    }
  );

  // POST /api/v1/recipes - Create new recipe
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new recipe with ingredients',
        tags: ['Recipes'],
        body: recipeCreateSchema,
        response: {
          201: recipeResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof recipeCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify finished product exists and belongs to tenant
      const productCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.id, request.body.finishedProductId),
          eq(products.tenantId, tenantId)
        ))
        .limit(1);

      if (!productCheck.length) {
        return createNotFoundError('Finished product not found', reply);
      }

      // Verify all ingredient products exist and belong to tenant
      const ingredientIds = request.body.items.map(item => item.productId);
      const ingredientCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId)
        ));

      const foundIngredientIds = new Set(ingredientCheck.map(p => p.id));
      const missingIngredients = ingredientIds.filter(id => !foundIngredientIds.has(id));

      if (missingIngredients.length > 0) {
        return createBadRequestError('One or more ingredient products not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        // Check for existing recipe code and increment version if needed
        const existingRecipe = await tx.select()
          .from(recipes)
          .where(and(
            eq(recipes.code, request.body.code),
            eq(recipes.tenantId, tenantId)
          ))
          .orderBy(desc(recipes.version))
          .limit(1);

        const version = existingRecipe.length > 0 ? existingRecipe[0]!.version + 1 : 1;

        const recipeInsert: typeof recipes.$inferInsert = {
          tenantId,
          code: request.body.code,
          name: request.body.name,
          finishedProductId: request.body.finishedProductId,
          yieldQtyBase: request.body.yieldQtyBase.toString(),
          instructions: request.body.instructions ?? null,
          version,
        };

        const [recipe] = await tx.insert(recipes)
          .values(recipeInsert)
          .returning();

        // Insert recipe items
        const itemsToInsert: typeof recipeItems.$inferInsert[] = request.body.items.map((item, index) => ({
          recipeId: recipe!.id,
          productId: item.productId,
          qtyBase: item.qtyBase.toString(),
          sortOrder: item.sortOrder ?? index,
          notes: item.notes ?? null,
        }));

        const insertedItems = await tx.insert(recipeItems)
          .values(itemsToInsert)
          .returning();

        return {
          ...recipe!,
          items: insertedItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Recipe created successfully'));
    }
  );

  // PATCH /api/v1/recipes/:id - Update recipe
  fastify.post(
    '/:id/scale',
    {
      schema: {
        description: 'Scale recipe ingredients based on factor or target yield',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        body: recipeScaleSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              originalRecipe: z.any(),
              scaledRecipe: z.any(),
              scaleFactor: z.number(),
              originalYield: z.number(),
              scaledYield: z.number(),
              scaledIngredients: z.array(z.any()),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof recipeScaleSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { scaleFactor, targetYieldQty } = request.body;

      const recipeData = await db.select()
        .from(recipes)
        .where(and(
          eq(recipes.id, request.params.id),
          eq(recipes.tenantId, tenantId)
        ))
        .limit(1);

      if (!recipeData.length) {
        return createNotFoundError('Recipe not found', reply);
      }

      const recipe = recipeData[0]!;

      // Calculate scale factor
      let finalScaleFactor: number | undefined;
      if (targetYieldQty !== undefined && targetYieldQty > 0) {
        finalScaleFactor = targetYieldQty / Number(recipe.yieldQtyBase);
      } else if (scaleFactor !== undefined) {
        finalScaleFactor = scaleFactor;
      }

      if (finalScaleFactor === undefined || finalScaleFactor <= 0) {
        return createBadRequestError('Scale factor must be positive', reply);
      }

      // Get ingredients
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
        .where(eq(recipeItems.recipeId, request.params.id))
        .orderBy(recipeItems.sortOrder);

      const scaledIngredients = ingredients.map(ingredient => ({
        ...ingredient.item,
        qtyBase: Number(ingredient.item.qtyBase) * finalScaleFactor,
        product: ingredient.product,
        uom: ingredient.uom,
      }));

      const scaledYieldQty = Number(recipe.yieldQtyBase) * finalScaleFactor;

      return reply.send(createSuccessResponse({
        originalRecipe: recipe,
        scaledRecipe: {
          ...recipe,
          yieldQtyBase: scaledYieldQty,
        },
        scaleFactor: finalScaleFactor,
        originalYield: Number(recipe.yieldQtyBase),
        scaledYield: scaledYieldQty,
        scaledIngredients,
      }, 'Recipe scaled successfully'));
    }
  );

  // PATCH /api/v1/recipes/:id - Update recipe basic info
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update recipe basic information',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        body: recipeUpdateSchema,
        response: {
          200: recipeResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof recipeUpdateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if recipe exists and belongs to tenant
      const existingRecipe = await db.select()
        .from(recipes)
        .where(and(
          eq(recipes.id, request.params.id),
          eq(recipes.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingRecipe.length) {
        return createNotFoundError('Recipe not found', reply);
      }

      const updatePayload: Partial<typeof recipes.$inferInsert> & { updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (request.body.name !== undefined) {
        updatePayload.name = request.body.name;
      }

      if (request.body.finishedProductId !== undefined) {
        updatePayload.finishedProductId = request.body.finishedProductId;
      }

      if (request.body.yieldQtyBase !== undefined) {
        updatePayload.yieldQtyBase = request.body.yieldQtyBase.toString();
      }

      if (request.body.instructions !== undefined) {
        updatePayload.instructions = request.body.instructions ?? null;
      }

      if (request.body.isActive !== undefined) {
        updatePayload.isActive = request.body.isActive;
      }

      const result = await db.update(recipes)
        .set(updatePayload)
        .where(and(eq(recipes.id, request.params.id), eq(recipes.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Recipe updated successfully'));
    }
  );
}
