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
import { eq, and, sql, count } from 'drizzle-orm';
import {
  validateVoucherEligibility,
  calculateVoucherDiscount,
} from '@contracts/erp';

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
