import { goodsReceiptRepository } from './goods-receipt.repository.js';
import {
  goodsReceiptCreateSchema,
  goodsReceiptQuerySchema,
} from './goods-receipt.schema.js';
import { normalizePaginationParams, buildQueryConditions } from '../shared/pagination.js';
import { generateDocNumber } from '../shared/doc-sequence.js';
import type { RequestContext } from '../../shared/middleware/auth.js';
import { db } from '../../config/database.js';
import {
  goodsReceipts,
  goodsReceiptItems,
  purchaseOrderItems,
  purchaseOrders,
  products,
  uoms
} from '../../config/schema.js';
import { sql, eq, and } from 'drizzle-orm';
import { recordInventoryMovements } from '../shared/ledger.service.js';
import { createCostLayers } from '../shared/cost-layer.service.js';
import { findOrCreateLot } from '../shared/lot.service.js';

export const goodsReceiptService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = goodsReceiptQuerySchema.parse(rawQuery);
    const pagination = normalizePaginationParams({ limit: query.limit, offset: query.offset });

    const filters: Record<string, unknown> = { tenantId: context.tenantId };
    if (query.locationId) filters.locationId = query.locationId;
    if (query.purchaseOrderId) filters.purchaseOrderId = query.purchaseOrderId;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const whereClauses = [];
    if (filters.dateFrom) {
      whereClauses.push(sql`${goodsReceipts.receiptDate} >= ${new Date(filters.dateFrom as string)}`);
    }
    if (filters.dateTo) {
      whereClauses.push(sql`${goodsReceipts.receiptDate} <= ${new Date(filters.dateTo as string)}`);
    }

    const queryConditions = buildQueryConditions({
      filters: {
        tenantId: context.tenantId,
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      },
      search: query.search,
      searchFields: ['receiptNumber', 'notes'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table: goodsReceipts as any,
      allowedSortFields: ['receiptNumber', 'receiptDate', 'createdAt', 'updatedAt'],
    });

    if (whereClauses.length) {
      queryConditions.where = queryConditions.where
        ? sql`${queryConditions.where} AND ${sql.join(whereClauses, sql` AND `)}`
        : sql`${sql.join(whereClauses, sql` AND `)}`;
    }

    const [items, countResult] = await Promise.all([
      goodsReceiptRepository.list(queryConditions),
      goodsReceiptRepository.count(queryConditions.where),
    ]);

    const total = Number(countResult[0]?.value ?? 0);
    const hasNext = pagination.offset + pagination.limit < total;
    const hasPrev = pagination.offset > 0;

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasNext,
      hasPrev,
    };
  },

  async getById(id: string, context: RequestContext) {
    return goodsReceiptRepository.findById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = goodsReceiptCreateSchema.parse(rawBody);
    const receiptNumber = generateDocNumber('GR', { tenantId: context.tenantId });

    const result = await db.transaction(async (tx) => {
      const [receipt] = await tx.insert(goodsReceipts).values({
        tenantId: context.tenantId,
        receiptNumber,
        purchaseOrderId: body.purchaseOrderId ?? null,
        locationId: body.locationId,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        receivedBy: context.userId,
        notes: body.notes ?? null,
      }).returning();

      if (!receipt) {
        throw new Error('Failed to create goods receipt');
      }

      const receiptItems = await Promise.all(body.items.map(async (item) => {
        const [poItem] = await tx.select({
          poItem: purchaseOrderItems,
          product: products,
          uom: uoms,
        })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
          .where(eq(purchaseOrderItems.id, item.purchaseOrderItemId))
          .limit(1);

        if (!poItem?.poItem || !poItem.product || !poItem.uom) {
          throw new Error(`Purchase order item ${item.purchaseOrderItemId} not found`);
        }

        const receivedQty = item.quantity;

        return {
          goodsReceiptId: receipt.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: poItem.poItem.productId,
          uomId: poItem.poItem.uomId,
          unitCost: poItem.poItem.unitPrice,
          quantityOrdered: poItem.poItem.quantity,
          quantityReceived: receivedQty.toString(),
          notes: item.notes ?? null,
        } satisfies typeof goodsReceiptItems.$inferInsert;
      }));

      await tx.insert(goodsReceiptItems).values(receiptItems);

      return {
        ...receipt,
        items: receiptItems,
      };
    });

    return result;
  },

  /**
   * Post goods receipt to inventory
   * Creates lots, stock ledger entries, and FIFO cost layers
   *
   * @see USER_STORIES.md - US-PROC-006: Post GR to Inventory
   * @see FEATURES.md - PROC-006: GR Posting
   */
  async post(id: string, context: RequestContext) {
    return db.transaction(async (tx) => {
      // Get goods receipt header
      const [grHeader] = await tx
        .select()
        .from(goodsReceipts)
        .where(and(eq(goodsReceipts.id, id), eq(goodsReceipts.tenantId, context.tenantId)))
        .limit(1);

      if (!grHeader) {
        return null;
      }

      // Check if already posted
      const metadata = grHeader.metadata as { postedAt?: string } | null;
      if (metadata?.postedAt) {
        throw new Error('Goods receipt already posted');
      }

      // Get goods receipt items
      const grItems = await tx
        .select()
        .from(goodsReceiptItems)
        .where(eq(goodsReceiptItems.goodsReceiptId, id));

      if (!grItems.length) {
        throw new Error('No items found in goods receipt');
      }

      const postingTimestamp = new Date();
      const ledgerEntries = [];
      const costLayerEntries = [];

      // Process each goods receipt item
      for (const grItem of grItems) {
        const quantityReceived = parseFloat(grItem.quantityReceived);
        const unitCost = parseFloat(grItem.unitCost);
        let lotId: string | null = null;

        // Check for lot tracking info in notes (JSONB)
        const itemMetadata = grItem.notes as unknown;
        const lotInfo =
          typeof itemMetadata === 'object' && itemMetadata !== null
            ? (itemMetadata as { lotNumber?: string; expiryDate?: string; manufactureDate?: string })
            : null;

        // Create lot if tracking info provided
        if (lotInfo?.lotNumber) {
          lotId = await findOrCreateLot(
            {
              tenantId: context.tenantId,
              productId: grItem.productId,
              locationId: grHeader.locationId,
              lotNo: lotInfo.lotNumber,
              expiryDate: lotInfo.expiryDate,
              manufactureDate: lotInfo.manufactureDate,
              receivedDate: postingTimestamp,
              notes: typeof grItem.notes === 'string' ? grItem.notes : null,
              metadata: {
                source: 'goods_receipt',
                goodsReceiptId: grHeader.id,
                goodsReceiptNumber: grHeader.receiptNumber,
              },
            },
            tx
          );
        }

        // Prepare ledger entry
        ledgerEntries.push({
          tenantId: context.tenantId,
          productId: grItem.productId,
          locationId: grHeader.locationId,
          lotId,
          type: 'gr',
          qtyDeltaBase: quantityReceived,
          unitCost,
          refType: 'goods_receipt',
          refId: grHeader.id,
          note: `GR ${grHeader.receiptNumber}${grHeader.purchaseOrderId ? ' (from PO)' : ''}`,
          createdBy: context.userId,
          txnTs: postingTimestamp,
          metadata: {
            goodsReceiptItemId: grItem.id,
            lotId,
          },
        });

        // Prepare cost layer entry
        costLayerEntries.push({
          tenantId: context.tenantId,
          productId: grItem.productId,
          locationId: grHeader.locationId,
          lotId,
          qtyRemainingBase: quantityReceived,
          unitCost,
          sourceType: 'goods_receipt',
          sourceId: grHeader.id,
        });
      }

      // Record all ledger entries
      await recordInventoryMovements(ledgerEntries, tx);

      // Create all cost layers
      await createCostLayers(costLayerEntries, tx);

      // Update goods receipt status
      const [updatedReceipt] = await tx
        .update(goodsReceipts)
        .set({
          updatedAt: postingTimestamp,
          metadata: {
            postedAt: postingTimestamp.toISOString(),
            postedBy: context.userId,
          },
        })
        .where(eq(goodsReceipts.id, id))
        .returning();

      // Update PO status to 'receiving' if linked to a PO
      if (grHeader.purchaseOrderId) {
        await tx
          .update(purchaseOrders)
          .set({
            status: 'receiving',
            updatedAt: postingTimestamp,
          })
          .where(
            and(
              eq(purchaseOrders.id, grHeader.purchaseOrderId),
              eq(purchaseOrders.tenantId, context.tenantId)
            )
          );
      }

      return updatedReceipt ?? null;
    });
  },
};
