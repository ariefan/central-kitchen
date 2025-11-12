import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/responses';

export function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/categories - List all categories
  fastify.get('/', {
    schema: {
      description: 'List all categories',
      tags: ['Categories']
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Return static product categories since taxCategories table schema doesn't match
      // the product categories expected by the frontend
      const staticCategories = [
        { id: 'raw-materials', code: 'RAW', name: 'Raw Materials' },
        { id: 'semi-finished', code: 'SEMI', name: 'Semi-Finished Goods' },
        { id: 'finished-goods', code: 'FINISHED', name: 'Finished Goods' },
        { id: 'packaging', code: 'PACK', name: 'Packaging Materials' },
        { id: 'consumables', code: 'CONS', name: 'Consumables' },
      ];

      return reply.send(createSuccessResponse(staticCategories, 'Categories retrieved successfully'));
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching categories:');
      return reply.status(500).send(createErrorResponse('Internal Server Error', 'Failed to fetch categories'));
    }
  });
}