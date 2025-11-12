import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { returnOrders, returnOrderItems, products, customers, suppliers, locations, uoms, lots, stockLedger } from '../../../../config/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth';

type ReturnOrder = typeof returnOrders.$inferSelect;

// Return Item schemas
const returnItemSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  uomId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Return Order schemas
const returnOrderCreateSchema = z.object({
  returnType: z.enum(['customer', 'supplier']),
  referenceType: z.enum(['ORDER', 'PO']).optional(),
  referenceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  reason: z.string().min(1),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(returnItemSchema).min(1, 'At least one item is required'),
}).refine(
  (data) => {
    if (data.returnType === 'customer' && !data.customerId) {
      return false;
    }
    if (data.returnType === 'supplier' && !data.supplierId) {
      return false;
    }
    return true;
  },
  {
    message: "CustomerId is required for customer returns, SupplierId is required for supplier returns",
  }
);

const returnOrderUpdateSchema = z.object({
  reason: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

type ReturnQuery = {
  returnType?: string;
  status?: string;
  customerId?: string;
  supplierId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

// Response schemas
const returnOrderResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    returnNumber: z.string(),
    returnType: z.enum(['customer', 'supplier']),
    referenceType: z.enum(['ORDER', 'PO']).nullable(),
    referenceId: z.string().nullable(),
    customerId: z.string().nullable(),
    supplierId: z.string().nullable(),
    locationId: z.string(),
    reason: z.string(),
    totalAmount: z.string().nullable(),
    status: z.enum(['requested', 'approved', 'rejected', 'completed']),
    returnDate: z.date(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.date().nullable(),
    customer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
    }).nullable(),
    supplier: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    items: z.array(z.any()),
  }),
  message: z.string(),
});

const returnOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({
    id: z.string(),
    returnNumber: z.string(),
    returnType: z.enum(['customer', 'supplier']),
    referenceType: z.enum(['ORDER', 'PO']).nullable(),
    referenceId: z.string().nullable(),
    customerId: z.string().nullable(),
    supplierId: z.string().nullable(),
    locationId: z.string(),
    reason: z.string(),
    totalAmount: z.string().nullable(),
    status: z.enum(['requested', 'approved', 'rejected', 'completed']),
    returnDate: z.date(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.date().nullable(),
    customer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
    }).nullable(),
    supplier: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    items: z.array(z.any()),
  })),
  message: z.string(),
});

