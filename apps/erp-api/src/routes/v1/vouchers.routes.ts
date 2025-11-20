import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
  notFoundResponseSchema,
} from '@/modules/shared/responses.js';
import { buildRequestContext, getTenantId, getUserId } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import { vouchers, voucherRedemptions, orders, customers } from '@/config/schema.js';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import {
  validateVoucherEligibility,
  calculateVoucherDiscount,
} from '@contracts/erp';

// ============================================================================
// VOUCHER CRUD SCHEMAS
// ============================================================================

const voucherCreateSchema = z.object({
  code: z.string().min(3).max(32).optional(),
  kind: z.enum(['percent', 'fixed', 'gift']),
  amount: z.number().positive(),
  minSpend: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  usagePerCustomer: z.number().int().positive().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

const voucherUpdateSchema = voucherCreateSchema.partial();

const voucherQuerySchema = z.object({
  kind: z.enum(['percent', 'fixed', 'gift']).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// VOUCHER VALIDATION & REDEMPTION SCHEMAS
// ============================================================================

const validateVoucherSchema = z.object({
  voucherCode: z.string().min(1).max(50),
  customerId: z.string().uuid().optional(),
  orderSubtotal: z.number().nonnegative(),
  channel: z.enum(['pos', 'online', 'wholesale']),
});

const applyVoucherSchema = z.object({
  voucherCode: z.string().min(1).max(50),
  orderId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  orderSubtotal: z.number().nonnegative(),
  channel: z.enum(['pos', 'online', 'wholesale']),
});

export function voucherRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CRUD ENDPOINTS
  // ============================================================================

  // GET /api/v1/vouchers - List vouchers
  fastify.get(
    '/',
    {
      schema: {
        description: 'List all vouchers with filtering',
        tags: ['Vouchers'],
        querystring: voucherQuerySchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.object({
              id: z.string().uuid(),
              code: z.string(),
              kind: z.string(),
              amount: z.string(),
              minSpend: z.string().nullable(),
              usageLimit: z.number().nullable(),
              usagePerCustomer: z.number().nullable(),
              startAt: z.date().nullable(),
              endAt: z.date().nullable(),
              isActive: z.boolean(),
            })),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof voucherQuerySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { kind, isActive, limit, offset } = request.query;

      const whereConditions = [eq(vouchers.tenantId, tenantId)];

      if (kind) {
        whereConditions.push(eq(vouchers.kind, kind));
      }

      if (isActive !== undefined) {
        whereConditions.push(eq(vouchers.isActive, isActive));
      }

      const voucherList = await db
        .select()
        .from(vouchers)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(vouchers.id));

      return reply.send(createSuccessResponse(voucherList, 'Vouchers retrieved successfully'));
    }
  );

  // GET /api/v1/vouchers/:id - Get voucher by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get voucher by ID',
        tags: ['Vouchers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              code: z.string(),
              kind: z.string(),
              amount: z.string(),
              minSpend: z.string().nullable(),
              usageLimit: z.number().nullable(),
              usagePerCustomer: z.number().nullable(),
              startAt: z.date().nullable(),
              endAt: z.date().nullable(),
              isActive: z.boolean(),
              currentUses: z.number(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const voucherResult = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.id, request.params.id),
          eq(vouchers.tenantId, tenantId)
        ))
        .limit(1);

      if (!voucherResult.length) {
        return createNotFoundError('Voucher not found', reply);
      }

      const voucher = voucherResult[0]!;

      // Get usage count
      const usageCount = await db
        .select({ count: count() })
        .from(voucherRedemptions)
        .where(eq(voucherRedemptions.voucherId, voucher.id));

      const currentUses = usageCount[0]?.count || 0;

      return reply.send(createSuccessResponse({
        ...voucher,
        currentUses,
      }, 'Voucher retrieved successfully'));
    }
  );

  // POST /api/v1/vouchers - Create voucher
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new voucher',
        tags: ['Vouchers'],
        body: voucherCreateSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              code: z.string(),
              kind: z.string(),
              amount: z.string(),
              minSpend: z.string().nullable(),
              usageLimit: z.number().nullable(),
              usagePerCustomer: z.number().nullable(),
              startAt: z.date().nullable(),
              endAt: z.date().nullable(),
              isActive: z.boolean(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof voucherCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const body = request.body;

      // Generate code if not provided
      const code = body.code || `V${Date.now().toString(36).toUpperCase()}`;

      // Check if code already exists
      const existing = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.tenantId, tenantId),
          eq(vouchers.code, code)
        ))
        .limit(1);

      if (existing.length) {
        return createBadRequestError('Voucher code already exists', reply);
      }

      const [newVoucher] = await db
        .insert(vouchers)
        .values({
          tenantId,
          code,
          kind: body.kind,
          amount: body.amount.toString(),
          minSpend: body.minSpend?.toString() || null,
          usageLimit: body.usageLimit || null,
          usagePerCustomer: body.usagePerCustomer || null,
          startAt: body.startAt ? new Date(body.startAt) : null,
          endAt: body.endAt ? new Date(body.endAt) : null,
          isActive: body.isActive,
        })
        .returning();

      return reply.status(201).send(createSuccessResponse(newVoucher!, 'Voucher created successfully'));
    }
  );

  // PUT /api/v1/vouchers/:id - Update voucher
  fastify.put(
    '/:id',
    {
      schema: {
        description: 'Update voucher',
        tags: ['Vouchers'],
        params: z.object({ id: z.string().uuid() }),
        body: voucherUpdateSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              code: z.string(),
              kind: z.string(),
              amount: z.string(),
              minSpend: z.string().nullable(),
              usageLimit: z.number().nullable(),
              usagePerCustomer: z.number().nullable(),
              startAt: z.date().nullable(),
              endAt: z.date().nullable(),
              isActive: z.boolean(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof voucherUpdateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const body = request.body;

      // Verify voucher exists
      const existing = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.id, request.params.id),
          eq(vouchers.tenantId, tenantId)
        ))
        .limit(1);

      if (!existing.length) {
        return createNotFoundError('Voucher not found', reply);
      }

      // Build update object
      const updateData: any = {};
      if (body.kind) updateData.kind = body.kind;
      if (body.amount !== undefined) updateData.amount = body.amount.toString();
      if (body.minSpend !== undefined) updateData.minSpend = body.minSpend.toString();
      if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit;
      if (body.usagePerCustomer !== undefined) updateData.usagePerCustomer = body.usagePerCustomer;
      if (body.startAt !== undefined) updateData.startAt = new Date(body.startAt);
      if (body.endAt !== undefined) updateData.endAt = new Date(body.endAt);
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      const [updatedVoucher] = await db
        .update(vouchers)
        .set(updateData)
        .where(eq(vouchers.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse(updatedVoucher!, 'Voucher updated successfully'));
    }
  );

  // DELETE /api/v1/vouchers/:id - Deactivate voucher
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deactivate voucher',
        tags: ['Vouchers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              code: z.string(),
              isActive: z.boolean(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify voucher exists
      const existing = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.id, request.params.id),
          eq(vouchers.tenantId, tenantId)
        ))
        .limit(1);

      if (!existing.length) {
        return createNotFoundError('Voucher not found', reply);
      }

      const [deactivated] = await db
        .update(vouchers)
        .set({ isActive: false })
        .where(eq(vouchers.id, request.params.id))
        .returning();

      return reply.send(createSuccessResponse({
        id: deactivated!.id,
        code: deactivated!.code,
        isActive: deactivated!.isActive,
      }, 'Voucher deactivated successfully'));
    }
  );

  // ============================================================================
  // VALIDATION & REDEMPTION ENDPOINTS
  // ============================================================================

  // POST /api/v1/vouchers/validate - Validate voucher for order
  fastify.post(
    '/validate',
    {
      schema: {
        description: 'Validate voucher code for order without applying it',
        tags: ['Vouchers', 'Validation'],
        body: validateVoucherSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              valid: z.boolean(),
              voucherId: z.string().uuid().nullable(),
              voucherCode: z.string(),
              voucherType: z.string().nullable(),
              discountAmount: z.number().nullable(),
              message: z.string(),
              voucher: z.object({
                id: z.string(),
                code: z.string(),
                kind: z.string(),
                amount: z.string(),
                minSpend: z.string().nullable(),
                campaignName: z.string().nullable(),
                validFrom: z.date().nullable(),
                validUntil: z.date().nullable(),
              }).nullable(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof validateVoucherSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { voucherCode, customerId, orderSubtotal, channel } = request.body;

      // Find voucher
      const voucherResult = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.tenantId, tenantId),
          eq(vouchers.code, voucherCode)
        ))
        .limit(1);

      if (!voucherResult.length) {
        return reply.send(createSuccessResponse({
          valid: false,
          voucherId: null,
          voucherCode,
          voucherType: null,
          discountAmount: null,
          message: 'Voucher code not found',
          voucher: null,
        }, 'Voucher validation completed'));
      }

      const voucher = voucherResult[0]!;

      // Get current usage count
      const usageCount = await db
        .select({ count: count() })
        .from(voucherRedemptions)
        .where(eq(voucherRedemptions.voucherId, voucher.id));

      const currentUses = usageCount[0]?.count || 0;

      // Get customer usage count if customer provided
      let customerUsageCount = 0;
      if (customerId) {
        const customerUsage = await db
          .select({ count: count() })
          .from(voucherRedemptions)
          .where(and(
            eq(voucherRedemptions.voucherId, voucher.id),
            eq(voucherRedemptions.customerId, customerId)
          ));

        customerUsageCount = customerUsage[0]?.count || 0;
      }

      // Validate eligibility
      const validation = validateVoucherEligibility(
        {
          isActive: voucher.isActive,
          validFrom: voucher.startAt || new Date(0),
          validUntil: voucher.endAt || new Date('2099-12-31'),
          minSpend: Number(voucher.minSpend || 0),
          maxUses: voucher.usageLimit,
          currentUses,
          maxUsesPerCustomer: voucher.usagePerCustomer || 1,
          channel: 'all', // Assuming all channels allowed if not specified
        },
        orderSubtotal,
        channel,
        customerUsageCount
      );

      if (!validation.valid) {
        return reply.send(createSuccessResponse({
          valid: false,
          voucherId: voucher.id,
          voucherCode: voucher.code,
          voucherType: voucher.kind,
          discountAmount: null,
          message: validation.error || 'Voucher is not valid',
          voucher: {
            id: voucher.id,
            code: voucher.code,
            kind: voucher.kind,
            amount: voucher.amount.toString(),
            minSpend: voucher.minSpend?.toString() || null,
            campaignName: null,
            validFrom: voucher.startAt,
            validUntil: voucher.endAt,
          },
        }, 'Voucher validation completed'));
      }

      // Calculate discount
      const discountAmount = calculateVoucherDiscount(
        voucher.kind === 'percent' ? 'percentage_off' : voucher.kind === 'fixed' ? 'fixed_amount' : 'gift_card',
        Number(voucher.amount),
        orderSubtotal
      );

      return reply.send(createSuccessResponse({
        valid: true,
        voucherId: voucher.id,
        voucherCode: voucher.code,
        voucherType: voucher.kind,
        discountAmount,
        message: 'Voucher is valid',
        voucher: {
          id: voucher.id,
          code: voucher.code,
          kind: voucher.kind,
          amount: voucher.amount.toString(),
          minSpend: voucher.minSpend?.toString() || null,
          campaignName: null,
          validFrom: voucher.startAt,
          validUntil: voucher.endAt,
        },
      }, 'Voucher validated successfully'));
    }
  );

  // POST /api/v1/vouchers/redeem - Apply/redeem voucher to order
  fastify.post(
    '/redeem',
    {
      schema: {
        description: 'Apply voucher code to order and record redemption',
        tags: ['Vouchers', 'Redemption'],
        body: applyVoucherSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              redemptionId: z.string().uuid(),
              voucherId: z.string().uuid(),
              voucherCode: z.string(),
              discountApplied: z.number(),
              orderSubtotal: z.number(),
              finalAmount: z.number(),
            }),
            message: z.string(),
          }),
          400: z.object({
            success: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof applyVoucherSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { voucherCode, orderId, customerId, orderSubtotal, channel } = request.body;

      // Verify order exists and belongs to tenant
      const orderCheck = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!orderCheck.length) {
        return createNotFoundError('Order not found', reply);
      }

      const order = orderCheck[0]!;

      // Check if voucher already applied to this order
      const existingRedemption = await db
        .select()
        .from(voucherRedemptions)
        .where(eq(voucherRedemptions.orderId, orderId))
        .limit(1);

      if (existingRedemption.length) {
        return createBadRequestError('A voucher has already been applied to this order', reply);
      }

      // Find voucher
      const voucherResult = await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.tenantId, tenantId),
          eq(vouchers.code, voucherCode)
        ))
        .limit(1);

      if (!voucherResult.length) {
        return createNotFoundError('Voucher code not found', reply);
      }

      const voucher = voucherResult[0]!;

      // Get current usage count
      const usageCount = await db
        .select({ count: count() })
        .from(voucherRedemptions)
        .where(eq(voucherRedemptions.voucherId, voucher.id));

      const currentUses = usageCount[0]?.count || 0;

      // Get customer usage count if customer provided
      let customerUsageCount = 0;
      if (customerId) {
        const customerUsage = await db
          .select({ count: count() })
          .from(voucherRedemptions)
          .where(and(
            eq(voucherRedemptions.voucherId, voucher.id),
            eq(voucherRedemptions.customerId, customerId)
          ));

        customerUsageCount = customerUsage[0]?.count || 0;
      }

      // Validate eligibility
      const validation = validateVoucherEligibility(
        {
          isActive: voucher.isActive,
          validFrom: voucher.startAt || new Date(0),
          validUntil: voucher.endAt || new Date('2099-12-31'),
          minSpend: Number(voucher.minSpend || 0),
          maxUses: voucher.usageLimit,
          currentUses,
          maxUsesPerCustomer: voucher.usagePerCustomer || 1,
          channel: 'all', // Assuming all channels allowed if not specified
        },
        orderSubtotal,
        channel,
        customerUsageCount
      );

      if (!validation.valid) {
        return createBadRequestError(validation.error || 'Voucher is not valid', reply);
      }

      // Calculate discount
      const discountAmount = calculateVoucherDiscount(
        voucher.kind === 'percent' ? 'percentage_off' : voucher.kind === 'fixed' ? 'fixed_amount' : 'gift_card',
        Number(voucher.amount),
        orderSubtotal
      );

      // Create redemption record and update order in transaction
      const result = await db.transaction(async (tx) => {
        // Record redemption
        const [redemption] = await tx
          .insert(voucherRedemptions)
          .values({
            voucherId: voucher.id,
            orderId,
            customerId: customerId || null,
            amountApplied: discountAmount.toString(),
          })
          .returning();

        // Update order with voucher discount
        const [updatedOrder] = await tx
          .update(orders)
          .set({
            voucherAmount: discountAmount.toString(),
            discountAmount: sql`${orders.discountAmount} + ${discountAmount}`,
            totalAmount: sql`${orders.subtotal} + ${orders.taxAmount} + ${orders.serviceChargeAmount} + ${orders.tipsAmount} - ${orders.discountAmount} - ${discountAmount}`,
          })
          .where(eq(orders.id, orderId))
          .returning();

        if (!redemption || !updatedOrder) {
          throw new Error('Failed to apply voucher to order');
        }

        return { redemption, updatedOrder };
      });

      const finalAmount = Number(result.updatedOrder.totalAmount);

      return reply.send(createSuccessResponse({
        redemptionId: result.redemption.id,
        voucherId: voucher.id,
        voucherCode: voucher.code,
        discountApplied: discountAmount,
        orderSubtotal,
        finalAmount,
      }, 'Voucher redeemed successfully'));
    }
  );
}
