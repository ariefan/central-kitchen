/**
 * Tenant Management API Routes
 *
 * Manages tenants (organizations) in the multi-tenant ERP system.
 * Only accessible by super-admin users.
 *
 * @module routes/v1/tenants
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/config/database.js";
import { tenants, users, locations } from "@/config/schema.js";
import {
  tenantCreateSchema,
  tenantUpdateSchema,
  tenantQuerySchema,
  tenantResponseSchema,
  tenantsResponseSchema,
  type TenantCreate,
  type TenantUpdate,
  type TenantQuery,
} from "@contracts/erp";
import { getCurrentUser } from "@/shared/middleware/auth.js";
import {
  requirePermission,
  requireSuperUser,
} from "@/shared/middleware/rbac.js";
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from "@/shared/utils/responses.js";

/**
 * Register tenant routes
 *
 * API Endpoints:
 * - POST /api/v1/tenants - Create tenant
 * - GET /api/v1/tenants - List tenants
 * - GET /api/v1/tenants/:id - Get tenant details
 * - PATCH /api/v1/tenants/:id - Update tenant
 * - DELETE /api/v1/tenants/:id - Deactivate tenant
 */
export function tenantRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE TENANT
  // ============================================================================

  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new tenant (super user only)",
        tags: ["Tenants", "Admin"],
        body: tenantCreateSchema,
        response: {
          201: tenantResponseSchema,
        },
      },
      preHandler: [requireSuperUser()],
    },
    async (request, reply) => {
      const currentUser = getCurrentUser(request);
      const createData = request.body as TenantCreate;

      // Check if slug already exists
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, createData.slug))
        .limit(1);

      if (existingTenant.length > 0) {
        return createBadRequestError("Tenant slug already exists", reply);
      }

      // Create tenant
      const newTenants = await db
        .insert(tenants)
        .values({
          orgId: createData.orgId,
          name: createData.name,
          slug: createData.slug,
          isActive: createData.isActive ?? true,
          metadata: createData.metadata || null,
        })
        .returning();

      const tenant = newTenants[0];
      if (!tenant) {
        throw new Error("Failed to create tenant");
      }

      const responseData = {
        id: tenant.id,
        orgId: tenant.orgId,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        metadata: tenant.metadata as Record<string, any> | null,
        totalUsers: 0,
        totalLocations: 0,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      };

      return reply
        .status(201)
        .send(
          createSuccessResponse(responseData, "Tenant created successfully")
        );
    }
  );

  // ============================================================================
  // GET TENANTS LIST
  // ============================================================================

  fastify.get(
    "/",
    {
      schema: {
        description: "Get paginated list of tenants (super user only)",
        tags: ["Tenants", "Admin"],
        querystring: tenantQuerySchema,
        response: {
          200: tenantsResponseSchema,
        },
      },
      preHandler: [requireSuperUser()],
    },
    async (request, reply) => {
      const currentUser = getCurrentUser(request);
      const query = request.query as TenantQuery;

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Build where conditions
      const conditions: any[] = [];

      if (query.name) {
        conditions.push(ilike(tenants.name, `%${query.name}%`));
      }

      if (query.slug) {
        conditions.push(ilike(tenants.slug, `%${query.slug}%`));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(tenants.isActive, query.isActive));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenants)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const count = countResult[0]?.count || 0;

      // Get tenants with user and location counts
      const tenantsList = await db
        .select()
        .from(tenants)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tenants.createdAt))
        .limit(limit)
        .offset(offset);

      // Get user and location counts for each tenant
      const items = await Promise.all(
        tenantsList.map(async (tenant) => {
          const [userCount, locationCount] = await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(users)
              .where(eq(users.tenantId, tenant.id)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(locations)
              .where(eq(locations.tenantId, tenant.id)),
          ]);

          return {
            id: tenant.id,
            orgId: tenant.orgId,
            name: tenant.name,
            slug: tenant.slug,
            isActive: tenant.isActive,
            metadata: tenant.metadata as Record<string, any> | null,
            totalUsers: userCount[0]?.count || 0,
            totalLocations: locationCount[0]?.count || 0,
            createdAt: tenant.createdAt.toISOString(),
            updatedAt: tenant.updatedAt.toISOString(),
          };
        })
      );

      return reply.send(
        createSuccessResponse({
          items,
          pagination: {
            total: count,
            limit,
            offset,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(count / limit),
            hasNext: offset + limit < count,
            hasPrev: offset > 0,
          },
        })
      );
    }
  );

  // ============================================================================
  // GET TENANT DETAILS
  // ============================================================================

  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get tenant details (super user only)",
        tags: ["Tenants", "Admin"],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: tenantResponseSchema,
        },
      },
      preHandler: [requireSuperUser()],
    },
    async (request, reply) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params as { id: string };

      const tenantResult = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);

      if (!tenantResult.length) {
        return createNotFoundError("Tenant not found", reply);
      }

      const tenant = tenantResult[0];
      if (!tenant) {
        return createNotFoundError("Tenant not found", reply);
      }

      // Get user and location counts
      const [userCount, locationCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.tenantId, tenant.id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(locations)
          .where(eq(locations.tenantId, tenant.id)),
      ]);

      const responseData = {
        id: tenant.id,
        orgId: tenant.orgId,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        metadata: tenant.metadata as Record<string, any> | null,
        totalUsers: userCount[0]?.count || 0,
        totalLocations: locationCount[0]?.count || 0,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      };

      return reply.send(createSuccessResponse(responseData));
    }
  );

  // ============================================================================
  // UPDATE TENANT
  // ============================================================================

  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update tenant (super user only)",
        tags: ["Tenants", "Admin"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: tenantUpdateSchema,
        response: {
          200: tenantResponseSchema,
        },
      },
      preHandler: [requireSuperUser()],
    },
    async (request, reply) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params as { id: string };
      const updateData = request.body as TenantUpdate;

      // Check if tenant exists
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);

      if (!existingTenant.length) {
        return createNotFoundError("Tenant not found", reply);
      }

      // Check slug uniqueness if being updated
      if (updateData.slug) {
        const slugExists = await db
          .select()
          .from(tenants)
          .where(
            and(eq(tenants.slug, updateData.slug), sql`${tenants.id} != ${id}`)
          )
          .limit(1);

        if (slugExists.length > 0) {
          return createBadRequestError("Tenant slug already exists", reply);
        }
      }

      // Prepare update object
      const updates: any = {};

      if (updateData.name !== undefined) {
        updates.name = updateData.name;
      }

      if (updateData.slug !== undefined) {
        updates.slug = updateData.slug;
      }

      if (updateData.isActive !== undefined) {
        updates.isActive = updateData.isActive;
      }

      if (updateData.metadata !== undefined) {
        updates.metadata = updateData.metadata;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
      }

      // Update tenant
      const updatedTenants = await db
        .update(tenants)
        .set(updates)
        .where(eq(tenants.id, id))
        .returning();

      const tenant = updatedTenants[0];
      if (!tenant) {
        throw new Error("Failed to update tenant");
      }

      // Get user and location counts
      const [userCount, locationCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.tenantId, tenant.id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(locations)
          .where(eq(locations.tenantId, tenant.id)),
      ]);

      const responseData = {
        id: tenant.id,
        orgId: tenant.orgId,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        metadata: tenant.metadata as Record<string, any> | null,
        totalUsers: userCount[0]?.count || 0,
        totalLocations: locationCount[0]?.count || 0,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      };

      return reply.send(
        createSuccessResponse(responseData, "Tenant updated successfully")
      );
    }
  );

  // ============================================================================
  // DEACTIVATE TENANT
  // ============================================================================

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Deactivate tenant (super user only)",
        tags: ["Tenants", "Admin"],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
        },
      },
      preHandler: [requireSuperUser()],
    },
    async (request, reply) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params as { id: string };

      // Check if tenant exists
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);

      if (!existingTenant.length) {
        return createNotFoundError("Tenant not found", reply);
      }

      // Don't allow deactivating own tenant
      if (existingTenant[0]?.id === currentUser.tenantId) {
        return createBadRequestError(
          "Cannot deactivate your own tenant",
          reply
        );
      }

      // Deactivate tenant
      await db
        .update(tenants)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, id));

      return reply.send({
        success: true,
        message: "Tenant deactivated successfully",
      });
    }
  );
}
