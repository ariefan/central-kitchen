import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  requisitionCreateSchema,
  requisitionUpdateSchema,
  requisitionQuerySchema,
  requisitionRejectSchema,
  requisitionResponseSchema,
  requisitionsResponseSchema,
} from '@/modules/requisitions/requisition.schema.js';
import { requisitionService, RequisitionServiceError } from '@/modules/requisitions/requisition.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

type RequisitionCreateBody = z.infer<typeof requisitionCreateSchema>;
type RequisitionUpdateBody = z.infer<typeof requisitionUpdateSchema>;
type RequisitionRejectBody = z.infer<typeof requisitionRejectSchema>;
type RequisitionQuery = z.infer<typeof requisitionQuerySchema>;

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof RequisitionServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function requisitionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all requisitions',
        tags: ['Requisitions'],
        querystring: requisitionQuerySchema,
        response: {
          200: requisitionsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: RequisitionQuery }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const items = await requisitionService.list(request.query, context);
      return reply.send(createSuccessResponse(items, 'Requisitions retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get requisition by ID with items',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const requisition = await requisitionService.getById(request.params.id, context);
      if (!requisition) {
        return createNotFoundError('Requisition not found', reply);
      }

      return reply.send(createSuccessResponse(requisition, 'Requisition retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new requisition',
        tags: ['Requisitions'],
        body: requisitionCreateSchema,
        response: {
          201: requisitionResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: RequisitionCreateBody }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const requisition = await requisitionService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(requisition, 'Requisition created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update requisition (draft only)',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        body: requisitionUpdateSchema,
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: RequisitionUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const requisition = await requisitionService.update(request.params.id, request.body, context);
        if (!requisition) {
          return createNotFoundError('Requisition not found or cannot be edited', reply);
        }

        return reply.send(createSuccessResponse(requisition, 'Requisition updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve requisition',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const requisition = await requisitionService.approve(request.params.id, context);
        if (!requisition) {
          return createNotFoundError('Requisition not found or already processed', reply);
        }

        return reply.send(createSuccessResponse(requisition, 'Requisition approved successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject requisition',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        body: requisitionRejectSchema,
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: RequisitionRejectBody }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const requisition = await requisitionService.reject(request.params.id, request.body, context);
        if (!requisition) {
          return createNotFoundError('Requisition not found or already processed', reply);
        }

        return reply.send(createSuccessResponse(requisition, 'Requisition rejected successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
