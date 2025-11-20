import {
  transferCreateSchema,
  transferUpdateSchema,
  transferReceiveSchema,
  transferQuerySchema,
} from './transfer.schema.js';
import { transferRepository } from './transfer.repository.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import {
  transfers,
  transferItems,
  locations,
  products,
  uoms,
} from '@/config/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { generateDocNumber } from '@/modules/shared/doc-sequence.js';

export class TransferServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureLocation = async (locationId: string, tenantId: string) => {
  const rows = await db.select()
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new TransferServiceError('Location not found', 'not_found');
  }
  return rows[0]!;
};

const ensureProductExists = async (productIds: string[], tenantId: string) => {
  const unique = Array.from(new Set(productIds));
  if (!unique.length) {
    return;
  }
  const rows = await db.select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, unique)));
  if (rows.length !== unique.length) {
    throw new TransferServiceError('One or more products not found');
  }
};

const ensureUomsExist = async (uomIds: string[]) => {
  const unique = Array.from(new Set(uomIds));
  if (!unique.length) return;
  const rows = await db.select({ id: uoms.id })
    .from(uoms)
    .where(inArray(uoms.id, unique));
  if (rows.length !== unique.length) {
    throw new TransferServiceError('One or more UOMs not found');
  }
};

const assertStatus = (current: string, allowed: string[], message: string) => {
  if (!allowed.includes(current)) {
    throw new TransferServiceError(message);
  }
};

export const transferService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = transferQuerySchema.parse(rawQuery ?? {});
    return transferRepository.list(context.tenantId, query);
  },

  async getById(id: string, context: RequestContext) {
    return transferRepository.findDetailedById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = transferCreateSchema.parse(rawBody ?? {});
    if (body.fromLocationId === body.toLocationId) {
      throw new TransferServiceError('Cannot transfer to the same location');
    }

    await Promise.all([
      ensureLocation(body.fromLocationId, context.tenantId),
      ensureLocation(body.toLocationId, context.tenantId),
    ]);
    await ensureProductExists(body.items.map((item) => item.productId), context.tenantId);
    await ensureUomsExist(body.items.map((item) => item.uomId));

    const created = await db.transaction(async (tx) => {
      const transferNumber = generateDocNumber('XFER', { tenantId: context.tenantId });
      const [transfer] = await tx.insert(transfers).values({
        tenantId: context.tenantId,
        transferNumber,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        notes: body.notes ?? null,
        requestedBy: context.userId ?? null,
      }).returning();

      if (!transfer) {
        throw new TransferServiceError('Failed to create transfer');
      }

      await tx.insert(transferItems).values(
        body.items.map((item) => ({
          transferId: transfer.id,
          productId: item.productId,
          uomId: item.uomId,
          quantity: item.quantity.toString(),
          notes: item.notes ?? null,
        }))
      );

      return transfer;
    });

    return transferRepository.findDetailedById(created.id, context.tenantId);
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = transferUpdateSchema.parse(rawBody ?? {});
    const transfer = await transferRepository.findById(id, context.tenantId);
    if (!transfer) {
      return null;
    }
    assertStatus(transfer.status, ['draft'], 'Transfer not found or cannot be edited');

    if (body.fromLocationId && body.fromLocationId !== transfer.fromLocationId) {
      await ensureLocation(body.fromLocationId, context.tenantId);
    }
    if (body.toLocationId && body.toLocationId !== transfer.toLocationId) {
      await ensureLocation(body.toLocationId, context.tenantId);
    }

    const payload: Partial<typeof transfers.$inferInsert> = {};
    if (body.fromLocationId) payload.fromLocationId = body.fromLocationId;
    if (body.toLocationId) payload.toLocationId = body.toLocationId;
    if (body.notes !== undefined) payload.notes = body.notes ?? null;
    if (body.expectedDeliveryDate !== undefined) {
      payload.expectedDeliveryDate = body.expectedDeliveryDate
        ? new Date(body.expectedDeliveryDate)
        : null;
    }

    await transferRepository.updateTransfer(id, context.tenantId, payload);

    return transferRepository.findDetailedById(id, context.tenantId);
  },

  async send(id: string, context: RequestContext) {
    const transfer = await transferRepository.findById(id, context.tenantId);
    if (!transfer) {
      return null;
    }
    assertStatus(transfer.status, ['draft', 'approved'], 'Transfer not found or cannot be sent');

    await transferRepository.updateTransfer(id, context.tenantId, {
      status: 'sent',
      sentBy: context.userId ?? null,
      sentAt: new Date(),
    });

    return transferRepository.findDetailedById(id, context.tenantId);
  },

  async receive(id: string, rawBody: unknown, context: RequestContext) {
    const body = transferReceiveSchema.parse(rawBody ?? {});
    const transfer = await transferRepository.findById(id, context.tenantId);
    if (!transfer) {
      return null;
    }
    assertStatus(transfer.status, ['sent'], 'Transfer not found or not ready for receiving');

    for (const item of body.items) {
      const updated = await transferRepository.updateItemReceived(
        id,
        item.transferItemId,
        item.qtyReceived.toString(),
        item.notes ?? null,
      );
      if (!updated) {
        throw new TransferServiceError(`Transfer item ${item.transferItemId} not found`, 'not_found');
      }
    }

    const totals = await transferRepository.getTotals(id);
    if (parseFloat(totals.totalReceived) >= parseFloat(totals.totalQty)) {
      await transferRepository.updateTransfer(id, context.tenantId, {
        status: 'completed',
        receivedBy: context.userId ?? null,
        receivedAt: new Date(),
        actualDeliveryDate: new Date(),
      });
    }

    return transferRepository.findDetailedById(id, context.tenantId);
  },

  async post(id: string, context: RequestContext) {
    const transfer = await transferRepository.findById(id, context.tenantId);
    if (!transfer) {
      return null;
    }
    assertStatus(transfer.status, ['completed'], 'Transfer not found or not completed');

    const metadata = {
      ...(transfer.metadata as Record<string, unknown> | null ?? {}),
      postedAt: new Date().toISOString(),
    };

    await transferRepository.updateTransfer(id, context.tenantId, { metadata });
    return transferRepository.findDetailedById(id, context.tenantId);
  },
};
