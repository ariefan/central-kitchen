import { orderRepository } from "./order.repository.js";
import {
  orderCreateSchema,
  orderUpdateSchema,
  orderQuerySchema,
  kitchenStatusUpdateSchema,
  prepStatusUpdateSchema,
  orderPaymentSchema,
} from "./order.schema.js";
import {
  buildQueryConditions,
  normalizePaginationParams,
} from "../shared/pagination.js";
import { generateDocNumber } from "../shared/doc-sequence.js";
import {
  recordInventoryMovements,
  buildReversalMovements,
} from "../shared/ledger.service.js";
import type { RequestContext } from "../../shared/middleware/auth.js";
import { orderItems, orders } from "../../config/schema.js";
import { db } from "../../config/database.js";
import { eq } from "drizzle-orm";

export const orderService = {
  async listOrders(rawQuery: unknown, context: RequestContext) {
    const query = orderQuerySchema.parse(rawQuery);
    const pagination = normalizePaginationParams({
      limit: query.limit,
      offset: query.offset,
    });

    const filters: Record<string, unknown> = { tenantId: context.tenantId };
    if (query.status) filters.status = query.status;
    if (query.channel) filters.channel = query.channel;
    if (query.orderType) filters.orderType = query.orderType;
    if (query.locationId) filters.locationId = query.locationId;
    if (query.customerId) filters.customerId = query.customerId;

    const queryConditions = buildQueryConditions({
      filters,
      search: query.search,
      searchFields: ["orderNumber", "tableNo"],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table: orders as any,
      allowedSortFields: [
        "orderNumber",
        "createdAt",
        "updatedAt",
        "totalAmount",
        "status",
        "kitchenStatus",
      ],
    });

    const [items, total] = await Promise.all([
      orderRepository.list(queryConditions),
      orderRepository.count(queryConditions.where),
    ]);

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  },

  async createOrder(rawBody: unknown, context: RequestContext) {
    const body = orderCreateSchema.parse(rawBody);
    const orderNumber = generateDocNumber("ORD", {
      tenantId: context.tenantId,
    });
    const subtotal = body.items.reduce(
      (sum: number, item: (typeof body.items)[0]) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = subtotal * 0.11;
    const totalAmount = subtotal + taxAmount;

    const newOrder = await orderRepository.create({
      tenantId: context.tenantId,
      orderNumber,
      locationId: body.locationId,
      channel: body.channel,
      type: body.orderType, // Map contract's orderType to DB's type field
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      discountAmount: "0",
      serviceChargeAmount: "0",
      tipsAmount: "0",
      voucherAmount: "0",
      totalAmount: totalAmount.toString(),
      status: "open",
      kitchenStatus: "open", // Database field, not in contract
      createdBy: context.userId,
    });

    if (!newOrder) {
      throw new Error("Order creation failed");
    }

    const items = await orderRepository.createItems(
      body.items.map((item: (typeof body.items)[0]) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        lineTotal: (item.quantity * item.unitPrice).toString(),
        taxAmount: "0",
        discountAmount: "0",
      }))
    );

    return {
      ...newOrder,
      items,
    };
  },

  async getOrderById(id: string, context: RequestContext) {
    const order = await orderRepository.findById(id, context.tenantId);
    if (!order) {
      return null;
    }
    return order;
  },

  async quoteOrder(id: string, context: RequestContext) {
    const order = await orderRepository.findById(id, context.tenantId);
    if (!order) {
      return null;
    }

    return {
      ...order,
      recalculatedAt: new Date(),
      subtotal: order.totalAmount ?? "0.00",
      tax: "0.00",
      total: order.totalAmount ?? "0.00",
      message: "Quote calculated successfully",
    };
  },

  async updateOrder(id: string, rawBody: unknown, context: RequestContext) {
    const body = orderUpdateSchema.parse(rawBody);
    const order = await orderRepository.updateById(id, context.tenantId, body);
    return order;
  },

  async postOrder(id: string, context: RequestContext) {
    const rows = await orderRepository.findOpenWithItems(id, context.tenantId);
    if (!rows.length) {
      return null;
    }

    const order = rows[0]?.order;
    const items = rows.filter((row) => row.item).map((row) => row.item!);

    if (!order || items.length === 0) {
      return null;
    }

    const orderNumber = generateDocNumber("ORD", {
      tenantId: context.tenantId,
      includeTime: true,
    });
    const updated = await orderRepository.updateById(id, context.tenantId, {
      status: "posted",
      orderNumber,
    });

    const ledgerEntries = items.map((item) => ({
      tenantId: context.tenantId,
      productId: item.productId,
      locationId: order.locationId ?? "",
      lotId: null,
      type: "iss",
      qtyDeltaBase: (-parseFloat(item.quantity ?? "0")).toString(),
      unitCost: null,
      refType: "ORDER",
      refId: order.id,
      note: `Order ${orderNumber} - ${item.quantity} units`,
      createdBy: context.userId,
    }));

    await recordInventoryMovements(ledgerEntries);
    return updated;
  },

  async voidOrder(id: string, reason: string, context: RequestContext) {
    const order = await orderRepository.findById(id, context.tenantId);
    if (!order) {
      return null;
    }

    if (order.status === "posted") {
      const ledgerEntries = await orderRepository.findLedgerEntries(
        context.tenantId,
        order.id
      );
      if (ledgerEntries.length) {
        const reversal = buildReversalMovements(ledgerEntries, {
          createdBy: context.userId,
          notePrefix: `Void order ${order.orderNumber} - Reversal: ${reason}`,
        });
        await recordInventoryMovements(reversal);
      }
    }

    return orderRepository.updateById(id, context.tenantId, {
      status: "voided",
    });
  },

  async addPayment(orderId: string, rawBody: unknown, context: RequestContext) {
    const body = orderPaymentSchema.parse(rawBody);
    const order = await orderRepository.findById(orderId, context.tenantId);
    if (!order) {
      return null;
    }

    // TODO: Implement proper multi-tender support - contract expects array of tenders
    // For now, using first tender as a minimal fix
    const firstTender = body.tenders[0];
    if (!firstTender) {
      throw new Error("At least one payment tender is required");
    }

    return orderRepository.insertPayment({
      orderId,
      tender: firstTender.paymentMethod,
      amount: firstTender.amount.toString(),
      reference: firstTender.transactionRef ?? null,
      change: firstTender.changeGiven?.toString() ?? "0",
      createdBy: context.userId,
    });
  },

  async listPayments(orderId: string, context: RequestContext) {
    const order = await orderRepository.findById(orderId, context.tenantId);
    if (!order) {
      return null;
    }

    return orderRepository.listPayments(orderId);
  },

  async updateKitchenStatus(
    orderId: string,
    rawBody: unknown,
    context: RequestContext
  ) {
    const body = kitchenStatusUpdateSchema.parse(rawBody);
    const order = await orderRepository.findById(orderId, context.tenantId);
    if (!order) {
      return null;
    }

    const validTransitions: Record<string, string[]> = {
      open: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["served"],
      served: [],
      cancelled: [],
    };

    if (
      order.kitchenStatus &&
      !validTransitions[order.kitchenStatus]?.includes(body.kitchenStatus)
    ) {
      throw new Error(
        `Cannot transition from ${order.kitchenStatus} to ${body.kitchenStatus}`
      );
    }

    const updateData: Record<string, unknown> = {
      kitchenStatus: body.kitchenStatus,
      updatedAt: new Date(),
    };

    if (body.notes) {
      const metadata = (order as Record<string, unknown>).metadata ?? {};
      updateData.metadata = {
        ...metadata,
        kitchenNotes: body.notes,
        lastKitchenUpdateAt: new Date(),
      };
    }

    return orderRepository.updateById(orderId, context.tenantId, updateData);
  },

  async updateItemPrepStatus(
    itemId: string,
    rawBody: unknown,
    context: RequestContext
  ) {
    const body = prepStatusUpdateSchema.parse(rawBody);
    const record = await orderRepository.getOrderItemWithOrder(
      itemId,
      context.tenantId
    );
    if (!record?.orderItem || !record?.order) {
      return null;
    }

    const validTransitions: Record<string, string[]> = {
      queued: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["served"],
      served: [],
      cancelled: [],
    };

    if (
      !validTransitions[record.orderItem.prepStatus]?.includes(body.prepStatus)
    ) {
      throw new Error(
        `Cannot transition from ${record.orderItem.prepStatus} to ${body.prepStatus}`
      );
    }

    const [updatedItem] = await db
      .update(orderItems)
      .set({
        prepStatus: body.prepStatus,
        station: body.station ?? record.orderItem.station,
        notes: body.notes ?? record.orderItem.notes,
      })
      .where(eq(orderItems.id, itemId))
      .returning();

    const allItems = await orderRepository.listOrderItems(record.order.id);
    const anyPreparing = allItems.some(
      (item) => item.prepStatus === "preparing"
    );
    const allReady = allItems.every((item) =>
      ["ready", "served", "cancelled"].includes(item.prepStatus ?? "")
    );
    const anyServed = allItems.some((item) => item.prepStatus === "served");

    let newKitchenStatus = record.order.kitchenStatus;
    if (anyServed && record.order.kitchenStatus !== "served") {
      newKitchenStatus = "served";
    } else if (allReady && record.order.kitchenStatus === "preparing") {
      newKitchenStatus = "ready";
    } else if (anyPreparing && record.order.kitchenStatus === "open") {
      newKitchenStatus = "preparing";
    }

    if (newKitchenStatus !== record.order.kitchenStatus) {
      await orderRepository.updateById(record.order.id, context.tenantId, {
        kitchenStatus: newKitchenStatus,
      });
    }

    return {
      item: updatedItem,
      orderKitchenStatus: newKitchenStatus,
    };
  },
};