export function returnRoutes(fastify: FastifyInstance) {
  // GET /api/v1/returns - List all return orders
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all return orders with items',
        tags: ['Returns'],
        querystring: z.object({
          returnType: z.enum(['customer', 'supplier']).optional(),
          status: z.enum(['requested', 'approved', 'rejected', 'completed']).optional(),
          customerId: z.string().uuid().optional(),
          supplierId: z.string().uuid().optional(),
          locationId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
          search: z.string().optional(),
        }),
        response: {
          200: returnOrdersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { returnType, status, customerId, supplierId, locationId, dateFrom, dateTo, search } = request.query as ReturnQuery;

      let whereConditions = [eq(returnOrders.tenantId, tenantId)];

      if (returnType) {
        whereConditions.push(eq(returnOrders.returnType, returnType));
      }

      if (status) {
        whereConditions.push(eq(returnOrders.status, status));
      }

      if (customerId) {
        whereConditions.push(eq(returnOrders.customerId, customerId));
      }

      if (supplierId) {
        whereConditions.push(eq(returnOrders.supplierId, supplierId));
      }

      if (locationId) {
        whereConditions.push(eq(returnOrders.locationId, locationId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${returnOrders.returnDate} >= ${dateFrom}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${returnOrders.returnDate} <= ${dateTo}`);
      }

      if (search) {
        whereConditions.push(sql`(return_orders.return_number ILIKE ${'%' + search + '%'} OR return_orders.reason ILIKE ${'%' + search + '%'})`);
      }

      const allReturns = await db.select({
        returnOrder: returnOrders,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
      })
        .from(returnOrders)
        .leftJoin(customers, eq(returnOrders.customerId, customers.id))
        .leftJoin(suppliers, eq(returnOrders.supplierId, suppliers.id))
        .leftJoin(locations, eq(returnOrders.locationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(desc(returnOrders.returnDate));

      // Get items for each return order
      const returnsWithItems = await Promise.all(
        allReturns.map(async (returnRow) => {
          const items = await db.select({
            item: returnOrderItems,
            product: {
              id: products.id,
              name: products.name,
              sku: products.sku,
            },
            uom: {
              id: uoms.id,
              code: uoms.code,
              name: uoms.name,
            },
            lot: {
              id: lots.id,
              lotNo: lots.lotNo,
              expiryDate: lots.expiryDate,
            },
          })
            .from(returnOrderItems)
            .leftJoin(products, eq(returnOrderItems.productId, products.id))
            .leftJoin(uoms, eq(returnOrderItems.uomId, uoms.id))
            .leftJoin(lots, eq(returnOrderItems.lotId, lots.id))
            .where(eq(returnOrderItems.returnOrderId, returnRow.returnOrder.id))
            .orderBy(returnOrderItems.createdAt);

          return {
            ...returnRow.returnOrder,
            customer: returnRow.customer,
            supplier: returnRow.supplier,
            location: returnRow.location,
            items,
          };
        })
      );

      return reply.send(createSuccessResponse(returnsWithItems, 'Return orders retrieved successfully'));
    }
  );

  // GET /api/v1/returns/:id - Get return order by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get return order by ID with full item list',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const returnOrderData = await db.select({
        returnOrder: returnOrders,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
      })
        .from(returnOrders)
        .leftJoin(customers, eq(returnOrders.customerId, customers.id))
        .leftJoin(suppliers, eq(returnOrders.supplierId, suppliers.id))
        .leftJoin(locations, eq(returnOrders.locationId, locations.id))
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!returnOrderData.length) {
        return createNotFoundError('Return order not found', reply);
      }

      const returnOrderRecord = returnOrderData[0]!;

      // Get detailed items with product and UOM information
      const items = await db.select({
        item: returnOrderItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        uom: {
          id: uoms.id,
          code: uoms.code,
          name: uoms.name,
        },
        lot: {
          id: lots.id,
          lotNo: lots.lotNo,
          expiryDate: lots.expiryDate,
        },
      })
        .from(returnOrderItems)
        .leftJoin(products, eq(returnOrderItems.productId, products.id))
        .leftJoin(uoms, eq(returnOrderItems.uomId, uoms.id))
        .leftJoin(lots, eq(returnOrderItems.lotId, lots.id))
        .where(eq(returnOrderItems.returnOrderId, request.params.id))
        .orderBy(returnOrderItems.createdAt);

      const returnOrderWithItems = {
        ...returnOrderRecord.returnOrder,
        customer: returnOrderRecord.customer,
        supplier: returnOrderRecord.supplier,
        location: returnOrderRecord.location,
        items,
      };

      return reply.send(createSuccessResponse(returnOrderWithItems, 'Return order retrieved successfully'));
    }
  );

  // POST /api/v1/returns - Create new return order
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new return order with items',
        tags: ['Returns'],
        body: returnOrderCreateSchema,
        response: {
          201: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof returnOrderCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify location exists and belongs to tenant
      const locationCheck = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

      if (!locationCheck.length) {
        return createNotFoundError('Location not found', reply);
      }

      // Verify customer/supplier exists and belongs to tenant (if provided)
      if (request.body.returnType === 'customer' && request.body.customerId) {
        const customerCheck = await db.select()
          .from(customers)
          .where(and(
            eq(customers.id, request.body.customerId),
            eq(customers.tenantId, tenantId)
          ))
          .limit(1);

        if (!customerCheck.length) {
          return createNotFoundError('Customer not found', reply);
        }
      }

      if (request.body.returnType === 'supplier' && request.body.supplierId) {
        const supplierCheck = await db.select()
          .from(suppliers)
          .where(and(
            eq(suppliers.id, request.body.supplierId),
            eq(suppliers.tenantId, tenantId)
          ))
          .limit(1);

        if (!supplierCheck.length) {
          return createNotFoundError('Supplier not found', reply);
        }
      }

      // Verify all product IDs exist and belong to tenant
      const productIds = request.body.items.map(item => item.productId);
      const productCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId)
        ));

      const foundProductIds = new Set(productCheck.map(p => p.id));
      const missingProducts = productIds.filter(id => !foundProductIds.has(id));

      if (missingProducts.length > 0) {
        return createBadRequestError('One or more products not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        // Generate return number
        const returnNumberResult = await tx.execute(sql`
          SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM '\\d+$') AS INTEGER)), 0) + 1 as next_number
          FROM ${returnOrders}
          WHERE ${returnOrders.tenantId} = ${tenantId}
          AND ${returnOrders.returnNumber} LIKE 'RET-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%'
        `);

        const rawNextNumber = returnNumberResult.rows[0]?.next_number;
        const parsedNextNumber = typeof rawNextNumber === 'number'
          ? rawNextNumber
          : typeof rawNextNumber === 'string'
            ? Number.parseInt(rawNextNumber, 10)
            : 1;
        const safeNextNumber = Number.isNaN(parsedNextNumber) ? 1 : parsedNextNumber;
        const returnNumber = `RET-${new Date().getFullYear()}-${String(safeNextNumber).padStart(5, '0')}`;

        // Create return order
        const returnOrderInsert: typeof returnOrders.$inferInsert = {
          tenantId,
          returnNumber,
          returnType: request.body.returnType,
          referenceType: request.body.referenceType ?? null,
          referenceId: request.body.referenceId ?? null,
          customerId: request.body.customerId ?? null,
          supplierId: request.body.supplierId ?? null,
          locationId: request.body.locationId,
          reason: request.body.reason,
          totalAmount: request.body.totalAmount?.toString() ?? null,
          notes: request.body.notes ?? null,
          createdBy: getUserId(request) ?? null,
        };

        const [returnOrder] = await tx.insert(returnOrders)
          .values(returnOrderInsert)
          .returning();

        // Insert return items
        const itemsToInsert: typeof returnOrderItems.$inferInsert[] = request.body.items.map((item) => ({
          returnOrderId: returnOrder!.id,
          productId: item.productId,
          lotId: item.lotId ?? null,
          uomId: item.uomId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice?.toString() ?? '0.00',
          reason: item.reason ?? null,
          notes: item.notes ?? null,
        }));

        const insertedItems = await tx.insert(returnOrderItems)
          .values(itemsToInsert)
          .returning();

        // Get location details for response
        const [locationDetails] = await tx.select({
          id: locations.id,
          name: locations.name,
          code: locations.code,
        })
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

        // Get customer details for response (if applicable)
        let customerDetails = null;
        if (request.body.customerId) {
          const [customer] = await tx.select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
          })
          .from(customers)
          .where(and(
            eq(customers.id, request.body.customerId),
            eq(customers.tenantId, tenantId)
          ))
          .limit(1);
          customerDetails = customer ?? null;
        }

        // Get supplier details for response (if applicable)
        let supplierDetails = null;
        if (request.body.supplierId) {
          const [supplier] = await tx.select({
            id: suppliers.id,
            name: suppliers.name,
            code: suppliers.code,
          })
          .from(suppliers)
          .where(and(
            eq(suppliers.id, request.body.supplierId),
            eq(suppliers.tenantId, tenantId)
          ))
          .limit(1);
          supplierDetails = supplier ?? null;
        }

        return {
          ...returnOrder!,
          location: locationDetails ?? null,
          customer: customerDetails,
          supplier: supplierDetails,
          items: insertedItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Return order created successfully'));
    }
  );

  // PATCH /api/v1/returns/:id - Update return order
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update return order basic information',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        body: returnOrderUpdateSchema,
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof returnOrderUpdateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if return order exists and belongs to tenant
      const existingReturn = await db.select()
        .from(returnOrders)
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingReturn.length) {
        return createNotFoundError('Return order not found', reply);
      }

      // Prevent updates if already processed
      if (['approved', 'rejected', 'completed'].includes(existingReturn[0]!.status)) {
        return createBadRequestError('Cannot update return order in ' + existingReturn[0]!.status + ' status', reply);
      }

      const updatePayload: Partial<typeof returnOrders.$inferInsert> & { updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (request.body.reason !== undefined) {
        updatePayload.reason = request.body.reason;
      }

      if (request.body.totalAmount !== undefined) {
        updatePayload.totalAmount = request.body.totalAmount.toString();
      }

      if (request.body.notes !== undefined) {
        updatePayload.notes = request.body.notes ?? null;
      }

      const result = await db.update(returnOrders)
        .set(updatePayload)
        .where(and(eq(returnOrders.id, request.params.id), eq(returnOrders.tenantId, tenantId)))
        .returning();

      if (!result) {
        return createNotFoundError('Return order not found', reply);
      }

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result[0]!.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get customer details for response (if applicable)
      let customerDetails = null;
      if (result[0]!.customerId) {
        const [customer] = await db.select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, result[0]!.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);
        customerDetails = customer ?? null;
      }

      // Get supplier details for response (if applicable)
      let supplierDetails = null;
      if (result[0]!.supplierId) {
        const [supplier] = await db.select({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        })
        .from(suppliers)
        .where(and(
          eq(suppliers.id, result[0]!.supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
        supplierDetails = supplier ?? null;
      }

      // Get return items for response
      const returnItems = await db.select()
        .from(returnOrderItems)
        .where(eq(returnOrderItems.returnOrderId, request.params.id));

      const responseWithDetails = {
        ...result[0]!,
        location: locationDetails ?? null,
        customer: customerDetails,
        supplier: supplierDetails,
        items: returnItems,
      };

      return reply.send(createSuccessResponse(responseWithDetails, 'Return order updated successfully'));
    }
  );

  // POST /api/v1/returns/:id/approve - Approve return order
  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve return order and process return',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const returnOrderData = await db.select()
        .from(returnOrders)
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!returnOrderData.length) {
        return createNotFoundError('Return order not found', reply);
      }

      const returnOrder = returnOrderData[0]!;

      if (returnOrder.status !== 'requested') {
        return createBadRequestError('Return order can only be approved from requested status', reply);
      }

      const result = await db.transaction(async (tx): Promise<ReturnOrder | null> => {
        const updatedReturn = await tx.update(returnOrders)
          .set({
            status: 'approved',
            approvedBy: getUserId(request) ?? null,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(returnOrders.id, request.params.id), eq(returnOrders.tenantId, tenantId)))
          .returning();

        // TODO: Create stock ledger entries for returned items
        // This would depend on business rules for handling returns
        // Customer returns: add stock back
        // Supplier returns: remove stock (if already received)

        return updatedReturn[0] ?? null;
      });

      if (!result) {
        return createNotFoundError('Return order not found', reply);
      }

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get customer details for response (if applicable)
      let customerDetails = null;
      if (result.customerId) {
        const [customer] = await db.select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, result.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);
        customerDetails = customer ?? null;
      }

      // Get supplier details for response (if applicable)
      let supplierDetails = null;
      if (result.supplierId) {
        const [supplier] = await db.select({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        })
        .from(suppliers)
        .where(and(
          eq(suppliers.id, result.supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
        supplierDetails = supplier ?? null;
      }

      // Get return items for response
      const returnItems = await db.select()
        .from(returnOrderItems)
        .where(eq(returnOrderItems.returnOrderId, request.params.id));

      const responseWithDetails = {
        ...result,
        location: locationDetails ?? null,
        customer: customerDetails,
        supplier: supplierDetails,
        items: returnItems,
      };

      return reply.send(createSuccessResponse(responseWithDetails, 'Return order approved successfully'));
    }
  );

  // POST /api/v1/returns/:id/reject - Reject return order
  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject return order',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Rejection reason is required'),
        }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: { reason: string }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const returnOrderData = await db.select()
        .from(returnOrders)
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!returnOrderData.length) {
        return createNotFoundError('Return order not found', reply);
      }

      const returnOrder = returnOrderData[0]!;

      if (returnOrder.status !== 'requested') {
        return createBadRequestError('Return order can only be rejected from requested status', reply);
      }

      const result = await db.update(returnOrders)
        .set({
          status: 'rejected',
          approvedBy: getUserId(request) ?? null,
          approvedAt: new Date(),
          notes: `Rejected: ${request.body.reason}`,
          updatedAt: new Date(),
        })
        .where(and(eq(returnOrders.id, request.params.id), eq(returnOrders.tenantId, tenantId)))
        .returning();

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result[0]!.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get customer details for response (if applicable)
      let customerDetails = null;
      if (result[0]!.customerId) {
        const [customer] = await db.select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, result[0]!.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);
        customerDetails = customer ?? null;
      }

      // Get supplier details for response (if applicable)
      let supplierDetails = null;
      if (result[0]!.supplierId) {
        const [supplier] = await db.select({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        })
        .from(suppliers)
        .where(and(
          eq(suppliers.id, result[0]!.supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
        supplierDetails = supplier ?? null;
      }

      // Get return items for response
      const returnItems = await db.select()
        .from(returnOrderItems)
        .where(eq(returnOrderItems.returnOrderId, request.params.id));

      const responseWithDetails = {
        ...result[0]!,
        location: locationDetails ?? null,
        customer: customerDetails,
        supplier: supplierDetails,
        items: returnItems,
      };

      return reply.send(createSuccessResponse(responseWithDetails, 'Return order rejected successfully'));
    }
  );

  // POST /api/v1/returns/:id/post - Post return order (create ledger entries)
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post return order to create ledger entries',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if return order exists and is approved
      const returnOrderData = await db
        .select({
          returnOrder: returnOrders,
          items: returnOrderItems,
        })
        .from(returnOrders)
        .leftJoin(returnOrderItems, eq(returnOrders.id, returnOrderItems.returnOrderId))
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId),
          eq(returnOrders.status, 'approved')
        ));

      if (!returnOrderData.length) {
        return createNotFoundError('Return order not found or not approved', reply);
      }

      const returnOrder = returnOrderData[0]!.returnOrder;
      const items = returnOrderData
        .filter(row => row.items)
        .map(row => row.items!);

      if (items.length === 0) {
        return createNotFoundError('Return order has no items', reply);
      }

      // Create ledger entries for returns
      const ledgerEntries = [];

      for (const item of items) {
        const quantity = parseFloat(item.quantity);

        // For customer returns: add stock back (positive entry)
        // For supplier returns: create issue entry (negative entry)
        const ledgerType = returnOrder.returnType === 'customer' ? 'cust_ret' : 'sup_ret';
        const qtyDelta = returnOrder.returnType === 'customer'
          ? quantity.toString()  // Add stock back for customer returns
          : (-quantity).toString(); // Issue stock for supplier returns

        ledgerEntries.push({
          tenantId,
          productId: item.productId,
          locationId: returnOrder.locationId,
          lotId: item.lotId ?? null,
          type: ledgerType,
          qtyDeltaBase: qtyDelta,
          unitCost: item.unitPrice ? item.unitPrice.toString() : null,
          refType: 'RETURN_ORDER',
          refId: returnOrder.id,
          note: `Return Order ${returnOrder.returnNumber} - ${item.reason ?? 'Return'} ${item.quantity} units`,
          createdBy: userId,
        });
      }

      // Insert all ledger entries
      if (ledgerEntries.length > 0) {
        try {
          await db.insert(stockLedger).values(ledgerEntries);
        } catch (error) {
          console.error('Return ledger insertion error:', error);
          return createBadRequestError('Failed to create ledger entries', reply);
        }
      }

      // Update return order status to posted
      const result = await db.update(returnOrders)
        .set({
          status: 'posted',
          updatedAt: new Date(),
        })
        .where(and(eq(returnOrders.id, request.params.id), eq(returnOrders.tenantId, tenantId)))
        .returning();

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result[0]!.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get customer details for response (if applicable)
      let customerDetails = null;
      if (result[0]!.customerId) {
        const [customer] = await db.select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, result[0]!.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);
        customerDetails = customer ?? null;
      }

      // Get supplier details for response (if applicable)
      let supplierDetails = null;
      if (result[0]!.supplierId) {
        const [supplier] = await db.select({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        })
        .from(suppliers)
        .where(and(
          eq(suppliers.id, result[0]!.supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
        supplierDetails = supplier ?? null;
      }

      // Get return items for response
      const returnItems = await db.select()
        .from(returnOrderItems)
        .where(eq(returnOrderItems.returnOrderId, request.params.id));

      const responseWithDetails = {
        ...result[0]!,
        location: locationDetails ?? null,
        customer: customerDetails,
        supplier: supplierDetails,
        items: returnItems,
      };

      return reply.send(createSuccessResponse(responseWithDetails, 'Return order posted successfully'));
    }
  );

  // POST /api/v1/returns/:id/complete - Complete return order processing
  fastify.post(
    '/:id/complete',
    {
      schema: {
        description: 'Mark return order as completed',
        tags: ['Returns'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: returnOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const returnOrderData = await db.select()
        .from(returnOrders)
        .where(and(
          eq(returnOrders.id, request.params.id),
          eq(returnOrders.tenantId, tenantId)
        ))
        .limit(1);

      if (!returnOrderData.length) {
        return createNotFoundError('Return order not found', reply);
      }

      const returnOrder = returnOrderData[0]!;

      if (returnOrder.status !== 'approved') {
        return createBadRequestError('Return order can only be completed from approved status', reply);
      }

      const result = await db.update(returnOrders)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(and(eq(returnOrders.id, request.params.id), eq(returnOrders.tenantId, tenantId)))
        .returning();

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result[0]!.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get customer details for response (if applicable)
      let customerDetails = null;
      if (result[0]!.customerId) {
        const [customer] = await db.select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, result[0]!.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);
        customerDetails = customer ?? null;
      }

      // Get supplier details for response (if applicable)
      let supplierDetails = null;
      if (result[0]!.supplierId) {
        const [supplier] = await db.select({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
        })
        .from(suppliers)
        .where(and(
          eq(suppliers.id, result[0]!.supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
        supplierDetails = supplier ?? null;
      }

      // Get return items for response
      const returnItems = await db.select()
        .from(returnOrderItems)
        .where(eq(returnOrderItems.returnOrderId, request.params.id));

      const responseWithDetails = {
        ...result[0]!,
        location: locationDetails ?? null,
        customer: customerDetails,
        supplier: supplierDetails,
        items: returnItems,
      };

      return reply.send(createSuccessResponse(responseWithDetails, 'Return order completed successfully'));
    }
  );
}
