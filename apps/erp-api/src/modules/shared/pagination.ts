import { z } from 'zod';
import {
  createPaginatedResponse as baseCreatePaginatedResponse,
} from '../../shared/utils/responses.js';
import {
  buildQueryConditions,
  type QueryBuilderResult,
} from '../../shared/utils/query-builder.js';

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function normalizePaginationParams(params: PaginationParams = {}) {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(params.offset ?? 0, 0);
  return { limit, offset };
}

export const createPaginatedResponse = baseCreatePaginatedResponse;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    message: z.string(),
  });

export { buildQueryConditions };
export type { QueryBuilderResult };
