/**
 * Loyalty Program API Routes
 *
 * Manages loyalty points earning, tier progression, and redemption.
 * Points are earned on purchases and can be redeemed for vouchers.
 *
 * @see @contracts/erp/customers/loyalty.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createBadRequestError,
  createNotFoundError,
} from '@/shared/utils/responses.js';
import { buildRequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import { loyaltyAccounts, loyaltyLedger, customers, vouchers } from '@/config/schema.js';
import { eq, and, desc, sql, sum, gte, lte, type SQL } from 'drizzle-orm';
import {
  DEFAULT_TIER_CONFIGS,
  determineLoyaltyTier,
  getTierMultiplier,
  calculatePointsToNextTier,
  calculatePointsEarned,
  calculateVoucherValue,
  canRedeemPoints,
} from '@contracts/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const earnPointsSchema = z.object({
  customerId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderSubtotal: z.number().positive(),
  description: z.string().max(500).optional(),
});

const redeemPointsSchema = z.object({
  customerId: z.string().uuid(),
  pointsToRedeem: z.number().int().positive().multipleOf(100),
  notes: z.string().max(500).optional(),
});

const adjustPointsSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int(),
  reason: z.string().min(1).max(500),
});

const transactionQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  transactionType: z.enum(['earned', 'redeemed', 'expired', 'adjusted', 'bonus', 'refunded']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate lifetime points for an account
 */
async function calculateLifetimePoints(accountId: string): Promise<number> {
  const result = await db
    .select({
      total: sum(loyaltyLedger.pointsDelta),
    })
    .from(loyaltyLedger)
    .where(and(
      eq(loyaltyLedger.accountId, accountId),
      gte(loyaltyLedger.pointsDelta, 0) // Only count earned points, not redeemed
    ))
    .then(rows => rows[0]);

  return result?.total ? parseInt(result.total.toString(), 10) : 0;
}

/**
 * Get or create loyalty account for customer
 */
async function getOrCreateLoyaltyAccount(customerId: string) {
  // Try to find existing account
  let account = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.customerId, customerId))
    .limit(1)
    .then(rows => rows[0]);

  // Create if doesn't exist
  if (!account) {
    [account] = await db
      .insert(loyaltyAccounts)
      .values({
        customerId,
        pointsBalance: 0,
      })
      .returning();
  }

  return account;
}

/**
 * Build loyalty account response with calculated fields
 */
