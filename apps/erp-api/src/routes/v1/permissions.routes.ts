/**
 * Permission Management API Routes
 *
 * Handles viewing available permissions in the system.
 * Permissions are seeded and read-only.
 *
 * @module routes/v1/permissions
 */

import type { FastifyInstance } from "fastify";
import { sql, like, and, desc } from "drizzle-orm";

import { db } from "@/config/database.js";
import { permissions } from "@/config/schema.js";
import { getUserId } from "@/shared/middleware/auth.js";
import {
  requirePermission,
  getUserPermissions,
} from "@/shared/middleware/rbac.js";
import {
  createSuccessResponse,
  createPaginatedResponse,
} from "@/shared/utils/responses.js";
import { permissionQuerySchema, type PermissionQuery } from "@contracts/erp";

/**
 * Register permission management routes
 */
export function permissionsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // LIST ALL PERMISSIONS
  // ============================================================================

  fastify.get(
    "/",
    {
      schema: {
        description: "List all available permissions in the system",
        tags: ["Permissions"],
        querystring: permissionQuerySchema,
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (request, reply) => {
      const query = request.query as PermissionQuery;
      const limit = query.limit ?? 100;
      const offset = query.offset ?? 0;
      const sortBy = query.sortBy ?? "resource";
      const sortOrder = query.sortOrder ?? "asc";
      const resource = query.resource;
      const action = query.action;

      // Build where conditions
      const conditions = [];

      if (resource) {
        conditions.push(like(permissions.resource, `%${resource}%`));
      }
      if (action) {
        conditions.push(like(permissions.action, `%${action}%`));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(permissions)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      // Get paginated data
      let orderByClause;
      if (sortBy === "resource") {
        orderByClause =
          sortOrder === "desc"
            ? desc(permissions.resource)
            : permissions.resource;
      } else if (sortBy === "action") {
        orderByClause =
          sortOrder === "desc" ? desc(permissions.action) : permissions.action;
      } else {
        orderByClause =
          sortOrder === "desc"
            ? desc(permissions.resource)
            : permissions.resource;
      }

      const permissionRecords = await db
        .select()
        .from(permissions)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return reply.send(
        createPaginatedResponse(permissionRecords, total, limit, offset)
      );
    }
  );

  // ============================================================================
  // GET UNIQUE RESOURCES
  // ============================================================================

  fastify.get(
    "/resources",
    {
      schema: {
        description: "Get list of unique resource names",
        tags: ["Permissions"],
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (_request, reply) => {
      const resources = await db
        .selectDistinct({ resource: permissions.resource })
        .from(permissions)
        .orderBy(permissions.resource);

      return reply.send(
        createSuccessResponse(resources.map((r) => r.resource))
      );
    }
  );

  // ============================================================================
  // GET UNIQUE ACTIONS
  // ============================================================================

  fastify.get(
    "/actions",
    {
      schema: {
        description: "Get list of unique action names",
        tags: ["Permissions"],
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (_request, reply) => {
      const actions = await db
        .selectDistinct({ action: permissions.action })
        .from(permissions)
        .orderBy(permissions.action);

      return reply.send(createSuccessResponse(actions.map((a) => a.action)));
    }
  );

  // ============================================================================
  // GET CURRENT USER'S PERMISSIONS
  // ============================================================================

  fastify.get(
    "/me",
    {
      schema: {
        description: "Get current user's full permission set",
        tags: ["Permissions"],
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const userPerms = await getUserPermissions(request);

      return reply.send(
        createSuccessResponse({
          userId,
          roles: userPerms.roles,
          permissions: userPerms.permissions,
          isSuperUser: userPerms.isSuperUser,
        })
      );
    }
  );

  // ============================================================================
  // GET CURRENT USER'S PERMISSIONS (Frontend format)
  // ============================================================================

  fastify.get(
    "/my-permissions",
    {
      schema: {
        description: "Get current user's permissions in frontend format",
        tags: ["Permissions"],
      },
    },
    async (request, reply) => {
      const userPerms = await getUserPermissions(request);

      // Transform permissions to "resource:action" format
      const permissionStrings = userPerms.permissions.map(
        (p) => `${p.resource}:${p.action}`
      );

      return reply.send(
        createSuccessResponse({
          permissions: permissionStrings,
          roles: userPerms.roles.map((r) => ({
            id: r.id,
            name: r.name,
          })),
        })
      );
    }
  );

  // ============================================================================
  // CHECK IF USER HAS PERMISSION
  // ============================================================================

  fastify.post(
    "/check",
    {
      schema: {
        description: "Check if current user has a specific permission",
        tags: ["Permissions"],
        body: {
          type: "object",
          properties: {
            resource: { type: "string" },
            action: { type: "string" },
          },
          required: ["resource", "action"],
        },
      },
    },
    async (request, reply) => {
      const { resource, action } = request.body as {
        resource: string;
        action: string;
      };

      const userPerms = await getUserPermissions(request);

      // Super users have all permissions
      if (userPerms.isSuperUser) {
        return reply.send(
          createSuccessResponse({
            hasPermission: true,
            roles: userPerms.roles.map((r) => r.name),
          })
        );
      }

      // Check if user has the specific permission
      const hasPermission = userPerms.permissions.some(
        (p) => p.resource === resource && p.action === action
      );

      // Find which roles granted this permission
      const grantingRoles = hasPermission
        ? userPerms.roles.map((r) => r.name)
        : [];

      return reply.send(
        createSuccessResponse({
          hasPermission,
          roles: grantingRoles,
        })
      );
    }
  );
}
