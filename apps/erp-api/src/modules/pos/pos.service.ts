import { posRepository } from './pos.repository.js';
import {
  shiftInsertSchema,
  shiftCloseSchema,
  drawerMovementInsertSchema,
  shiftQuerySchema,
  movementKinds,
} from './pos.schema.js';
import type { RequestContext } from '../../shared/middleware/auth.js';

export const posService = {
  listShifts(rawQuery: unknown, context: RequestContext) {
    const query = shiftQuerySchema.parse(rawQuery ?? {});
    return posRepository.listShifts(context.tenantId, query);
  },

  async getShift(id: string, context: RequestContext) {
    const shift = await posRepository.findShiftById(id, context.tenantId);
    return shift[0] ?? null;
  },

  async openShift(rawBody: unknown, context: RequestContext) {
    const body = shiftInsertSchema.parse(rawBody);

    const existingOpenShift = await posRepository.listShifts(context.tenantId, {
      locationId: body.locationId,
      status: 'open',
    });

    if (existingOpenShift.length > 0) {
      throw new Error('An open shift already exists for this location');
    }

    const [result] = await posRepository.openShift({
      tenantId: context.tenantId,
      locationId: body.locationId,
      deviceId: body.deviceId ?? null,
      floatAmount: body.floatAmount ?? '0',
      expectedCash: body.floatAmount ?? '0',
      openedBy: context.userId,
    });

    return result;
  },

  async closeShift(id: string, rawBody: unknown, context: RequestContext) {
    const body = shiftCloseSchema.parse(rawBody);
    const shift = await this.getShift(id, context);

    if (!shift) {
      return null;
    }

    const expectedCash = shift.floatAmount ?? '0';
    const variance = (parseFloat(body.actualCash) - parseFloat(expectedCash.toString())).toString();

    const [result] = await posRepository.closeShift(id, context.tenantId, {
      actualCash: body.actualCash,
      expectedCash,
      variance,
      closedBy: context.userId,
      closedAt: new Date(),
    });

    return result;
  },

  async addDrawerMovement(shiftId: string, rawBody: unknown, context: RequestContext) {
    const body = drawerMovementInsertSchema.parse(rawBody);
    if (!movementKinds.includes(body.kind as typeof movementKinds[number])) {
      throw new Error('Invalid drawer movement kind');
    }

    const shift = await this.getShift(shiftId, context);
    if (!shift) {
      return null;
    }

    const [movement] = await posRepository.insertDrawerMovement({
      shiftId,
      kind: body.kind,
      amount: body.amount,
      reason: body.reason ?? null,
      createdBy: context.userId,
    });

    return movement;
  },

  listDrawerMovements(shiftId: string) {
    return posRepository.listDrawerMovements(shiftId);
  },
};
