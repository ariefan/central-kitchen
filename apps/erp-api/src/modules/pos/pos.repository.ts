import { db } from '../../config/database.js';
import { posShifts, drawerMovements, locations } from '../../config/schema.js';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';

export const posRepository = {
  listShifts(tenantId: string, filters: { locationId?: string; status?: string }) {
    const whereConditions = [eq(posShifts.tenantId, tenantId)];

    if (filters.locationId) {
      whereConditions.push(eq(posShifts.locationId, filters.locationId));
    }

    if (filters.status === 'open') {
      whereConditions.push(isNull(posShifts.closedAt));
    } else if (filters.status === 'closed') {
      whereConditions.push(sql`${posShifts.closedAt} IS NOT NULL`);
    }

    return db
      .select({
        id: posShifts.id,
        tenantId: posShifts.tenantId,
        locationId: posShifts.locationId,
        deviceId: posShifts.deviceId,
        openedBy: posShifts.openedBy,
        openedAt: posShifts.openedAt,
        closedBy: posShifts.closedBy,
        closedAt: posShifts.closedAt,
        floatAmount: posShifts.floatAmount,
        expectedCash: posShifts.expectedCash,
        actualCash: posShifts.actualCash,
        variance: posShifts.variance,
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(posShifts)
      .leftJoin(locations, eq(posShifts.locationId, locations.id))
      .where(and(...whereConditions))
      .orderBy(desc(posShifts.openedAt));
  },

  findShiftById(id: string, tenantId: string) {
    return db
      .select({
        id: posShifts.id,
        tenantId: posShifts.tenantId,
        locationId: posShifts.locationId,
        deviceId: posShifts.deviceId,
        openedBy: posShifts.openedBy,
        openedAt: posShifts.openedAt,
        closedBy: posShifts.closedBy,
        closedAt: posShifts.closedAt,
        floatAmount: posShifts.floatAmount,
        expectedCash: posShifts.expectedCash,
        actualCash: posShifts.actualCash,
        variance: posShifts.variance,
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(posShifts)
      .leftJoin(locations, eq(posShifts.locationId, locations.id))
      .where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId)))
      .limit(1);
  },

  openShift(data: typeof posShifts.$inferInsert) {
    return db.insert(posShifts).values(data).returning();
  },

  closeShift(id: string, tenantId: string, data: Partial<typeof posShifts.$inferInsert>) {
    return db
      .update(posShifts)
      .set(data)
      .where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId)))
      .returning();
  },

  insertDrawerMovement(data: typeof drawerMovements.$inferInsert) {
    return db.insert(drawerMovements).values(data).returning();
  },

  listDrawerMovements(shiftId: string) {
    return db.select().from(drawerMovements).where(eq(drawerMovements.shiftId, shiftId)).orderBy(desc(drawerMovements.createdAt));
  },
};
