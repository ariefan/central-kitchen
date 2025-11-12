import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { users } from '../../../../config/schema';
import { eq } from 'drizzle-orm';

// Create schemas from the database schema (single source of truth)
const userInsertSchema = createInsertSchema(users, {
  role: z.enum(['admin', 'manager', 'cashier', 'staff']),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

const userSelectSchema = createSelectSchema(users);

// Response schemas
const userResponseSchema = z.object({
  success: z.literal(true),
  data: userSelectSchema,
  message: z.string(),
});

const usersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(userSelectSchema),
  message: z.string(),
});

export function userRoutes(fastify: FastifyInstance) {
  // GET /api/v1/users - List all users
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all users',
        tags: ['Users'],
        querystring: z.object({
          role: z.enum(['admin', 'manager', 'cashier', 'staff']).optional(),
          locationId: z.string().uuid().optional(),
          isActive: z.coerce.boolean().optional(),
        }),
        response: {
          200: usersResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const allUsers = await db.select().from(users);
      return reply.send(createSuccessResponse(allUsers, 'Users retrieved successfully'));
    }
  );

  // GET /api/v1/users/:id - Get user by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get user by ID',
        tags: ['Users'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: userResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = await db.select().from(users).where(eq(users.id, request.params.id)).limit(1);

      if (!user.length) {
        return createNotFoundError('User not found', reply);
      }

      return reply.send(createSuccessResponse(user[0], 'User retrieved successfully'));
    }
  );

  // POST /api/v1/users - Create new user
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new user',
        tags: ['Users'],
        body: userInsertSchema,
        response: {
          201: userResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof userInsertSchema> }>, reply: FastifyReply) => {
      // TODO: Get tenantId from auth middleware
      const tenantId = '5a8d1d8f-8466-4fae-a779-f149cefa4c87'; // From database

      const newUser = {
        ...request.body,
        tenantId,
        metadata: request.body.metadata ? JSON.stringify(request.body.metadata) : undefined,
      };

      const result = await db.insert(users).values(newUser).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'User created successfully'));
    }
  );

  // PATCH /api/v1/users/:id - Update user
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update a user',
        tags: ['Users'],
        params: z.object({ id: z.string().uuid() }),
        body: userInsertSchema.partial(),
        response: {
          200: userResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: z.infer<typeof userInsertSchema>
    }>, reply: FastifyReply) => {
      const updateData = {
        ...request.body,
        metadata: request.body.metadata ? JSON.stringify(request.body.metadata) : undefined,
      };

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, request.params.id))
        .returning();

      if (!result.length) {
        return createNotFoundError('User not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'User updated successfully'));
    }
  );
}