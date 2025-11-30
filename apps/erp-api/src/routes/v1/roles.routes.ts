/**
 * Role Management API Routes
 *
 * Handles RBAC role management:
 * - List roles
 * - Create roles
 * - Update roles
 * - Delete roles
 * - Manage role permissions
 * - Assign roles to users
 *
 * @module routes/v1/roles
 */

import type { FastifyInstance } from "fastify";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/config/database.js";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from "@/config/schema.js";
import { getTenantId, getUserId } from "@/shared/middleware/auth.js";
import {
  requirePermission,
  clearUserPermissionCache,
  loadUserPermissions,
} from "@/shared/middleware/rbac.js";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createNotFoundError,
  createBadRequestError,
} from "@/shared/utils/responses.js";
import {
  roleCreateSchema,
  roleUpdateSchema,
  roleQuerySchema,
  assignPermissionsSchema,
  removePermissionsSchema,
  assignRolesToUserSchema,
  removeRolesFromUserSchema,
  type RoleCreate,
  type RoleUpdate,
  type RoleQuery,
} from "@contracts/erp";

/**
 * Register role management routes
 */
export function rolesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // LIST ROLES
  // ============================================================================

  fastify.get(
    "/",
    {
      schema: {
        description: "List roles for current tenant",
        tags: ["Roles"],
        querystring: roleQuerySchema,
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const query = request.query as RoleQuery;
      const limit = query.limit ?? 50;
      const offset = query.offset ?? 0;
      const sortBy = query.sortBy ?? "name";
      const sortOrder = query.sortOrder ?? "asc";
      const name = query.name;
      const slug = query.slug;
      const isActive = query.isActive;

      // Build where conditions - include both tenant-specific and system roles (tenantId IS NULL)
      const conditions = [
        sql`(${roles.tenantId} = ${tenantId} OR ${roles.tenantId} IS NULL)`,
      ];

      if (name) {
        conditions.push(sql`${roles.name} ILIKE ${`%${name}%`}`);
      }
      if (slug) {
        conditions.push(sql`${roles.slug} ILIKE ${`%${slug}%`}`);
      }
      if (isActive !== undefined) {
        conditions.push(eq(roles.isActive, isActive));
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(roles)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      // Get paginated data
      let orderByClause;
      if (sortBy === "name") {
        orderByClause = sortOrder === "desc" ? desc(roles.name) : roles.name;
      } else if (sortBy === "slug") {
        orderByClause = sortOrder === "desc" ? desc(roles.slug) : roles.slug;
      } else if (sortBy === "createdAt") {
        orderByClause =
          sortOrder === "desc" ? desc(roles.createdAt) : roles.createdAt;
      } else {
        orderByClause = sortOrder === "desc" ? desc(roles.name) : roles.name;
      }

      const roleRecords = await db
        .select()
        .from(roles)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return reply.send(
        createPaginatedResponse(roleRecords, total, limit, offset)
      );
    }
  );

  // ============================================================================
  // GET ROLE BY ID
  // ============================================================================

  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get role by ID",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!role) {
        return createNotFoundError("Role not found", reply);
      }

      return reply.send(createSuccessResponse(role));
    }
  );

  // ============================================================================
  // GET ROLE WITH PERMISSIONS
  // ============================================================================

  fastify.get(
    "/:id/permissions",
    {
      schema: {
        description: "Get role with its permissions",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
      preHandler: [requirePermission("role", "read")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      // Get role
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!role) {
        return createNotFoundError("Role not found", reply);
      }

      // Get role's permissions
      const rolePerms = await db
        .select({
          permission: permissions,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id)
        )
        .where(eq(rolePermissions.roleId, id));

      return reply.send(
        createSuccessResponse({
          ...role,
          permissions: rolePerms.map((rp) => rp.permission),
        })
      );
    }
  );

  // ============================================================================
  // CREATE ROLE
  // ============================================================================

  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new role",
        tags: ["Roles"],
        body: roleCreateSchema,
      },
      preHandler: [requirePermission("role", "create")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const data = request.body as RoleCreate;

      // Check if role slug already exists for this tenant
      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, data.slug)))
        .limit(1);

      if (existing) {
        return createBadRequestError("Role slug already exists", reply);
      }

      // Create role
      const [newRole] = await db
        .insert(roles)
        .values({
          tenantId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          isActive: data.isActive ?? true,
        })
        .returning();

      if (!newRole) {
        throw new Error("Failed to create role");
      }

      return reply
        .status(201)
        .send(createSuccessResponse(newRole, "Role created"));
    }
  );

  // ============================================================================
  // UPDATE ROLE
  // ============================================================================

  fastify.put(
    "/:id",
    {
      schema: {
        description: "Update a role",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: roleUpdateSchema,
      },
      preHandler: [requirePermission("role", "update")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const data = request.body as RoleUpdate;

      // Get existing role
      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return createNotFoundError("Role not found", reply);
      }

      // Check slug uniqueness if being changed
      if (data.slug && data.slug !== existing.slug) {
        const [duplicate] = await db
          .select()
          .from(roles)
          .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, data.slug)))
          .limit(1);

        if (duplicate) {
          return createBadRequestError("Role slug already exists", reply);
        }
      }

      // Update role
      const [updated] = await db
        .update(roles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update role");
      }

      // Clear permission cache for users with this role
      const usersWithRole = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, id));

      for (const ur of usersWithRole) {
        clearUserPermissionCache(ur.userId);
      }

      return reply.send(createSuccessResponse(updated, "Role updated"));
    }
  );

  // ============================================================================
  // DELETE ROLE
  // ============================================================================

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete a role",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
      preHandler: [requirePermission("role", "delete")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      // Get existing role
      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return createNotFoundError("Role not found", reply);
      }

      // Clear permission cache for users with this role
      const usersWithRole = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, id));

      // Delete role (cascades to user_roles and role_permissions)
      await db.delete(roles).where(eq(roles.id, id));

      // Clear permission caches
      for (const ur of usersWithRole) {
        clearUserPermissionCache(ur.userId);
      }

      return reply.send(
        createSuccessResponse({ deleted: true }, "Role deleted")
      );
    }
  );

  // ============================================================================
  // ASSIGN PERMISSIONS TO ROLE
  // ============================================================================

  fastify.post(
    "/:id/permissions",
    {
      schema: {
        description: "Assign permissions to role",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: assignPermissionsSchema,
      },
      preHandler: [requirePermission("role", "manage_permissions")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const { permissionIds } = request.body as { permissionIds: string[] };

      // Verify role exists and belongs to tenant
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!role) {
        return createNotFoundError("Role not found", reply);
      }

      // Verify all permissions exist
      const existingPermissions = await db
        .select()
        .from(permissions)
        .where(inArray(permissions.id, permissionIds));

      if (existingPermissions.length !== permissionIds.length) {
        return createBadRequestError(
          "One or more permissions not found",
          reply
        );
      }

      // Insert role-permission mappings (ignore duplicates)
      const values = permissionIds.map((permId) => ({
        roleId: id,
        permissionId: permId,
        grantedBy: userId,
      }));

      await db.insert(rolePermissions).values(values).onConflictDoNothing();

      // Clear permission cache for users with this role
      const usersWithRole = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, id));

      for (const ur of usersWithRole) {
        clearUserPermissionCache(ur.userId);
      }

      return reply.send(
        createSuccessResponse(
          { assigned: permissionIds.length },
          "Permissions assigned"
        )
      );
    }
  );

  // ============================================================================
  // REMOVE PERMISSIONS FROM ROLE
  // ============================================================================

  fastify.delete(
    "/:id/permissions",
    {
      schema: {
        description: "Remove permissions from role",
        tags: ["Roles"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: removePermissionsSchema,
      },
      preHandler: [requirePermission("role", "manage_permissions")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const { permissionIds } = request.body as { permissionIds: string[] };

      // Verify role exists and belongs to tenant
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!role) {
        return createNotFoundError("Role not found", reply);
      }

      // Remove role-permission mappings
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, id),
            inArray(rolePermissions.permissionId, permissionIds)
          )
        );

      // Clear permission cache for users with this role
      const usersWithRole = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, id));

      for (const ur of usersWithRole) {
        clearUserPermissionCache(ur.userId);
      }

      return reply.send(
        createSuccessResponse(
          { removed: permissionIds.length },
          "Permissions removed"
        )
      );
    }
  );

  // ============================================================================
  // ASSIGN ROLES TO USER
  // ============================================================================

  fastify.post(
    "/users/:userId/roles",
    {
      schema: {
        description: "Assign roles to user",
        tags: ["Roles"],
        params: z.object({
          userId: z.string().uuid(),
        }),
        body: assignRolesToUserSchema,
      },
      preHandler: [requirePermission("user", "update")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const currentUserId = getUserId(request);
      const { userId } = request.params as { userId: string };
      const { roleIds } = request.body as { roleIds: string[] };

      // Verify user exists and belongs to tenant
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!user) {
        return createNotFoundError("User not found", reply);
      }

      // Verify all roles exist and belong to tenant
      const existingRoles = await db
        .select()
        .from(roles)
        .where(and(inArray(roles.id, roleIds), eq(roles.tenantId, tenantId)));

      if (existingRoles.length !== roleIds.length) {
        return createBadRequestError("One or more roles not found", reply);
      }

      // Insert user-role mappings (ignore duplicates)
      const values = roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy: currentUserId,
      }));

      await db.insert(userRoles).values(values).onConflictDoNothing();

      // Clear permission cache for user
      clearUserPermissionCache(userId);

      return reply.send(
        createSuccessResponse({ assigned: roleIds.length }, "Roles assigned")
      );
    }
  );

  // ============================================================================
  // REMOVE ROLES FROM USER
  // ============================================================================

  fastify.delete(
    "/users/:userId/roles",
    {
      schema: {
        description: "Remove roles from user",
        tags: ["Roles"],
        params: z.object({
          userId: z.string().uuid(),
        }),
        body: removeRolesFromUserSchema,
      },
      preHandler: [requirePermission("user", "update")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { userId } = request.params as { userId: string };
      const { roleIds } = request.body as { roleIds: string[] };

      // Verify user exists and belongs to tenant
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!user) {
        return createNotFoundError("User not found", reply);
      }

      // Remove user-role mappings
      await db
        .delete(userRoles)
        .where(
          and(eq(userRoles.userId, userId), inArray(userRoles.roleId, roleIds))
        );

      // Clear permission cache for user
      clearUserPermissionCache(userId);

      return reply.send(
        createSuccessResponse({ removed: roleIds.length }, "Roles removed")
      );
    }
  );

  // ============================================================================
  // GET USER'S ROLES
  // ============================================================================

  fastify.get(
    "/users/:userId",
    {
      schema: {
        description: "Get user's roles",
        tags: ["Roles"],
        params: z.object({
          userId: z.string().uuid(),
        }),
      },
      preHandler: [requirePermission("user", "read")],
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { userId } = request.params as { userId: string };

      // Verify user exists and belongs to tenant
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!user) {
        return createNotFoundError("User not found", reply);
      }

      // Get user's permissions
      const userPerms = await loadUserPermissions(userId);

      return reply.send(
        createSuccessResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          roles: userPerms.roles,
        })
      );
    }
  );
}
