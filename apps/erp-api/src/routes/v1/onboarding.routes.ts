/**
 * Onboarding API Routes
 *
 * Handles user onboarding flows like joining a tenant.
 * These routes use session-only authentication (no tenant required).
 *
 * @module routes/v1/onboarding
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
// z is used for params schema

import { db } from '@/config/database.js';
import { tenants, users } from '@/config/schema.js';
import { getSessionUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';
import {
  joinTenantSchema,
  tenantLookupResponseSchema,
  joinTenantResponseSchema,
  type JoinTenantInput,
} from '@contracts/erp';

/**
 * Register onboarding routes
 *
 * API Endpoints:
 * - GET /api/v1/onboarding/tenant/:slug - Lookup tenant by slug
 * - POST /api/v1/onboarding/join-tenant - Join a tenant by slug
 */
export function onboardingRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // LOOKUP TENANT BY SLUG
  // ============================================================================

  fastify.get(
    '/tenant/:slug',
    {
      schema: {
        description: 'Lookup tenant by slug (for users without tenant)',
        tags: ['Onboarding'],
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: tenantLookupResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { slug: string } }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      const [tenant] = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          isActive: tenants.isActive,
        })
        .from(tenants)
        .where(eq(tenants.slug, slug.toLowerCase()))
        .limit(1);

      if (!tenant) {
        return createNotFoundError('Tenant not found', reply);
      }

      if (!tenant.isActive) {
        return createBadRequestError('Tenant is not active', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          },
          'Tenant found'
        )
      );
    }
  );

  // ============================================================================
  // JOIN TENANT
  // ============================================================================

  fastify.post(
    '/join-tenant',
    {
      schema: {
        description: 'Join a tenant by slug',
        tags: ['Onboarding'],
        body: joinTenantSchema,
        response: {
          200: joinTenantResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: JoinTenantInput }>,
      reply: FastifyReply
    ) => {
      const currentUser = getSessionUser(request);
      const { slug } = request.body;

      // Check if user already has a tenant
      if (currentUser.tenantId) {
        return createBadRequestError('User already has a tenant assigned', reply);
      }

      // Find tenant by slug
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug.toLowerCase()))
        .limit(1);

      if (!tenant) {
        return createNotFoundError('Tenant not found', reply);
      }

      if (!tenant.isActive) {
        return createBadRequestError('Tenant is not active', reply);
      }

      // Update user's tenant
      const [updatedUser] = await db
        .update(users)
        .set({
          tenantId: tenant.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentUser.id))
        .returning();

      if (!updatedUser) {
        throw new Error('Failed to update user tenant');
      }

      return reply.send(
        createSuccessResponse(
          {
            user: {
              id: updatedUser.id,
              email: updatedUser.email,
              tenantId: tenant.id,
            },
            tenant: {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
            },
          },
          'Successfully joined tenant'
        )
      );
    }
  );
}
