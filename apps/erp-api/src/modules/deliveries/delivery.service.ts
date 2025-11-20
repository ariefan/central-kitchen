import {
  deliveryCreateSchema,
  deliveryUpdateSchema,
  deliveryQuerySchema,
  addressCreateSchema,
  addressQuerySchema,
} from './delivery.schema.js';
import { deliveryRepository } from './delivery.repository.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import {
  deliveries,
  orders,
  customers,
} from '@/config/schema.js';
import { and, eq } from 'drizzle-orm';

export class DeliveryServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureOrder = async (orderId: string, tenantId: string) => {
  const [order] = await db.select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .limit(1);
  if (!order) {
    throw new DeliveryServiceError('Order not found', 'not_found');
  }
  return order;
};

const ensureCustomer = async (customerId: string, tenantId: string) => {
  const [customer] = await db.select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);
  if (!customer) {
    throw new DeliveryServiceError('Customer not found', 'not_found');
  }
  return customer;
};

export const deliveryService = {
  async listDeliveries(rawQuery: unknown, context: RequestContext) {
    const query = deliveryQuerySchema.parse(rawQuery ?? {});
    return deliveryRepository.list(context.tenantId, query);
  },

  async getDelivery(id: string, context: RequestContext) {
    return deliveryRepository.findById(id, context.tenantId);
  },

  async createDelivery(rawBody: unknown, context: RequestContext) {
    const body = deliveryCreateSchema.parse(rawBody ?? {});
    await ensureOrder(body.orderId, context.tenantId);

    const delivery = await deliveryRepository.insertDelivery({
      orderId: body.orderId,
      provider: body.provider ?? null,
      trackingCode: body.trackingCode ?? null,
      fee: body.fee.toString(),
      status: 'requested',
    });

    if (!delivery) {
      throw new DeliveryServiceError('Failed to create delivery');
    }

    return deliveryRepository.findById(delivery.id, context.tenantId);
  },

  async updateDelivery(id: string, rawBody: unknown, context: RequestContext) {
    const body = deliveryUpdateSchema.parse(rawBody ?? {});
    const existing = await deliveryRepository.findById(id, context.tenantId);
    if (!existing) {
      return null;
    }

    const payload: Partial<typeof deliveries.$inferInsert> = {};
    if (body.status !== undefined) payload.status = body.status;
    if (body.provider !== undefined) payload.provider = body.provider ?? null;
    if (body.trackingCode !== undefined) payload.trackingCode = body.trackingCode ?? null;
    if (body.fee !== undefined) payload.fee = body.fee.toString();

    await deliveryRepository.updateDelivery(id, payload);

    if (body.status === 'delivered') {
      await db.update(orders)
        .set({ updatedAt: new Date() })
        .where(eq(orders.id, existing.orderId));
    }

    return deliveryRepository.findById(id, context.tenantId);
  },

  async listAddresses(rawQuery: unknown, context: RequestContext) {
    const query = addressQuerySchema.parse(rawQuery ?? {});
    return deliveryRepository.listAddresses(context.tenantId, query);
  },

  async createAddress(rawBody: unknown, context: RequestContext) {
    const body = addressCreateSchema.parse(rawBody ?? {});
    await ensureCustomer(body.customerId, context.tenantId);

    if (body.isDefault) {
      await deliveryRepository.unsetDefaultAddresses(body.customerId);
    }

    const address = await deliveryRepository.insertAddress({
      customerId: body.customerId,
      label: body.label ?? null,
      line1: body.line1,
      line2: body.line2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country ?? null,
      lat: body.lat ?? null,
      lon: body.lon ?? null,
      isDefault: body.isDefault,
    });

    if (!address) {
      throw new DeliveryServiceError('Failed to create address');
    }

    const [result] = await deliveryRepository.listAddresses(context.tenantId, { customerId: body.customerId })
      .then((list) => list.filter((item) => item.id === address.id));

    return result ?? address;
  },
};
