import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { posShifts, drawerMovements } from '../../config/schema.js';
import { successResponseSchema } from '../../shared/utils/responses.js';

export const movementKinds = ['cash_in', 'cash_out', 'paid_out', 'drop'] as const;

export const shiftInsertSchema = createInsertSchema(posShifts).omit({
  id: true,
  tenantId: true,
  openedAt: true,
  closedAt: true,
});

export const drawerMovementInsertSchema = createInsertSchema(drawerMovements).omit({
  id: true,
  shiftId: true,
  createdAt: true,
});

export const shiftSelectSchema = createSelectSchema(posShifts);
export const drawerMovementSelectSchema = createSelectSchema(drawerMovements);

export const shiftsResponseSchema = successResponseSchema(z.array(shiftSelectSchema.extend({
  location: z.object({
    id: z.string(),
    name: z.string(),
  }),
})));

export const shiftResponseSchema = successResponseSchema(shiftSelectSchema.extend({
  location: z.object({
    id: z.string(),
    name: z.string(),
  }),
}));

export const drawerMovementResponseSchema = successResponseSchema(drawerMovementSelectSchema);
export const drawerMovementsResponseSchema = successResponseSchema(z.array(drawerMovementSelectSchema));

export const shiftCloseSchema = z.object({
  actualCash: z.string(),
  notes: z.string().optional(),
});

export const shiftQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  status: z.enum(['open', 'closed', 'all']).default('all'),
});
