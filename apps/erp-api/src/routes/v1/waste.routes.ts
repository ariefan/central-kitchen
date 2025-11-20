import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  wasteRecordSchema,
  wasteAnalysisSchema,
  wasteQuerySchema,
  wasteResponseSchema,
  wasteListResponseSchema,
} from '@/modules/waste/waste.schema.js';
import { wasteService } from '@/modules/waste/waste.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

export function wasteRoutes(fastify: FastifyInstance) {
  // GET /api/v1/waste/records - List waste records
  fastify.get(
    '/records',
    {
      schema: {
        description: 'Get all waste records with filtering',
        tags: ['Waste Management'],
        querystring: wasteQuerySchema,
        response: {
          200: wasteListResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof wasteQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const records = await wasteService.listRecords(request.query, context);
      return reply.send(createSuccessResponse(records, 'Waste records retrieved successfully'));
    }
  );

  // GET /api/v1/waste/records/:id - Get waste record by ID
  fastify.get(
    '/records/:id',
    {
      schema: {
        description: 'Get waste record by ID with items',
        tags: ['Waste Management'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const record = await wasteService.getRecord(request.params.id, context);
      if (!record) {
        return createNotFoundError('Waste record not found', reply);
      }

      return reply.send(createSuccessResponse(record, 'Waste record retrieved successfully'));
    }
  );

  // POST /api/v1/waste/records - Create new waste record
  fastify.post(
    '/records',
    {
      schema: {
        description: 'Create new waste record',
        tags: ['Waste Management'],
        body: wasteRecordSchema,
        response: {
          201: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof wasteRecordSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const result = await wasteService.createRecord(request.body, context);
        return reply.status(201).send(createSuccessResponse(result, 'Waste record created successfully'));
      } catch (error) {
        return createBadRequestError(error instanceof Error ? error.message : 'Failed to create waste record', reply);
      }
    }
  );

  // POST /api/v1/waste/records/:id/approve - Approve and post waste record
  fastify.post(
    '/records/:id/approve',
    {
      schema: {
        description: 'Approve and post waste record to update inventory',
        tags: ['Waste Management'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const result = await wasteService.approveRecord(request.params.id, context);
      if (!result) {
        return createNotFoundError('Waste record not found or cannot be approved', reply);
      }

      return reply.send(createSuccessResponse(result, 'Waste record approved and posted successfully'));
    }
  );

  // POST /api/v1/waste/analysis - Get waste analysis
  fastify.post(
    '/analysis',
    {
      schema: {
        description: 'Get comprehensive waste analysis',
        tags: ['Waste Management'],
        body: wasteAnalysisSchema,
        response: {
          200: wasteResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof wasteAnalysisSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const analysis = await wasteService.analyze(request.body, context);
      return reply.send(createSuccessResponse(analysis, 'Waste analysis retrieved successfully'));
    }
  );
}
