import {
  purchaseOrderCreateSchema,
  purchaseOrderUpdateSchema,
  purchaseOrderQuerySchema,
} from './purchase-order.schema.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';
import { buildQueryConditions, normalizePaginationParams } from '../shared/pagination.js';
import { generateDocNumber } from '../shared/doc-sequence.js';
import type { RequestContext } from '../../shared/middleware/auth.js';
import { purchaseOrders } from '../../config/schema.js';

export const purchaseOrderService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = purchaseOrderQuerySchema.parse(rawQuery);
    const pagination = normalizePaginationParams({ limit: query.limit, offset: query.offset });

    const filters: Record<string, unknown> = { tenantId: context.tenantId };
    if (query.status) filters.status = query.status;
    if (query.supplierId) filters.supplierId = query.supplierId;
    if (query.locationId) filters.locationId = query.locationId;

    const queryConditions = buildQueryConditions({
      filters,
      search: query.search,
      searchFields: ['orderNumber', 'notes'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table: purchaseOrders as any,
      allowedSortFields: ['orderNumber', 'orderDate', 'createdAt', 'updatedAt', 'totalAmount', 'status', 'expectedDeliveryDate'],
    });

    const [items, total] = await Promise.all([
      purchaseOrderRepository.list(queryConditions),
      purchaseOrderRepository.count(queryConditions.where),
    ]);

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  },

  async getById(id: string, context: RequestContext) {
    const result = await purchaseOrderRepository.findWithItems(id, context.tenantId);
    return result;
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = purchaseOrderCreateSchema.parse(rawBody);
    const orderNumber = generateDocNumber('PO', { tenantId: context.tenantId });

    let subtotal = 0;
    let totalTax = 0;

    const itemsPayload = body.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discount || 0;
      const lineSubtotal = lineTotal - lineDiscount;
      const lineTax = lineSubtotal * ((item.taxRate || 0) / 100);
      const finalLineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      totalTax += lineTax;

      return {
        productId: item.productId,
        quantity: item.quantity.toString(),
        uomId: item.uomId,
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount ?? 0).toString(),
        taxRate: (item.taxRate ?? 0).toString(),
        lineTotal: finalLineTotal.toString(),
        notes: item.notes ?? null,
      };
    });

    const totalAmount = subtotal + totalTax;

    const order = await purchaseOrderRepository.create({
      tenantId: context.tenantId,
      orderNumber,
      supplierId: body.supplierId,
      locationId: body.locationId,
      expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
      status: 'draft',
      subtotal: subtotal.toString(),
      taxAmount: totalTax.toString(),
      totalAmount: totalAmount.toString(),
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      createdBy: context.userId,
    });

    if (!order) {
      throw new Error('Failed to create purchase order');
    }

    const items = await purchaseOrderRepository.insertItems(
      itemsPayload.map((item) => ({
        ...item,
        purchaseOrderId: order.id,
      }))
    );

    return { ...order, items };
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = purchaseOrderUpdateSchema.parse(rawBody);
    const existing = await purchaseOrderRepository.findById(id, context.tenantId);
    if (!existing) {
      return null;
    }
    if (existing.status !== 'draft') {
      throw new Error(`Cannot update ${existing.status} purchase order. Only draft purchase orders can be updated`);
    }

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      ...body,
      expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : undefined,
    });
  },

  async submit(id: string, context: RequestContext) {
    const existing = await purchaseOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'draft') {
      return null;
    }

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      status: 'pending_approval',
    });
  },

  async approve(id: string, context: RequestContext) {
    const existing = await purchaseOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'pending_approval') {
      return null;
    }

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      status: 'approved',
      approvedBy: context.userId,
      approvedAt: new Date(),
    });
  },

  async reject(id: string, reason: string, context: RequestContext) {
    const existing = await purchaseOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'pending_approval') {
      return null;
    }

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      status: 'rejected',
      metadata: {
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });
  },

  async markSent(id: string, body: { notes?: string; sentVia?: string }, context: RequestContext) {
    const order = await purchaseOrderRepository.findById(id, context.tenantId);
    if (order?.status !== 'approved') {
      return null;
    }

    const sentTimestamp = new Date();
    const existingMetadata = (order.metadata as Record<string, unknown> | null) ?? {};
    const updatedMetadata = {
      ...existingMetadata,
      sent: {
        by: context.userId,
        via: body.sentVia ?? 'email',
        at: sentTimestamp.toISOString(),
      },
    };

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      status: 'sent',
      notes: body.notes ?? order.notes ?? null,
      metadata: updatedMetadata,
      updatedAt: sentTimestamp,
    });
  },

  async cancel(id: string, reason: string, context: RequestContext) {
    const order = await purchaseOrderRepository.findById(id, context.tenantId);
    if (!order || ['received', 'completed'].includes(order.status)) {
      return null;
    }

    return purchaseOrderRepository.updateById(id, context.tenantId, {
      status: 'cancelled',
      notes: `Cancelled: ${reason}`,
    });
  },
};
