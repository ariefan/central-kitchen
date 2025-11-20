/**
 * Cost Layer Service
 *
 * Manages FIFO cost layers for inventory costing
 * @see FEATURES.md - INV-003: FIFO Costing
 */

import { db } from '../../config/database.js';
import { costLayers } from '../../config/schema.js';

export type CostLayerInput = {
  tenantId: string;
  productId: string;
  locationId: string;
  lotId?: string | null;
  qtyRemainingBase: string | number;
  unitCost: string | number;
  sourceType: string;
  sourceId: string;
};

type CostLayerClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const normalizeDecimal = (value: string | number) => {
  return typeof value === 'number' ? value.toString() : value;
};

/**
 * Creates FIFO cost layers for received inventory
 * Used when posting goods receipts, transfers in, production output
 */
export async function createCostLayers(
  entries: CostLayerInput[],
  client: CostLayerClient = db
) {
  if (!entries.length) {
    return [];
  }

  const payload = entries.map((entry) => ({
    tenantId: entry.tenantId,
    productId: entry.productId,
    locationId: entry.locationId,
    lotId: entry.lotId ?? null,
    qtyRemainingBase: normalizeDecimal(entry.qtyRemainingBase),
    unitCost: normalizeDecimal(entry.unitCost),
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
  }));

  return client.insert(costLayers).values(payload).returning();
}
