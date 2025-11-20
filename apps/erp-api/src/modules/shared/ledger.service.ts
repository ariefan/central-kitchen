import { db } from '../../config/database.js';
import { stockLedger } from '../../config/schema.js';
import type { InferSelectModel } from 'drizzle-orm';

type StockLedgerRow = InferSelectModel<typeof stockLedger>;

export type LedgerMovementInput = {
  tenantId: string;
  productId: string;
  locationId: string;
  lotId?: string | null;
  type: string;
  qtyDeltaBase: string | number;
  unitCost?: string | number | null;
  refType: string;
  refId: string;
  note?: string | null;
  metadata?: unknown;
  createdBy?: string | null;
  txnTs?: Date;
};

type LedgerClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const normalizeDecimal = (value: string | number | null | undefined) => {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'number' ? value.toString() : value;
};

/**
 * Inserts inventory movements into stock_ledger using db or a transaction client.
 */
export async function recordInventoryMovements(
  entries: LedgerMovementInput[],
  client: LedgerClient = db
) {
  if (!entries.length) {
    return [];
  }

  const payload = entries.map((entry) => ({
    tenantId: entry.tenantId,
    productId: entry.productId,
    locationId: entry.locationId,
    lotId: entry.lotId ?? null,
    type: entry.type,
    qtyDeltaBase: normalizeDecimal(entry.qtyDeltaBase)!,
    unitCost: normalizeDecimal(entry.unitCost),
    refType: entry.refType,
    refId: entry.refId,
    note: entry.note ?? null,
    metadata: entry.metadata ?? null,
    createdBy: entry.createdBy ?? null,
    txnTs: entry.txnTs ?? new Date(),
  }));

  return client.insert(stockLedger).values(payload).returning();
}

/**
 * Builds reversal entries for a set of ledger rows.
 */
export function buildReversalMovements(
  entries: StockLedgerRow[],
  options: {
    createdBy?: string | null;
    notePrefix?: string;
    overrideRefId?: string;
    overrideType?: string;
  } = {}
): LedgerMovementInput[] {
  const { createdBy, notePrefix, overrideRefId, overrideType } = options;

  return entries.map((entry) => ({
    tenantId: entry.tenantId,
    productId: entry.productId,
    locationId: entry.locationId,
    lotId: entry.lotId,
    type: overrideType ?? `${entry.type}_rev`,
    qtyDeltaBase: (-Number(entry.qtyDeltaBase ?? 0)).toString(),
    unitCost: entry.unitCost,
    refType: entry.refType,
    refId: overrideRefId ?? entry.refId,
    note: notePrefix ? `${notePrefix}${entry.note ? ` ${entry.note}` : ''}` : entry.note,
    metadata: entry.metadata,
    createdBy: createdBy ?? entry.createdBy ?? null,
    txnTs: new Date(),
  }));
}
