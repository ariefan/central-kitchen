import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { successResponseSchema, createSuccessResponse } from '../../../../shared/utils/responses.js';
import { users, tenants, locations } from '../../../../config/schema.js';
import { getCurrentUser, getCurrentTenant } from '../../../../shared/middleware/auth.js';

// Generate schemas from database tables with proper type handling
const userSchema = createSelectSchema(users, {
  // Override role to be more specific
  role: z.enum(['admin', 'manager', 'cashier', 'staff']),
  // Handle Date fields properly - convert them to strings
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLogin: z.string().nullable(),
  // Override optional fields that might be undefined
  phone: z.string().nullable(),
  locationId: z.string().uuid().nullable(),
  authUserId: z.string(),
  tenantId: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
}).omit({
  metadata: true,
});

const tenantSchema = createSelectSchema(tenants, {
  // Handle Date fields
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.any().nullable(),
  orgId: z.string(),
  isActive: z.boolean(),
}).pick({
  id: true,
  name: true,
  slug: true,
  orgId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

const locationSchema = createSelectSchema(locations, {
  // Handle Date fields
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.any().nullable(),
}).pick({
  id: true,
  name: true,
  type: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}).nullable();

const meResponseSchema = successResponseSchema(
  userSchema.extend({
    tenant: tenantSchema,
    location: locationSchema,
  })
);

export function authRoutes(fastify: FastifyInstance) {
  // GET /api/v1/auth/me - Current user info
  fastify.get(
    '/me',
    {
      schema: {
        description: 'Get current user information',
        tags: ['Auth'],
        response: {
          200: meResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getCurrentUser(request);
      const tenant = getCurrentTenant(request);

      // Get location data from request if available
      const location = request.location ?? null;

      // Convert Date objects to strings for JSON serialization
      const responseData = {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(), // Fixed typo: updated -> updatedAt
        lastLogin: user.lastLogin?.toISOString() ?? null,
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString(),
        },
        location: location ? {
          ...location,
          createdAt: location.createdAt.toISOString(),
          updatedAt: location.updatedAt.toISOString(),
        } : null,
      };

      return reply.send(createSuccessResponse(responseData, 'User information retrieved successfully'));
    }
  );
}
