/**
 * UOM Management API Routes (ADM-003)
 *
 * Manages units of measure (UOMs) for quantity tracking throughout the system.
 * UOMs are used for inventory, recipes, purchases, and sales.
 *
 * @see FEATURES.md Section 12.3 - UOM Management (ADM-003)
 * @module routes/v1/uoms
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/config/database.js';
import { uoms } from '@/config/schema.js';
import {
  uomCreateSchema,
  uomUpdateSchema,
  uomQuerySchema,
  uomResponseSchema,
  uomsResponseSchema,
  type UomCreate,
  type UomUpdate,
  type UomQuery,
} from '@contracts/erp';
import { getCurrentUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';

/**
 * Register UOM routes
 *
 * API Endpoints (from FEATURES.md ADM-003):
 * - POST /api/v1/uoms - Create UOM
 * - GET /api/v1/uoms - List UOMs
 * - GET /api/v1/uoms/:id - Get UOM details
 * - PATCH /api/v1/uoms/:id - Update UOM
 * - DELETE /api/v1/uoms/:id - Deactivate UOM
 */
export function uomRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE UOM
  // ============================================================================

  /**
   * POST /api/v1/uoms
   *
   * Create a new UOM
   *
   * Business Rules (from FEATURES.md ADM-003):
   * - UOM code is unique per tenant
   * - UOM type categorizes measurement (weight, volume, count, etc.)
   * - Used throughout system for quantity management
   *
   * @see FEATURES.md ADM-003 - "UOM definition (kg, g, L, mL, pcs, box)"
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new UOM',
        tags: ['UOMs', 'Admin'],
        body: uomCreateSchema,
        response: {
          201: uomResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: UomCreate }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const createData = request.body;

      // Check if UOM code already exists for this tenant
      const existingUom = await db
        .select({ id: uoms.id })
        .from(uoms)
        .where(
          and(
            eq(uoms.tenantId, currentUser.tenantId),
            eq(uoms.code, createData.code.toUpperCase())
          )
        )
        .limit(1);

      if (existingUom.length > 0) {
        return createBadRequestError(
          `UOM with code '${createData.code}' already exists`,
          reply
        );
      }

      // Create UOM
      const [newUom] = await db
        .insert(uoms)
        .values({
          tenantId: currentUser.tenantId,
          code: createData.code.toUpperCase(),
          name: createData.name,
          uomType: createData.uomType,
          symbol: createData.symbol,
          description: createData.description,
          isActive: createData.isActive ?? true,
        })
        .returning();

      if (!newUom) {
        return createBadRequestError('Failed to create UOM', reply);
      }

      return reply.status(201).send(
        createSuccessResponse(
          {
            ...newUom,
            createdAt: new Date(newUom.createdAt),
            updatedAt: new Date(newUom.updatedAt),
          },
          'UOM created successfully'
        )
      );
    }
  );

  // ============================================================================
  // LIST UOMS
  // ============================================================================

  /**
   * GET /api/v1/uoms
   *
   * List UOMs with filtering, search, and pagination
   *
   * Business Rules (from FEATURES.md ADM-003):
   * - Filter by UOM type (weight, volume, count, etc.)
   * - Filter by active status
   * - Search by code or name
   *
   * @see FEATURES.md ADM-003 - "UOM type (weight, volume, count)"
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List all UOMs with filtering and pagination',
        tags: ['UOMs', 'Admin'],
        querystring: uomQuerySchema,
        response: {
          200: uomsResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: UomQuery }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const query = request.query;

      // Build where conditions
      const whereConditions = [eq(uoms.tenantId, currentUser.tenantId)];

      // Apply filters
      if (query.code) {
        whereConditions.push(ilike(uoms.code, `%${query.code}%`));
      }

      if (query.name) {
        whereConditions.push(ilike(uoms.name, `%${query.name}%`));
      }

      if (query.uomType) {
        whereConditions.push(eq(uoms.uomType, query.uomType));
      }

      if (query.isActive !== undefined) {
        whereConditions.push(eq(uoms.isActive, query.isActive));
      }

      // Apply search across code and name
      if (query.search) {
        whereConditions.push(
          or(
            ilike(uoms.code, `%${query.search}%`),
            ilike(uoms.name, `%${query.search}%`)
          )!
        );
      }

      // Get total count
      const countResult = await db
        .select({ count: uoms.id })
        .from(uoms)
        .where(and(...whereConditions));

      const total = countResult.length;

      // Get paginated results
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const results = await db
        .select()
        .from(uoms)
        .where(and(...whereConditions))
        .orderBy(desc(uoms.code))
        .limit(limit)
        .offset(offset);

      // Calculate pagination metadata
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);
      const hasNext = offset + limit < total;
      const hasPrev = offset > 0;

      return reply.send(
        createSuccessResponse(
          {
            items: results.map((uom) => ({
              ...uom,
              createdAt: new Date(uom.createdAt),
              updatedAt: new Date(uom.updatedAt),
            })),
            pagination: {
              total,
              limit,
              offset,
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
            },
          },
          'UOMs retrieved successfully'
        )
      );
    }
  );

  // ============================================================================
  // GET UOM BY ID
  // ============================================================================

  /**
   * GET /api/v1/uoms/:id
   *
   * Get UOM details by ID
   *
   * Business Rules:
   * - UOM must belong to current tenant
   * - Return full UOM details
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get UOM by ID',
        tags: ['UOMs', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: uomResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);

      const [uom] = await db
        .select()
        .from(uoms)
        .where(
          and(
            eq(uoms.id, request.params.id),
            eq(uoms.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!uom) {
        return createNotFoundError('UOM not found', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...uom,
            createdAt: new Date(uom.createdAt),
            updatedAt: new Date(uom.updatedAt),
          },
          'UOM retrieved successfully'
        )
      );
    }
  );

  // ============================================================================
  // UPDATE UOM
  // ============================================================================

  /**
   * PATCH /api/v1/uoms/:id
   *
   * Update UOM
   *
   * Business Rules:
   * - UOM code cannot be changed (omitted from update schema)
   * - Can update name, type, symbol, description, active status
   * - UOM must belong to current tenant
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update UOM',
        tags: ['UOMs', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: uomUpdateSchema,
        response: {
          200: uomResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UomUpdate;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const updateData = request.body;

      // Verify UOM exists and belongs to tenant
      const [existingUom] = await db
        .select()
        .from(uoms)
        .where(
          and(
            eq(uoms.id, request.params.id),
            eq(uoms.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingUom) {
        return createNotFoundError('UOM not found', reply);
      }

      // Update UOM
      const [updatedUom] = await db
        .update(uoms)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(uoms.id, request.params.id))
        .returning();

      if (!updatedUom) {
        return createBadRequestError('Failed to update UOM', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...updatedUom,
            createdAt: new Date(updatedUom.createdAt),
            updatedAt: new Date(updatedUom.updatedAt),
          },
          'UOM updated successfully'
        )
      );
    }
  );

  // ============================================================================
  // DELETE UOM
  // ============================================================================

  /**
   * DELETE /api/v1/uoms/:id
   *
   * Soft delete (deactivate) UOM
   *
   * Business Rules:
   * - Soft delete by setting isActive = false
   * - Do not physically delete due to foreign key references
   * - UOM must belong to current tenant
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deactivate UOM (soft delete)',
        tags: ['UOMs', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: uomResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);

      // Verify UOM exists and belongs to tenant
      const [existingUom] = await db
        .select()
        .from(uoms)
        .where(
          and(
            eq(uoms.id, request.params.id),
            eq(uoms.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingUom) {
        return createNotFoundError('UOM not found', reply);
      }

      // Soft delete by deactivating
      const [deactivatedUom] = await db
        .update(uoms)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(uoms.id, request.params.id))
        .returning();

      if (!deactivatedUom) {
        return createBadRequestError('Failed to deactivate UOM', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...deactivatedUom,
            createdAt: new Date(deactivatedUom.createdAt),
            updatedAt: new Date(deactivatedUom.updatedAt),
          },
          'UOM deactivated successfully'
        )
      );
    }
  );
}
