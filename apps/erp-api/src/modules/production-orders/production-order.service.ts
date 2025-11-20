import {
  productionOrderQuerySchema,
  productionOrderCreateSchema,
  productionOrderUpdateSchema,
  productionOrderExecuteSchema,
} from './production-order.schema.js';
import { productionOrderRepository } from './production-order.repository.js';
import { generateDocNumber } from '@/modules/shared/doc-sequence.js';
import { recordInventoryMovements } from '@/modules/shared/ledger.service.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import {
  productionOrders,
  recipes,
  locations,
} from '@/config/schema.js';
import { and, eq } from 'drizzle-orm';

export class ProductionOrderServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureRecipe = async (recipeId: string, tenantId: string) => {
  const rows = await db.select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.tenantId, tenantId), eq(recipes.isActive, true)))
    .limit(1);
  if (!rows.length) {
    throw new ProductionOrderServiceError('Recipe not found or inactive', 'not_found');
  }
  return rows[0]!;
};

const ensureLocation = async (locationId: string, tenantId: string) => {
  const rows = await db.select()
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new ProductionOrderServiceError('Location not found', 'not_found');
  }
  return rows[0]!;
};

export const productionOrderService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = productionOrderQuerySchema.parse(rawQuery ?? {});
    return productionOrderRepository.list(context.tenantId, query);
  },

  async getById(id: string, context: RequestContext) {
    const order = await productionOrderRepository.findDetailedById(id, context.tenantId);
    if (!order) {
      return null;
    }

    const plannedQty = Number(order.plannedQtyBase ?? 0);
    const recipeYield = Number(order.recipe?.yieldQtyBase ?? 0);
    const scaleFactor = recipeYield > 0 ? plannedQty / recipeYield : 1;

    const ingredients = await productionOrderRepository.getRecipeIngredients(order.recipeId);

    return {
      ...order,
      scaleFactor,
      ingredients: ingredients.map((ingredient) => ({
        id: ingredient.item.id,
        productId: ingredient.item.productId,
        qtyBase: ingredient.item.qtyBase ?? '0',
        sortOrder: ingredient.item.sortOrder,
        product: ingredient.product ?? null,
        requiredQty: Number(ingredient.item.qtyBase ?? '0') * scaleFactor,
      })),
    };
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = productionOrderCreateSchema.parse(rawBody ?? {});
    await ensureRecipe(body.recipeId, context.tenantId);
    await ensureLocation(body.locationId, context.tenantId);

    const orderNumber = generateDocNumber('PROD', { tenantId: context.tenantId });
    const inserted = await productionOrderRepository.insert({
      tenantId: context.tenantId,
      orderNumber,
      recipeId: body.recipeId,
      locationId: body.locationId,
      plannedQtyBase: body.plannedQtyBase.toString(),
      scheduledAt: new Date(body.scheduledAt),
      status: 'scheduled',
      notes: body.notes ?? null,
      createdBy: context.userId,
    });

    if (!inserted) {
      throw new ProductionOrderServiceError('Failed to create production order');
    }

    return productionOrderRepository.findDetailedById(inserted.id, context.tenantId);
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = productionOrderUpdateSchema.parse(rawBody ?? {});
    const existing = await productionOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'scheduled') {
      return null;
    }

    const payload: Partial<typeof productionOrders.$inferInsert> = {};
    if (body.plannedQtyBase !== undefined) payload.plannedQtyBase = body.plannedQtyBase.toString();
    if (body.scheduledAt) payload.scheduledAt = new Date(body.scheduledAt);
    if (body.notes !== undefined) payload.notes = body.notes ?? null;
    if (body.status) payload.status = body.status;

    await productionOrderRepository.update(id, context.tenantId, payload);
    return productionOrderRepository.findDetailedById(id, context.tenantId);
  },

  async start(id: string, context: RequestContext) {
    const existing = await productionOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'scheduled') {
      return null;
    }

    await productionOrderRepository.update(id, context.tenantId, {
      status: 'in_progress',
      startedAt: new Date(),
      supervisedBy: context.userId ?? null,
    });

    return productionOrderRepository.findDetailedById(id, context.tenantId);
  },

  async complete(id: string, rawBody: unknown, context: RequestContext) {
    const body = productionOrderExecuteSchema.parse(rawBody ?? {});
    const existing = await productionOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'in_progress') {
      return null;
    }

    await productionOrderRepository.update(id, context.tenantId, {
      status: 'completed',
      producedQtyBase: body.actualQtyBase.toString(),
      completedAt: new Date(),
      notes: body.notes ?? existing.notes ?? null,
      supervisedBy: context.userId ?? null,
    });

    const recipeSummary = await productionOrderRepository.getRecipeSummary(existing.recipeId, context.tenantId);
    const ingredients = await productionOrderRepository.getRecipeIngredients(existing.recipeId);
    const recipeYield = Number(recipeSummary?.recipe.yieldQtyBase ?? 0);
    const scaleFactor = recipeYield > 0 ? body.actualQtyBase / recipeYield : 1;

    const consumptionEntries = ingredients.map((ingredient) => ({
      tenantId: context.tenantId,
      productId: ingredient.item.productId,
      locationId: existing.locationId,
      lotId: null,
      type: 'prod_out',
      qtyDeltaBase: (-Number(ingredient.item.qtyBase ?? '0') * scaleFactor).toString(),
      unitCost: null,
      refType: 'PRODUCTION_ORDER',
      refId: existing.id,
      note: `Production order ${existing.orderNumber} ingredient consumption`,
      createdBy: context.userId ?? null,
    }));

    const finishedEntry = recipeSummary?.finishedProduct?.id ? [{
      tenantId: context.tenantId,
      productId: recipeSummary.finishedProduct.id,
      locationId: existing.locationId,
      lotId: null,
      type: 'prod_in',
      qtyDeltaBase: body.actualQtyBase.toString(),
      unitCost: null,
      refType: 'PRODUCTION_ORDER',
      refId: existing.id,
      note: `Production order ${existing.orderNumber} output`,
      createdBy: context.userId ?? null,
    }] : [];

    await recordInventoryMovements([...consumptionEntries, ...finishedEntry]);

    return productionOrderRepository.findDetailedById(id, context.tenantId);
  },

  async cancel(id: string, reason: string | undefined, context: RequestContext) {
    const existing = await productionOrderRepository.findById(id, context.tenantId);
    if (!existing || !['scheduled', 'in_progress', 'on_hold'].includes(existing.status)) {
      return null;
    }

    const metadata = {
      ...(existing.metadata as Record<string, unknown> | null ?? {}),
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
    };

    await productionOrderRepository.update(id, context.tenantId, {
      status: 'cancelled',
      notes: reason ? `${existing.notes ?? ''} - CANCELLED: ${reason}`.trim() : existing.notes,
      metadata,
    });

    return productionOrderRepository.findDetailedById(id, context.tenantId);
  },

  async hold(id: string, reason: string | undefined, context: RequestContext) {
    const existing = await productionOrderRepository.findById(id, context.tenantId);
    if (existing?.status !== 'scheduled') {
      return null;
    }

    const metadata = {
      ...(existing.metadata as Record<string, unknown> | null ?? {}),
      holdReason: reason,
      heldAt: new Date().toISOString(),
    };

    await productionOrderRepository.update(id, context.tenantId, {
      status: 'on_hold',
      notes: reason ? `${existing.notes ?? ''} - ON HOLD: ${reason}`.trim() : existing.notes,
      metadata,
    });

    return productionOrderRepository.findDetailedById(id, context.tenantId);
  },
};
