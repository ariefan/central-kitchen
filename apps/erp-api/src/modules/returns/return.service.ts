import { z } from 'zod';
import {
  returnOrderCreateSchema,
  returnOrderUpdateSchema,
  returnOrderQuerySchema,
} from './return.schema.js';
import { returnRepository } from './return.repository.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import {
  returnOrders,
  returnOrderItems,
  locations,
  customers,
  suppliers,
  products,
  uoms,
  lots,
} from '@/config/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { generateDocNumber } from '@/modules/shared/doc-sequence.js';
import { recordInventoryMovements } from '@/modules/shared/ledger.service.js';

type ReturnCreateInput = z.infer<typeof returnOrderCreateSchema>;
export class ReturnServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureLocation = async (locationId: string, tenantId: string) => {
  const rows = await db.select().from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new ReturnServiceError('Location not found', 'not_found');
  }
  return rows[0]!;
};

const ensureCustomer = async (customerId: string, tenantId: string) => {
  const rows = await db.select().from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new ReturnServiceError('Customer not found', 'not_found');
  }
  return rows[0]!;
};

const ensureSupplier = async (supplierId: string, tenantId: string) => {
  const rows = await db.select().from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new ReturnServiceError('Supplier not found', 'not_found');
  }
  return rows[0]!;
};

const ensureProductsExist = async (productIds: string[], tenantId: string) => {
  if (!productIds.length) return;
  const uniqueIds = Array.from(new Set(productIds));
  const rows = await db.select({ id: products.id })
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      inArray(products.id, uniqueIds),
    ));
  if (rows.length !== uniqueIds.length) {
    throw new ReturnServiceError('One or more products not found');
  }
};

const ensureUomsExist = async (uomIds: string[]) => {
  if (!uomIds.length) return;
  const uniqueIds = Array.from(new Set(uomIds));
  const rows = await db.select({ id: uoms.id })
    .from(uoms)
    .where(inArray(uoms.id, uniqueIds));
  if (rows.length !== uniqueIds.length) {
    throw new ReturnServiceError('One or more UOMs not found');
  }
};

const ensureLotsExist = async (lotIds: string[]) => {
  if (!lotIds.length) return;
  const uniqueIds = Array.from(new Set(lotIds));
  const rows = await db.select({ id: lots.id })
    .from(lots)
    .where(inArray(lots.id, uniqueIds));
  if (rows.length !== uniqueIds.length) {
    throw new ReturnServiceError('One or more lots not found');
  }
};

const buildItemsInsert = (returnOrderId: string, body: ReturnCreateInput) => body.items.map<typeof returnOrderItems.$inferInsert>((item) => ({
  returnOrderId,
  productId: item.productId,
  lotId: item.lotId ?? null,
  uomId: item.uomId,
  quantity: item.quantity.toString(),
  unitPrice: item.unitPrice?.toString() ?? null,
  reason: item.reason ?? null,
  notes: item.notes ?? null,
}));

const assertStatus = (orderStatus: string, allowed: string[], errorMessage: string) => {
  if (!allowed.includes(orderStatus)) {
    throw new ReturnServiceError(errorMessage);
  }
};

