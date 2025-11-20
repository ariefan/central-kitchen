/**
 * Lot Service
 *
 * Manages lot tracking for perishable products
 * @see FEATURES.md - PROC-005: Lot Tracking
 */

import { db } from '../../config/database.js';
import { lots } from '../../config/schema.js';
import { eq, and } from 'drizzle-orm';

export type LotInput = {
  tenantId: string;
  productId: string;
  locationId: string;
  lotNo: string;
  expiryDate?: Date | string | null;
  manufactureDate?: Date | string | null;
  receivedDate?: Date;
  notes?: string | null;
  metadata?: unknown;
};

type LotClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Finds an existing lot or creates a new one
 * Lots are unique by (tenantId, productId, locationId, lotNo)
 */
export async function findOrCreateLot(
  input: LotInput,
  client: LotClient = db
): Promise<string> {
  // Try to find existing lot
  const [existingLot] = await client
    .select()
    .from(lots)
    .where(
      and(
        eq(lots.tenantId, input.tenantId),
        eq(lots.productId, input.productId),
        eq(lots.locationId, input.locationId),
        eq(lots.lotNo, input.lotNo)
      )
    )
    .limit(1);

  if (existingLot) {
    return existingLot.id;
  }

  // Create new lot
  const [newLot] = await client
    .insert(lots)
    .values({
      tenantId: input.tenantId,
      productId: input.productId,
      locationId: input.locationId,
      lotNo: input.lotNo,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
      receivedDate: input.receivedDate || new Date(),
      notes: input.notes || null,
      metadata: input.metadata || null,
    })
    .returning();

  if (!newLot) {
    throw new Error(`Failed to create lot ${input.lotNo} for product ${input.productId}`);
  }

  return newLot.id;
}
