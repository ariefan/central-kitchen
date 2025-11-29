import {
  requisitionCreateSchema,
  requisitionUpdateSchema,
  requisitionQuerySchema,
  requisitionRejectSchema,
} from "./requisition.schema.js";
import { requisitionRepository } from "./requisition.repository.js";
import type { RequestContext } from "@/shared/middleware/auth.js";
import { db } from "@/config/database.js";
import {
  locations,
  products,
  uoms,
  requisitions,
  requisitionItems,
} from "@/config/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { generateDocNumber } from "@/modules/shared/doc-sequence.js";
import { transferService } from "../transfers/transfer.service.js";

export class RequisitionServiceError extends Error {
  constructor(
    message: string,
    public kind: "bad_request" | "not_found" = "bad_request"
  ) {
    super(message);
  }
}

const ensureLocation = async (locationId: string, tenantId: string) => {
  const rows = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new RequisitionServiceError("Location not found", "not_found");
  }
  return rows[0]!;
};

const ensureProductsExist = async (productIds: string[], tenantId: string) => {
  const unique = Array.from(new Set(productIds));
  if (!unique.length) return;
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, unique)));
  if (rows.length !== unique.length) {
    throw new RequisitionServiceError("One or more products not found");
  }
};

const ensureUomsExist = async (uomIds: string[]) => {
  const unique = Array.from(new Set(uomIds));
  if (!unique.length) return;
  const rows = await db
    .select({ id: uoms.id })
    .from(uoms)
    .where(inArray(uoms.id, unique));
  if (rows.length !== unique.length) {
    throw new RequisitionServiceError("One or more UOMs not found");
  }
};

const assertStatus = (current: string, allowed: string[], message: string) => {
  if (!allowed.includes(current)) {
    throw new RequisitionServiceError(message);
  }
};

export const requisitionService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = requisitionQuerySchema.parse(rawQuery ?? {});
    return requisitionRepository.list(context.tenantId, query);
  },

  async getById(id: string, context: RequestContext) {
    return requisitionRepository.findDetailedById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = requisitionCreateSchema.parse(rawBody ?? {});
    if (body.fromLocationId === body.toLocationId) {
      throw new RequisitionServiceError(
        "Cannot requisition from and to the same location"
      );
    }

    await Promise.all([
      ensureLocation(body.fromLocationId, context.tenantId),
      ensureLocation(body.toLocationId, context.tenantId),
    ]);
    await ensureProductsExist(
      body.items.map((item) => item.productId),
      context.tenantId
    );
    await ensureUomsExist(body.items.map((item) => item.uomId));

    const requisition = await db.transaction(async (tx) => {
      const reqNumber = generateDocNumber("REQ", {
        tenantId: context.tenantId,
      });
      const [created] = await tx
        .insert(requisitions)
        .values({
          tenantId: context.tenantId,
          reqNumber,
          fromLocationId: body.fromLocationId,
          toLocationId: body.toLocationId,
          requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
          requestedBy: context.userId ?? null,
          notes: body.notes ?? null,
        })
        .returning();

      if (!created) {
        throw new RequisitionServiceError("Failed to create requisition");
      }

      await tx.insert(requisitionItems).values(
        body.items.map((item) => ({
          requisitionId: created.id,
          productId: item.productId,
          uomId: item.uomId,
          qtyRequested: item.qtyRequested.toString(),
          notes: item.notes ?? null,
        }))
      );

      return created.id;
    });

    return requisitionRepository.findDetailedById(
      requisition,
      context.tenantId
    );
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = requisitionUpdateSchema.parse(rawBody ?? {});
    const requisition = await requisitionRepository.findById(
      id,
      context.tenantId
    );
    if (!requisition) {
      return null;
    }
    assertStatus(
      requisition.status,
      ["draft"],
      "Requisition not found or cannot be edited"
    );

    if (
      body.fromLocationId &&
      body.fromLocationId !== requisition.fromLocationId
    ) {
      await ensureLocation(body.fromLocationId, context.tenantId);
    }
    if (body.toLocationId && body.toLocationId !== requisition.toLocationId) {
      await ensureLocation(body.toLocationId, context.tenantId);
    }

    const payload: Partial<typeof requisitions.$inferInsert> = {};
    if (body.fromLocationId) payload.fromLocationId = body.fromLocationId;
    if (body.toLocationId) payload.toLocationId = body.toLocationId;
    if (body.requiredDate !== undefined) {
      payload.requiredDate = body.requiredDate
        ? new Date(body.requiredDate)
        : null;
    }
    if (body.notes !== undefined) {
      payload.notes = body.notes ?? null;
    }

    await requisitionRepository.updateRequisition(
      id,
      context.tenantId,
      payload
    );
    return requisitionRepository.findDetailedById(id, context.tenantId);
  },

  async approve(id: string, context: RequestContext) {
    const requisition = await requisitionRepository.findById(
      id,
      context.tenantId
    );
    if (!requisition) {
      return null;
    }
    assertStatus(
      requisition.status,
      ["draft"],
      "Requisition not found or already processed"
    );

    await requisitionRepository.updateRequisition(id, context.tenantId, {
      status: "approved",
      approvedBy: context.userId ?? null,
      approvedAt: new Date(),
    });

    return requisitionRepository.findDetailedById(id, context.tenantId);
  },

  async reject(id: string, rawBody: unknown, context: RequestContext) {
    const body = requisitionRejectSchema.parse(rawBody ?? {});
    const requisition = await requisitionRepository.findById(
      id,
      context.tenantId
    );
    if (!requisition) {
      return null;
    }
    assertStatus(
      requisition.status,
      ["draft"],
      "Requisition not found or already processed"
    );

    await requisitionRepository.updateRequisition(id, context.tenantId, {
      status: "rejected",
      notes: `Rejected: ${body.reason}`,
    });

    return requisitionRepository.findDetailedById(id, context.tenantId);
  },

  async issue(id: string, context: RequestContext) {
    const requisition = await requisitionRepository.findById(
      id,
      context.tenantId
    );
    if (!requisition) {
      return null;
    }
    assertStatus(
      requisition.status,
      ["approved"],
      "Only approved requisitions can be issued"
    );

    // Get detailed requisition with items
    const detailedRequisition = await requisitionRepository.findDetailedById(
      id,
      context.tenantId
    );
    if (!detailedRequisition) {
      throw new RequisitionServiceError("Requisition details not found");
    }

    // Create transfer from requisition
    const transferData = {
      fromLocationId: detailedRequisition.fromLocationId,
      toLocationId: detailedRequisition.toLocationId,
      notes: `Created from requisition ${detailedRequisition.reqNumber}`,
      items: detailedRequisition.items.map((item) => ({
        productId: item.productId,
        uomId: item.uomId,
        quantity: parseFloat(item.qtyRequested),
      })),
    };

    const transfer = await transferService.create(transferData, context);

    // Update requisition with transfer reference
    await requisitionRepository.updateRequisition(id, context.tenantId, {
      transferId: transfer.id,
      issueStatus: "fully_issued",
      issuedDate: new Date(),
    });

    return { requisition: detailedRequisition, transfer };
  },
};
