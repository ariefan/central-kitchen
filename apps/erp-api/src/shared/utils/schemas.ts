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

// Helper for location types (import from schema)
export { locationTypes, productKinds, orderChannels, orderStatuses } from '@/config/schema';