import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { successResponseSchema, createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '@/shared/utils/responses.js';
import { users, tenants, locations, userLocations, accounts } from '@/config/schema.js';
import { getCurrentUser, getCurrentTenant } from '@/shared/middleware/auth.js';
import { getUserPermissions } from '@/shared/middleware/rbac.js';
import { db } from '@/config/database.js';
import { eq, and, inArray } from 'drizzle-orm';
import {
  userLocationAssignSchema,
  userLocationSwitchSchema,
  userLocationsResponseSchema,
  userProfileUpdateSchema,
  userPasswordChangeSchema,
} from '@contracts/erp';

// Generate schemas from database tables with proper type handling
const userSchema = createSelectSchema(users, {
  // Override role to be more specific
  role: z.enum(['admin', 'manager', 'cashier', 'staff']).nullable(),
  // Handle Date fields properly - convert them to strings
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLogin: z.string().nullable(),
  // Override optional fields that might be undefined
  phone: z.string().nullable(),
  locationId: z.string().uuid().nullable(),
  authUserId: z.string().nullable(),
  tenantId: z.string().uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  isActive: z.boolean(),
  // Better Auth fields
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
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

  // ============================================================================
  // AUTH-002: Multi-Location Access Control
  // ============================================================================

  // GET /api/v1/users/:id/locations - Get user's accessible locations
  fastify.get(
    '/users/:id/locations',
    {
      schema: {
        description: 'Get user accessible locations',
        tags: ['Auth', 'Multi-Location'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: userLocationsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: userId } = request.params;

      // Verify user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return createNotFoundError('User not found', reply);
      }

      const userData = user[0];
      if (!userData) {
        return createNotFoundError('User not found', reply);
      }

      // Check if user is super user
      const userPerms = await getUserPermissions(request);
      const isSuperUser = userPerms.isSuperUser;

      let userLocationsList;

      if (isSuperUser) {
        // Super users can access ALL locations in their tenant
        userLocationsList = await db
          .select({
            id: locations.id,
            code: locations.code,
            name: locations.name,
            locationType: locations.type,
            isActive: locations.isActive,
          })
          .from(locations)
          .where(eq(locations.tenantId, userData.tenantId!))
          .orderBy(locations.name);
      } else {
        // Regular users get only their assigned locations
        userLocationsList = await db
          .select({
            id: locations.id,
            code: locations.code,
            name: locations.name,
            locationType: locations.type,
            isActive: locations.isActive,
          })
          .from(userLocations)
          .innerJoin(locations, eq(userLocations.locationId, locations.id))
          .where(eq(userLocations.userId, userId))
          .orderBy(locations.name);
      }

      return reply.send(
        createSuccessResponse(
          {
            userId,
            locations: userLocationsList,
          },
          'User locations retrieved successfully'
        )
      );
    }
  );

  // POST /api/v1/users/:id/locations - Assign locations to user
  fastify.post(
    '/users/:id/locations',
    {
      schema: {
        description: 'Assign locations to user',
        tags: ['Auth', 'Multi-Location'],
        params: z.object({ id: z.string().uuid() }),
        body: userLocationAssignSchema.omit({ userId: true }),
        response: {
          200: userLocationsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<z.infer<typeof userLocationAssignSchema>, 'userId'>;
      }>,
      reply: FastifyReply
    ) => {
      const { id: userId } = request.params;
      const { locationIds, replaceExisting } = request.body;
      const currentUser = getCurrentUser(request);

      // Verify user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return createNotFoundError('User not found', reply);
      }

      // Verify all locations exist
      const locationsList = await db
        .select({ id: locations.id })
        .from(locations)
        .where(inArray(locations.id, locationIds));

      if (locationsList.length !== locationIds.length) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid locations',
          message: 'One or more location IDs are invalid',
        });
      }

      // If replacing existing, delete all current assignments
      if (replaceExisting) {
        await db.delete(userLocations).where(eq(userLocations.userId, userId));
      }

      // Insert new location assignments (ignore duplicates)
      const insertData = locationIds.map((locationId: string) => ({
        userId,
        locationId,
        createdBy: currentUser.id,
      }));

      // Insert with ON CONFLICT DO NOTHING to handle duplicates
      for (const assignment of insertData) {
        await db
          .insert(userLocations)
          .values(assignment)
          .onConflictDoNothing();
      }

      // Return updated location list
      const updatedLocations = await db
        .select({
          id: locations.id,
          code: locations.code,
          name: locations.name,
          locationType: locations.type,
          isActive: locations.isActive,
        })
        .from(userLocations)
        .innerJoin(locations, eq(userLocations.locationId, locations.id))
        .where(eq(userLocations.userId, userId));

      return reply.send(
        createSuccessResponse(
          {
            userId,
            locations: updatedLocations,
          },
          `Locations ${replaceExisting ? 'replaced' : 'assigned'} successfully`
        )
      );
    }
  );

  // POST /api/v1/auth/switch-tenant - Switch active tenant (super users only)
  fastify.post(
    '/switch-tenant',
    {
      schema: {
        description: 'Switch user active tenant (super users only)',
        tags: ['Auth', 'Multi-Tenant'],
        body: z.object({ tenantId: z.string().uuid() }),
        response: {
          200: meResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { tenantId: string } }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.body;
      const currentUser = getCurrentUser(request);

      // Verify tenant exists
      const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant.length) {
        return createNotFoundError('Tenant not found', reply);
      }

      const tenantData = tenant[0];
      if (!tenantData) {
        throw new Error('Tenant data not found');
      }

      // Update user's active tenant
      const updatedUser = await db
        .update(users)
        .set({
          tenantId,
          locationId: null, // Clear location when switching tenants
        })
        .where(eq(users.id, currentUser.id))
        .returning();

      if (!updatedUser.length) {
        return createNotFoundError('User not found', reply);
      }

      const userWithTenant = updatedUser[0];
      if (!userWithTenant) {
        throw new Error('Failed to update user tenant');
      }

      // Return updated user info
      const responseData = {
        ...userWithTenant,
        createdAt: userWithTenant.createdAt.toISOString(),
        updatedAt: userWithTenant.updatedAt.toISOString(),
        lastLogin: userWithTenant.lastLogin?.toISOString() ?? null,
        tenant: {
          ...tenantData,
          createdAt: tenantData.createdAt.toISOString(),
          updatedAt: tenantData.updatedAt.toISOString(),
        },
        location: null, // Cleared when switching tenants
      };

      return reply.send(createSuccessResponse(responseData, 'Tenant switched successfully'));
    }
  );

  // POST /api/v1/auth/switch-location - Switch active location
  fastify.post(
    '/switch-location',
    {
      schema: {
        description: 'Switch user active location',
        tags: ['Auth', 'Multi-Location'],
        body: userLocationSwitchSchema,
        response: {
          200: meResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof userLocationSwitchSchema> }>,
      reply: FastifyReply
    ) => {
      const body = userLocationSwitchSchema.parse(request.body);
      const { locationId } = body;
      const currentUser = getCurrentUser(request);

      // Verify location exists
      const location = await db.select().from(locations).where(eq(locations.id, locationId)).limit(1);
      if (!location.length) {
        return createNotFoundError('Location not found', reply);
      }

      const locationData = location[0];

      // Verify user has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(
          and(
            eq(userLocations.userId, currentUser.id),
            eq(userLocations.locationId, locationId)
          )
        )
        .limit(1);

      if (!hasAccess.length) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied',
          message: 'User does not have access to this location',
        });
      }

      // Update user's active location
      const updatedUser = await db
        .update(users)
        .set({ locationId })
        .where(eq(users.id, currentUser.id))
        .returning();

      if (!updatedUser.length) {
        return createNotFoundError('User not found', reply);
      }

      const userWithLocation = updatedUser[0];
      if (!userWithLocation) {
        throw new Error('Failed to update user location');
      }

      // Get tenant data
      const tenant = getCurrentTenant(request);

      // Return updated user info
      const responseData = {
        ...userWithLocation,
        createdAt: userWithLocation.createdAt.toISOString(),
        updatedAt: userWithLocation.updatedAt.toISOString(),
        lastLogin: userWithLocation.lastLogin?.toISOString() ?? null,
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString(),
        },
        location: locationData
          ? {
              ...locationData,
              createdAt: locationData.createdAt.toISOString(),
              updatedAt: locationData.updatedAt.toISOString(),
            }
          : null,
      };

      return reply.send(createSuccessResponse(responseData, 'Location switched successfully'));
    }
  );

  // ============================================================================
  // AUTH-003: User Profile Management
  // ============================================================================

  // PATCH /api/v1/auth/me - Update user profile
  fastify.patch(
    '/me',
    {
      schema: {
        description: 'Update current user profile',
        tags: ['Auth', 'Profile'],
        body: userProfileUpdateSchema,
        response: {
          200: meResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof userProfileUpdateSchema> }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const updateData = request.body;

      // Prepare update object
      const updates: any = {};

      if (updateData.name !== undefined) {
        // Split name into firstName and lastName
        const nameParts = updateData.name.trim().split(' ');
        updates.firstName = nameParts[0];
        updates.lastName = nameParts.slice(1).join(' ') || null;
      }

      if (updateData.phone !== undefined) {
        updates.phone = updateData.phone;
      }

      if (updateData.photoUrl !== undefined) {
        updates.image = updateData.photoUrl;
      }

      // Note: notificationPreferences would be stored in metadata JSONB field
      if (updateData.notificationPreferences !== undefined) {
        updates.metadata = updateData.notificationPreferences;
      }

      // Update user in database
      const updatedUsers = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, currentUser.id))
        .returning();

      if (!updatedUsers.length) {
        return createNotFoundError('User not found', reply);
      }

      const updatedUser = updatedUsers[0];
      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }

      const tenant = getCurrentTenant(request);

      // Get user's current location
      const location = request.location ?? null;

      // Return updated user info
      const responseData = {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
        lastLogin: updatedUser.lastLogin?.toISOString() ?? null,
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString(),
        },
        location: location
          ? {
              ...location,
              createdAt: location.createdAt.toISOString(),
              updatedAt: location.updatedAt.toISOString(),
            }
          : null,
      };

      return reply.send(createSuccessResponse(responseData, 'Profile updated successfully'));
    }
  );

  // POST /api/v1/auth/me/photo - Upload profile photo
  fastify.post(
    '/me/photo',
    {
      schema: {
        description: 'Upload profile photo',
        tags: ['Auth', 'Profile'],
        body: z.object({
          photoUrl: z.string().url(),
        }),
        response: {
          200: meResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { photoUrl: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { photoUrl } = request.body;

      // Update user photo
      const updatedUsers = await db
        .update(users)
        .set({ image: photoUrl })
        .where(eq(users.id, currentUser.id))
        .returning();

      if (!updatedUsers.length) {
        return createNotFoundError('User not found', reply);
      }

      const updatedUser = updatedUsers[0];
      if (!updatedUser) {
        throw new Error('Failed to update user photo');
      }

      const tenant = getCurrentTenant(request);
      const location = request.location ?? null;

      // Return updated user info
      const responseData = {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
        lastLogin: updatedUser.lastLogin?.toISOString() ?? null,
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString(),
        },
        location: location
          ? {
              ...location,
              createdAt: location.createdAt.toISOString(),
              updatedAt: location.updatedAt.toISOString(),
            }
          : null,
      };

      return reply.send(createSuccessResponse(responseData, 'Photo uploaded successfully'));
    }
  );

  // POST /api/v1/auth/me/change-password - Change password
  fastify.post(
    '/me/change-password',
    {
      schema: {
        description: 'Change user password',
        tags: ['Auth', 'Profile'],
        body: userPasswordChangeSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
          400: z.object({
            success: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof userPasswordChangeSchema> }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { currentPassword, newPassword } = request.body;

      // Get user's Better Auth account
      const userAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, currentUser.id))
        .limit(1);

      if (!userAccount.length) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid credentials',
          message: 'User account not found or password not set',
        });
      }

      const account = userAccount[0];
      if (!account || !account.password) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid credentials',
          message: 'User account not found or password not set',
        });
      }

      // Verify current password
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, account.password);

      if (!isValidPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid credentials',
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in accounts table
      await db
        .update(accounts)
        .set({ password: hashedPassword })
        .where(eq(accounts.userId, currentUser.id));

      return reply.send({
        success: true,
        message: 'Password changed successfully',
      });
    }
  );
}