export const returnService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = returnOrderQuerySchema.parse(rawQuery ?? {});
    return returnRepository.list(context.tenantId, query);
  },

  async getById(id: string, context: RequestContext) {
    return returnRepository.findDetailedById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = returnOrderCreateSchema.parse(rawBody);
    await ensureLocation(body.locationId, context.tenantId);
    if (body.returnType === 'customer' && body.customerId) {
      await ensureCustomer(body.customerId, context.tenantId);
    }
    if (body.returnType === 'supplier' && body.supplierId) {
      await ensureSupplier(body.supplierId, context.tenantId);
    }
    await ensureProductsExist(body.items.map((item) => item.productId), context.tenantId);
    await ensureUomsExist(body.items.map((item) => item.uomId));
    await ensureLotsExist(body.items.map((item) => item.lotId).filter(Boolean) as string[]);

    const created = await db.transaction(async (tx) => {
      const returnNumber = generateDocNumber('RET', { tenantId: context.tenantId });
      const [order] = await tx.insert(returnOrders).values({
        tenantId: context.tenantId,
        returnNumber,
        returnType: body.returnType,
        referenceType: body.referenceType ?? null,
        referenceId: body.referenceId ?? null,
        customerId: body.customerId ?? null,
        supplierId: body.supplierId ?? null,
        locationId: body.locationId,
        reason: body.reason,
        totalAmount: body.totalAmount?.toString() ?? null,
        notes: body.notes ?? null,
        createdBy: context.userId,
      }).returning();

      if (!order) {
        throw new ReturnServiceError('Failed to create return order');
      }

      const items = buildItemsInsert(order.id, body);
      if (items.length) {
        await tx.insert(returnOrderItems).values(items);
      }

      return order;
    });

    return returnRepository.findDetailedById(created.id, context.tenantId);
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = returnOrderUpdateSchema.parse(rawBody ?? {});
    const existing = await returnRepository.findRawById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    if (['approved', 'rejected', 'completed', 'posted'].includes(existing.status)) {
      throw new ReturnServiceError(`Cannot update return order in ${existing.status} status`);
    }

    const updatePayload: Partial<typeof returnOrders.$inferInsert> = {};
    if (body.reason !== undefined) updatePayload.reason = body.reason;
    if (body.totalAmount !== undefined) updatePayload.totalAmount = body.totalAmount.toString();
    if (body.notes !== undefined) updatePayload.notes = body.notes ?? null;

    await returnRepository.updateById(db, id, context.tenantId, updatePayload);
    return returnRepository.findDetailedById(id, context.tenantId);
  },

  async approve(id: string, context: RequestContext) {
    const existing = await returnRepository.findRawById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    assertStatus(existing.status, ['requested'], 'Return order can only be approved from requested status');

    await returnRepository.updateById(db, id, context.tenantId, {
      status: 'approved',
      approvedBy: context.userId ?? null,
      approvedAt: new Date(),
    });

    return returnRepository.findDetailedById(id, context.tenantId);
  },

  async reject(id: string, reason: string, context: RequestContext) {
    const existing = await returnRepository.findRawById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    assertStatus(existing.status, ['requested'], 'Return order can only be rejected from requested status');

    await returnRepository.updateById(db, id, context.tenantId, {
      status: 'rejected',
      approvedBy: context.userId ?? null,
      approvedAt: new Date(),
      notes: `Rejected: ${reason}`,
    });

    return returnRepository.findDetailedById(id, context.tenantId);
  },

  async post(id: string, context: RequestContext) {
    const existing = await returnRepository.findDetailedById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    assertStatus(existing.status, ['approved'], 'Return order can only be posted from approved status');
    if (!existing.items.length) {
      throw new ReturnServiceError('Return order has no items');
    }

    const ledgerType = existing.returnType === 'customer' ? 'cust_ret' : 'sup_ret';
    const multiplier = existing.returnType === 'customer' ? 1 : -1;

    await recordInventoryMovements(
      existing.items.map((entry) => {
        const quantity = Number(entry.item.quantity ?? '0');
        return {
          tenantId: context.tenantId,
          productId: entry.item.productId,
          locationId: existing.locationId,
          lotId: entry.item.lotId ?? null,
          type: ledgerType,
          qtyDeltaBase: (multiplier * quantity).toString(),
          unitCost: entry.item.unitPrice ?? null,
          refType: 'RETURN_ORDER',
          refId: existing.id,
          note: `Return Order ${existing.returnNumber} - ${entry.item.reason ?? 'Return'}`,
          createdBy: context.userId ?? null,
        };
      })
    );

    await returnRepository.updateById(db, id, context.tenantId, {
      status: 'posted',
    });

    return returnRepository.findDetailedById(id, context.tenantId);
  },

  async complete(id: string, context: RequestContext) {
    const existing = await returnRepository.findRawById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    assertStatus(existing.status, ['approved'], 'Return order can only be completed from approved status');

    await returnRepository.updateById(db, id, context.tenantId, {
      status: 'completed',
    });

    return returnRepository.findDetailedById(id, context.tenantId);
  },
};
