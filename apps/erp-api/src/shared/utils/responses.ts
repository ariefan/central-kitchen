import type { FastifyError, FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';

import type { ApiResponse, ErrorResponse } from '../types';

// Success response schema
export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string(),
  });

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

// Specific error response schemas for reuse
export const notFoundResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Not Found'),
  message: z.string(),
});

export const badRequestResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Bad Request'),
  message: z.string(),
});

export const conflictResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Conflict'),
  message: z.string(),
});

export const unauthorizedResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Unauthorized'),
  message: z.string(),
});

export const forbiddenResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Forbidden'),
  message: z.string(),
});

// Generic HTTP error response schemas
export const validationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Validation Error'),
  message: z.string(),
  details: z.array(z.object({
    path: z.array(z.string()),
    message: z.string(),
    code: z.string(),
  })).optional(),
});

// Response creators
export const createSuccessResponse = <T>(
  data: T,
  message: string = 'Operation successful'
): ApiResponse<T> => ({
    success: true,
    data,
    message
  });

// Special response creator for delete operations
export const createDeleteResponse = (message: string = 'Resource deleted successfully'): ApiResponse<null> => ({
  success: true,
  data: null,
  message
});

// Schema for delete responses
export const deleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.null(),
  message: z.string(),
});

export const createErrorResponse = (
  error: string,
  message: string,
  details?: unknown
): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    error,
    message,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return response;
};

// Specific error creators
export const createNotFoundError = (message: string, reply: FastifyReply) =>
  reply.status(404).send(createErrorResponse('Not Found', message));

export const createBadRequestError = (message: string, reply: FastifyReply) =>
  reply.status(400).send(createErrorResponse('Bad Request', message));

export const createConflictError = (message: string, reply: FastifyReply) =>
  reply.status(409).send(createErrorResponse('Conflict', message));

export const createUnauthorizedError = (message: string, reply: FastifyReply) =>
  reply.status(401).send(createErrorResponse('Unauthorized', message));

export const createForbiddenError = (message: string, reply: FastifyReply) =>
  reply.status(403).send(createErrorResponse('Forbidden', message));

type DatabaseError = FastifyError & { code?: string };
type FastifyValidationError = FastifyError & {
  validation?: unknown;
  details?: unknown;
};
type ValidationError = ZodError | FastifyValidationError;

// Database error handler
export const handleDatabaseError = (error: DatabaseError, reply: FastifyReply): FastifyReply => {
  console.error('Database error:', error);

  // PostgreSQL error codes
  const code = typeof error.code === 'string' ? error.code : undefined;

  switch (code) {
    case '23505': // unique_violation
      return createConflictError('Resource already exists', reply);
    case '23503': // foreign_key_violation
      return createBadRequestError('Referenced resource does not exist', reply);
    case '23502': // not_null_violation
      return createBadRequestError('Required field is missing', reply);
    case '23514': // check_violation
      return createBadRequestError('Data validation failed', reply);
    case '42883': // undefined_function
      return createBadRequestError('Invalid operation', reply);
    case '42703': // undefined_column
      return createBadRequestError('Invalid field', reply);
    case '42P01': // undefined_table
      return createBadRequestError('Invalid resource', reply);
    case '08006': // connection_failure
    case '08001': // sqlclient_unable_to_establish_sqlconnection
    case '08004': // sqlserver_rejected_establishment_of_sqlconnection
      return reply.status(503).send(
        createErrorResponse('Database Connection Error', 'Unable to connect to database')
      );
    case '53000': // insufficient_resources
    case '53100': // disk_full
    case '53200': // out_of_memory
    case '53300': // too_many_connections
      return reply.status(503).send(
        createErrorResponse('Database Resource Error', 'Database resources exhausted')
      );
    default:
      return reply.status(500).send(
        createErrorResponse(
          'Internal Server Error',
          'An unexpected error occurred',
          process.env.NODE_ENV === 'development' ? error : undefined
        )
      );
  }
};

// Validation error handler
export const handleValidationError = (error: ValidationError, reply: FastifyReply): FastifyReply => {
  const details =
    error instanceof ZodError
      ? error.issues
      : error.validation ?? error.details;

  return reply.status(400).send(
    createErrorResponse(
      'Validation Error',
      'Invalid request data',
      details
    )
  );
};
