import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Simple success response schema
export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string(),
  });

// Utility to generate standardized CRUD schemas
export function createEntitySchemas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  options?: {
    insertOverrides?: Record<string, z.ZodTypeAny>;
    selectOverrides?: Record<string, z.ZodTypeAny>;
    omitOnInsert?: string[];
  }
) {
  // Handle the complex drizzle-zod type issues by using any for now
  // TODO: Fix drizzle-zod type compatibility in a future update
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const insertSchema = createInsertSchema(table, options?.insertOverrides) as any;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const selectSchema = createSelectSchema(table, options?.selectOverrides) as any;

  // Apply omit if needed
  if (options?.omitOnInsert) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    const omitFields = options.omitOnInsert.reduce((acc: any, field) => ({ ...acc, [field]: true }), {});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const finalInsertSchema = insertSchema.omit(omitFields);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      insert: finalInsertSchema,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      update: finalInsertSchema.partial(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      select: selectSchema,
      response: successResponseSchema(selectSchema),
      listResponse: successResponseSchema(z.array(selectSchema)),
    };
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    insert: insertSchema,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    update: insertSchema.partial(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    select: selectSchema,
    response: successResponseSchema(selectSchema),
    listResponse: successResponseSchema(z.array(selectSchema)),
  };
}

// Standard query parameter schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = z.string().min(1).max(100).optional();

// Base query schema combining pagination, sort, and search
export const baseQuerySchema = paginationSchema.merge(sortSchema).extend({
  search: searchSchema,
});

// Factory for paginated response schemas
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return successResponseSchema(
    z.object({
      items: z.array(itemSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    })
  );
}

// Helper for location types (import from schema)
export { locationTypes, productKinds, orderChannels, orderStatuses } from '../../config/schema.js';