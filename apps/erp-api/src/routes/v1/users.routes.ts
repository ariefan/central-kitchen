import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '@/shared/utils/responses.js';
import { db } from '@/config/database.js';
import { users } from '@/config/schema.js';
import { eq } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth.js';
import { requirePermission } from '@/shared/middleware/rbac.js';

// Create schemas from the database schema (single source of truth)
const userInsertSchema = createInsertSchema(users).omit({
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
        description: 'Get all users in current tenant',
        tags: ['Users'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          isActive: z.coerce.boolean().optional(),
        }),
        response: {
          200: usersResponseSchema,
        },
      },
      onRequest: [requirePermission('user', 'read')],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const allUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));
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
      onRequest: [requirePermission('user', 'read')],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (!user.length || user[0]?.tenantId !== tenantId) {
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
      onRequest: [requirePermission('user', 'create')],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const body = request.body as z.infer<typeof userInsertSchema>;

      const newUser = {
        ...body,
        tenantId,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
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
      onRequest: [requirePermission('user', 'update')],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const body = request.body as Partial<z.infer<typeof userInsertSchema>>;

      const updateData = {
        ...body,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      };

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!result.length || result[0]?.tenantId !== tenantId) {
        return createNotFoundError('User not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'User updated successfully'));
    }
  );

  // DELETE /api/v1/users/:id - Delete/deactivate user
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete or deactivate user',
        tags: ['Users'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              email: z.string(),
              isActive: z.boolean(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
      onRequest: [requirePermission('user', 'delete')],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      // Check if user exists
      const existingUser = await db.select().from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existingUser.length || existingUser[0]?.tenantId !== tenantId) {
        return createNotFoundError('User not found', reply);
      }

      // Soft delete by deactivating
      const result = await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return reply.send(createSuccessResponse({
        id: result[0]!.id,
        email: result[0]!.email,
        isActive: result[0]!.isActive,
      }, 'User deactivated successfully'));
    }
  );
}