async function buildAccountResponse(account: any, customer: any) {
  const lifetimePoints = await calculateLifetimePoints(account.id);
  const tier = determineLoyaltyTier(lifetimePoints);
  const tierMultiplier = getTierMultiplier(tier);
  const pointsToNext = calculatePointsToNextTier(lifetimePoints);

  let nextTier: string | null = null;
  if (tier === 'bronze') nextTier = 'silver';
  else if (tier === 'silver') nextTier = 'gold';

  return {
    id: account.id,
    customerId: account.customerId,
    pointsBalance: account.pointsBalance.toString(),
    lifetimePoints: lifetimePoints.toString(),
    tier,
    tierMultiplier,
    tierExpiryDate: null, // TODO: Implement tier expiry logic if needed
    nextTier,
    pointsToNextTier: pointsToNext,
    createdAt: account.createdAt,
    updatedAt: account.createdAt, // No updatedAt in schema
    customer: customer ? {
      id: customer.id,
      code: customer.code || '',
      name: customer.name || customer.email || '',
      email: customer.email || '',
    } : null,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

export function loyaltyRoutes(fastify: FastifyInstance) {
  // GET /api/v1/loyalty/accounts/:customerId - Get loyalty account
  fastify.get(
    '/accounts/:customerId',
    {
      schema: {
        params: z.object({
          customerId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);

      // Get or create account
      const account = await getOrCreateLoyaltyAccount(request.params.customerId);

      // Get customer info
      const [customer] = await db
        .select({
          id: customers.id,
          code: customers.code,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, request.params.customerId),
          eq(customers.tenantId, context.tenantId)
        ))
        .limit(1);

      if (!customer) {
        return createNotFoundError('Customer not found', reply);
      }

      const responseData = await buildAccountResponse(account, customer);

      return reply.send(createSuccessResponse(responseData, 'Loyalty account retrieved successfully'));
    }
  );

  // POST /api/v1/loyalty/earn - Earn points from order
  fastify.post(
    '/earn',
    {
      schema: {
        body: earnPointsSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof earnPointsSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const body = request.body;

      // Get or create account
      const account = await getOrCreateLoyaltyAccount(body.customerId);
      if (!account) {
        return createBadRequestError('Failed to create loyalty account', reply);
      }

      // Calculate lifetime points to determine current tier
      const lifetimePoints = await calculateLifetimePoints(account.id);
      const tier = determineLoyaltyTier(lifetimePoints);
      const tierMultiplier = getTierMultiplier(tier);

      // Calculate points earned with tier multiplier
      const pointsEarned = calculatePointsEarned(body.orderSubtotal, tierMultiplier);

      // Record in transaction
      const result = await db.transaction(async (tx) => {
        // Create ledger entry
        const [ledgerEntry] = await tx
          .insert(loyaltyLedger)
          .values({
            accountId: account.id,
            refType: 'order',
            refId: body.orderId,
            pointsDelta: pointsEarned,
            reason: body.description || `Points earned from order ${body.orderId.substring(0, 8)}`,
          })
          .returning();

        // Update account balance
        const [updatedAccount] = await tx
          .update(loyaltyAccounts)
          .set({
            pointsBalance: account.pointsBalance + pointsEarned,
          })
          .where(eq(loyaltyAccounts.id, account.id))
          .returning();

        if (!ledgerEntry || !updatedAccount) {
          throw new Error('Failed to record points transaction');
        }

        return { ledgerEntry, updatedAccount };
      });

      return reply.send(createSuccessResponse({
        ledgerEntryId: result.ledgerEntry.id,
        pointsEarned,
        newPointsBalance: result.updatedAccount.pointsBalance.toString(),
        tier,
        tierMultiplier,
      }, 'Points earned successfully'));
    }
  );

  // POST /api/v1/loyalty/redeem - Redeem points for voucher
  fastify.post(
    '/redeem',
    {
      schema: {
        body: redeemPointsSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof redeemPointsSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const body = request.body;

      // Get account
      const account = await getOrCreateLoyaltyAccount(body.customerId);
      if (!account) {
        return createBadRequestError('Failed to create loyalty account', reply);
      }

      // Validate redemption
      const validation = canRedeemPoints(account.pointsBalance, body.pointsToRedeem);
      if (!validation.valid) {
        return createBadRequestError(validation.error || 'Cannot redeem points', reply);
      }

      // Calculate voucher value (100 points = $1)
      const voucherValue = calculateVoucherValue(body.pointsToRedeem);

      // Generate voucher code
      const voucherCode = `LP${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Transaction: deduct points, create voucher, record in ledger
      const result = await db.transaction(async (tx) => {
        // Create voucher
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 90); // 90 days validity

        const [voucher] = await tx
          .insert(vouchers)
          .values({
            tenantId: context.tenantId,
            code: voucherCode,
            kind: 'fixed',
            amount: voucherValue.toString(),
            minSpend: null,
            usageLimit: 1,
            usagePerCustomer: 1,
            startAt: validFrom,
            endAt: validUntil,
            isActive: true,
          })
          .returning();

        if (!voucher) {
          throw new Error('Failed to create voucher');
        }

        // Create ledger entry (negative points)
        const [ledgerEntry] = await tx
          .insert(loyaltyLedger)
          .values({
            accountId: account.id,
            refType: 'voucher_redemption',
            refId: voucher.id,
            pointsDelta: -body.pointsToRedeem,
            reason: body.notes || `Redeemed ${body.pointsToRedeem} points for $${voucherValue} voucher`,
          })
          .returning();

        // Update account balance
        const [updatedAccount] = await tx
          .update(loyaltyAccounts)
          .set({
            pointsBalance: account.pointsBalance - body.pointsToRedeem,
          })
          .where(eq(loyaltyAccounts.id, account.id))
          .returning();

        if (!voucher || !ledgerEntry || !updatedAccount) {
          throw new Error('Failed to complete redemption transaction');
        }

        return { voucher, ledgerEntry, updatedAccount };
      });

      return reply.send(createSuccessResponse({
        redemptionId: result.ledgerEntry.id,
        customerId: body.customerId,
        pointsRedeemed: body.pointsToRedeem,
        voucherIssued: {
          voucherId: result.voucher.id,
          voucherCode: result.voucher.code,
          voucherValue,
          validFrom: result.voucher.startAt!,
          validUntil: result.voucher.endAt!,
        },
        newPointsBalance: result.updatedAccount.pointsBalance.toString(),
        ledgerEntryId: result.ledgerEntry.id,
      }, 'Points redeemed successfully'));
    }
  );

  // POST /api/v1/loyalty/adjust - Manual points adjustment (admin)
  fastify.post(
    '/adjust',
    {
      schema: {
        body: adjustPointsSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof adjustPointsSchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const body = request.body;

      // Get or create account
      const account = await getOrCreateLoyaltyAccount(body.customerId);
      if (!account) {
        return createBadRequestError('Failed to create loyalty account', reply);
      }

      // Check if adjustment would result in negative balance
      const newBalance = account.pointsBalance + body.points;
      if (newBalance < 0) {
        return createBadRequestError(
          `Adjustment would result in negative balance. Current: ${account.pointsBalance}, Adjustment: ${body.points}`,
          reply
        );
      }

      // Record adjustment
      const result = await db.transaction(async (tx) => {
        // Create ledger entry
        const [ledgerEntry] = await tx
          .insert(loyaltyLedger)
          .values({
            accountId: account.id,
            refType: 'adjustment',
            refId: context.userId, // Reference to admin who made adjustment
            pointsDelta: body.points,
            reason: `Manual adjustment by admin: ${body.reason}`,
          })
          .returning();

        // Update account balance
        const [updatedAccount] = await tx
          .update(loyaltyAccounts)
          .set({
            pointsBalance: newBalance,
          })
          .where(eq(loyaltyAccounts.id, account.id))
          .returning();

        if (!ledgerEntry || !updatedAccount) {
          throw new Error('Failed to adjust points');
        }

        return { ledgerEntry, updatedAccount };
      });

      return reply.send(createSuccessResponse({
        ledgerEntryId: result.ledgerEntry.id,
        pointsAdjusted: body.points,
        newPointsBalance: result.updatedAccount.pointsBalance.toString(),
        adjustedBy: context.userId,
      }, 'Points adjusted successfully'));
    }
  );

  // GET /api/v1/loyalty/transactions - Transaction history
  fastify.get(
    '/transactions',
    {
      schema: {
        querystring: transactionQuerySchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.any()),
            pagination: z.object({
              total: z.number(),
              limit: z.number(),
              offset: z.number(),
              hasMore: z.boolean(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof transactionQuerySchema> }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);
      const query = request.query;

      const whereConditions: SQL[] = [];

      // Filter by customer if provided
      if (query.customerId) {
        const account = await db
          .select()
          .from(loyaltyAccounts)
          .where(eq(loyaltyAccounts.customerId, query.customerId))
          .limit(1)
          .then(rows => rows[0]);

        if (!account) {
          return reply.send(createPaginatedResponse([], 0, query.limit || 20, query.offset || 0));
        }

        whereConditions.push(eq(loyaltyLedger.accountId, account.id));
      }

      // Filter by transaction type (map to refType)
      if (query.transactionType) {
        const refTypeMap: Record<string, string> = {
          earned: 'order',
          redeemed: 'voucher_redemption',
          adjusted: 'adjustment',
          bonus: 'birthday_bonus',
          expired: 'expiry',
          refunded: 'refund',
        };
        whereConditions.push(eq(loyaltyLedger.refType, refTypeMap[query.transactionType] || query.transactionType));
      }

      // Date range filters
      if (query.startDate) {
        whereConditions.push(gte(loyaltyLedger.createdAt, new Date(query.startDate)));
      }
      if (query.endDate) {
        whereConditions.push(lte(loyaltyLedger.createdAt, new Date(query.endDate)));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(loyaltyLedger)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const total = countResult?.count || 0;

      // Get paginated results
      const limit = query.limit || 20;
      const offset = query.offset || 0;

      const results = await db
        .select({
          id: loyaltyLedger.id,
          accountId: loyaltyLedger.accountId,
          refType: loyaltyLedger.refType,
          refId: loyaltyLedger.refId,
          pointsDelta: loyaltyLedger.pointsDelta,
          reason: loyaltyLedger.reason,
          createdAt: loyaltyLedger.createdAt,
        })
        .from(loyaltyLedger)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(loyaltyLedger.createdAt))
        .limit(limit)
        .offset(offset);

      // Calculate running balance for each transaction
      const items = [];
      for (const r of results) {
        // Get balance after this transaction (sum up to this point)
        const [balanceResult] = await db
          .select({ total: sum(loyaltyLedger.pointsDelta) })
          .from(loyaltyLedger)
          .where(and(
            eq(loyaltyLedger.accountId, r.accountId),
            lte(loyaltyLedger.createdAt, r.createdAt)
          ));

        const balanceAfter = balanceResult?.total ? parseInt(balanceResult.total.toString(), 10) : 0;

        // Map refType to transaction type
        const transactionTypeMap: Record<string, string> = {
          order: 'earned',
          voucher_redemption: 'redeemed',
          adjustment: 'adjusted',
          birthday_bonus: 'bonus',
          expiry: 'expired',
          refund: 'refunded',
        };

        items.push({
          id: r.id,
          loyaltyAccountId: r.accountId,
          transactionType: transactionTypeMap[r.refType] || r.refType,
          points: r.pointsDelta.toString(),
          balanceAfter: balanceAfter.toString(),
          referenceType: r.refType,
          referenceId: r.refId,
          description: r.reason || '',
          createdAt: r.createdAt,
        });
      }

      return reply.send(createPaginatedResponse(items, total, limit, offset));
    }
  );

  // GET /api/v1/loyalty/catalog - Redemption catalog
  fastify.get(
    '/catalog',
    {
      schema: {
        querystring: z.object({
          customerId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { customerId?: string } }>, reply: FastifyReply) => {
      const context = buildRequestContext(request);

      // Get customer's points balance if provided
      let customerPointsBalance = '0';
      if (request.query.customerId) {
        const account = await getOrCreateLoyaltyAccount(request.query.customerId);
        if (account) {
          customerPointsBalance = account.pointsBalance.toString();
        }
      }

      // Build redemption catalog (static for now)
      const items = [
        {
          id: '100',
          name: '$1 Voucher',
          description: 'Redeem 100 points for $1 discount voucher',
          pointsCost: 100,
          voucherValue: 1,
          voucherType: 'fixed_amount',
          minSpend: null,
          validityDays: 90,
          imageUrl: null,
          isAvailable: true,
        },
        {
          id: '500',
          name: '$5 Voucher',
          description: 'Redeem 500 points for $5 discount voucher',
          pointsCost: 500,
          voucherValue: 5,
          voucherType: 'fixed_amount',
          minSpend: null,
          validityDays: 90,
          imageUrl: null,
          isAvailable: true,
        },
        {
          id: '1000',
          name: '$10 Voucher',
          description: 'Redeem 1000 points for $10 discount voucher',
          pointsCost: 1000,
          voucherValue: 10,
          voucherType: 'fixed_amount',
          minSpend: null,
          validityDays: 90,
          imageUrl: null,
          isAvailable: true,
        },
        {
          id: '2000',
          name: '$20 Voucher',
          description: 'Redeem 2000 points for $20 discount voucher',
          pointsCost: 2000,
          voucherValue: 20,
          voucherType: 'fixed_amount',
          minSpend: 50,
          validityDays: 90,
          imageUrl: null,
          isAvailable: true,
        },
        {
          id: '5000',
          name: '$50 Voucher',
          description: 'Redeem 5000 points for $50 discount voucher',
          pointsCost: 5000,
          voucherValue: 50,
          voucherType: 'fixed_amount',
          minSpend: 100,
          validityDays: 90,
          imageUrl: null,
          isAvailable: true,
        },
      ];

      return reply.send(createSuccessResponse({
        items,
        customerPointsBalance,
      }, 'Redemption catalog retrieved successfully'));
    }
  );
}
