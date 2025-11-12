import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { handleValidationError, handleDatabaseError } from '../shared/utils/responses.js';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error(error);

  // Handle validation errors
  if (error instanceof ZodError || error.validation) {
    return handleValidationError(error, reply);
  }

  // Handle database errors
  if (error.code && typeof error.code === 'string' && error.code.startsWith('23')) {
    return handleDatabaseError(error, reply);
  }

  // Handle other known errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.name || 'Error',
      message: error.message || 'An error occurred',
    });
  }

  // Default error response
  return reply.status(500).send({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
      stack: error.stack
    }),
  });
};