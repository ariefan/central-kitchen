import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import {
  transferCreateSchema,
  transferUpdateSchema,
  transferReceiveSchema,
  transferQuerySchema,
  transferResponseSchema,
  transfersResponseSchema,
} from '@/modules/transfers/transfer.schema.js';
import { transferService, TransferServiceError } from '@/modules/transfers/transfer.service.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';

type TransferCreateBody = z.infer<typeof transferCreateSchema>;
type TransferUpdateBody = z.infer<typeof transferUpdateSchema>;
type TransferReceiveBody = z.infer<typeof transferReceiveSchema>;
type TransferListQuery = z.infer<typeof transferQuerySchema>;

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof TransferServiceError) {
    if (error.kind === 'not_found') {
      return createNotFoundError(error.message, reply);
    }
    return createBadRequestError(error.message, reply);
  }

  throw error;
};

export function transferRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all transfers',
        tags: ['Transfers'],
        querystring: transferQuerySchema,
        response: {
          200: transfersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: TransferListQuery }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const transfers = await transferService.list(request.query, context);
      return reply.send(createSuccessResponse(transfers, 'Transfers retrieved successfully'));
    }
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get transfer by ID with items',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const transfer = await transferService.getById(request.params.id, context);
      if (!transfer) {
        return createNotFoundError('Transfer not found', reply);
      }

      return reply.send(createSuccessResponse(transfer, 'Transfer retrieved successfully'));
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new transfer',
        tags: ['Transfers'],
        body: transferCreateSchema,
        response: {
          201: transferResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: TransferCreateBody }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const transfer = await transferService.create(request.body, context);
        return reply.status(201).send(createSuccessResponse(transfer, 'Transfer created successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update transfer (draft only)',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        body: transferUpdateSchema,
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: TransferUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const transfer = await transferService.update(request.params.id, request.body, context);
        if (!transfer) {
          return createNotFoundError('Transfer not found', reply);
        }

        return reply.send(createSuccessResponse(transfer, 'Transfer updated successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/send',
    {
      schema: {
        description: 'Send transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const transfer = await transferService.send(request.params.id, context);
        if (!transfer) {
          return createNotFoundError('Transfer not found', reply);
        }

        return reply.send(createSuccessResponse(transfer, 'Transfer sent successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/receive',
    {
      schema: {
        description: 'Receive transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        body: transferReceiveSchema,
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: TransferReceiveBody }>,
      reply: FastifyReply,
    ) => {
      const context = buildRequestContext(request);
      try {
        const transfer = await transferService.receive(request.params.id, request.body, context);
        if (!transfer) {
          return createNotFoundError('Transfer not found or not ready for receiving', reply);
        }

        return reply.send(createSuccessResponse(transfer, 'Transfer received successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post/finalize transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      try {
        const transfer = await transferService.post(request.params.id, context);
        if (!transfer) {
          return createNotFoundError('Transfer not found or not completed', reply);
        }

        return reply.send(createSuccessResponse(transfer, 'Transfer posted successfully'));
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
