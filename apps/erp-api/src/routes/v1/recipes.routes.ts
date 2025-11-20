import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  recipeQuerySchema,
  recipeCreateSchema,
  recipeUpdateSchema,
  recipeScaleSchema,
  recipeResponseSchema,
  recipesResponseSchema,
  recipeCostResponseSchema,
  recipeScaleResponseSchema,
} from '@/modules/recipes/recipe.schema.js';
import { recipeService, RecipeServiceError } from '@/modules/recipes/recipe.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof RecipeServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function recipeRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all recipes with ingredients',
        tags: ['Recipes'],
        querystring: recipeQuerySchema.extend({
          isActive: z.enum(['true', 'false']).optional(),
        }),
        response: {
          200: recipesResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof recipeQuerySchema> & { isActive?: 'true' | 'false' } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const recipes = await recipeService.list(request.query, context);
      return reply.send(createSuccessResponse(recipes, 'Recipes retrieved successfully'));
    }
  );

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
      const context = buildRequestContext(request);
      const recipe = await recipeService.getById(request.params.id, context);
      if (!recipe) {
        return createNotFoundError('Recipe not found', reply);
      }

      return reply.send(createSuccessResponse(recipe, 'Recipe retrieved successfully'));
    }
  );

  fastify.get(
    '/:id/cost',
    {
      schema: {
        description: 'Calculate total cost of recipe ingredients',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({ scaleFactor: z.number().positive().optional() }),
        response: {
          200: recipeCostResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Querystring: { scaleFactor?: number } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const cost = await recipeService.calculateCost(request.params.id, request.query.scaleFactor, context);
      if (!cost) {
        return createNotFoundError('Recipe not found', reply);
      }

      return reply.send(createSuccessResponse(cost, 'Recipe cost calculated successfully'));
    }
  );

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
      const context = buildRequestContext(request);
      try {
        const recipe = await recipeService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(recipe, 'Recipe created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/scale',
    {
      schema: {
        description: 'Scale recipe ingredients based on factor or target yield',
        tags: ['Recipes'],
        params: z.object({ id: z.string().uuid() }),
        body: recipeScaleSchema,
        response: {
          200: recipeScaleResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof recipeScaleSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const result = await recipeService.scaleRecipe(request.params.id, request.body, context);
        if (!result) {
          return createNotFoundError('Recipe not found', reply);
        }

        return reply.send(createSuccessResponse(result, 'Recipe scaled successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

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
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof recipeUpdateSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const recipe = await recipeService.update(request.params.id, request.body, context);
        if (!recipe) {
          return createNotFoundError('Recipe not found', reply);
        }

        return reply.send(createSuccessResponse(recipe, 'Recipe updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
