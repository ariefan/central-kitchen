import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createNotFoundError,
  notFoundResponseSchema,
  successResponseSchema,
} from "@/modules/shared/responses.js";
import {
  orderCreateSchema,
  orderResponseSchema,
  ordersResponseSchema,
  orderQuerySchema,
  kitchenStatusUpdateSchema,
  prepStatusUpdateSchema,
  orderPaymentSchema,
  paymentResponseSchema,
  paymentsResponseSchema,
} from "@/modules/orders/order.schema.js";
import { orderService } from "@/modules/orders/order.service.js";
import { buildRequestContext } from "@/shared/middleware/auth.js";

export function orderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/orders - List all orders
  fastify.get(
    "/",
    {
      schema: {
        description: "Get all orders with pagination, sorting, and search",
        tags: ["Orders"],
        querystring: orderQuerySchema,
        response: {
          200: ordersResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof orderQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const result = await orderService.listOrders(request.query, context);
      return reply.send(
        createPaginatedResponse(
          result.items,
          result.total,
          result.limit,
          result.offset
        )
      );
    }
  );

  // POST /api/v1/orders - Create new order
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new order",
        tags: ["Orders"],
        body: orderCreateSchema,
        response: {
          201: orderResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof orderCreateSchema> }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const result = await orderService.createOrder(request.body, context);
      return reply
        .status(201)
        .send(createSuccessResponse(result, "Order created successfully"));
    }
  );

  // GET /api/v1/orders/:id - Get specific order
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get specific order",
        tags: ["Orders"],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const order = await orderService.getOrderById(request.params.id, context);
      if (!order) {
        return createNotFoundError("Order not found", reply);
      }

      return reply.send(
        createSuccessResponse(order, "Order retrieved successfully")
      );
    }
  );

  // POST /api/v1/orders/:id/quote - Get server-side reprice for order
  fastify.post(
    "/:id/quote",
    {
      schema: {
        description: "Get server-side reprice for existing order",
        tags: ["Orders"],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const quote = await orderService.quoteOrder(request.params.id, context);
      if (!quote) {
        return createNotFoundError("Order not found", reply);
      }

      return reply.send(
        createSuccessResponse(quote, "Order quote calculated successfully")
      );
    }
  );

  // PATCH /api/v1/orders/:id - Update order (edit before post)
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update order (edit before posting)",
        tags: ["Orders"],
        params: z.object({ id: z.string().uuid() }),
        body: orderCreateSchema.partial(),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Partial<z.infer<typeof orderCreateSchema>>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const updated = await orderService.updateOrder(
        request.params.id,
        request.body,
        context
      );

      if (!updated) {
        return createNotFoundError("Order not found or already posted", reply);
      }

      return reply.send(
        createSuccessResponse(updated, "Order updated successfully")
      );
    }
  );

  // POST /api/v1/orders/:id/post - CRITICAL: Post/finalize order
  fastify.post(
    "/:id/post",
    {
      schema: {
        description:
          "Post/finalize order - generate doc number and freeze for processing",
        tags: ["Orders"],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const result = await orderService.postOrder(request.params.id, context);
      if (!result) {
        return createNotFoundError("Order not found or already posted", reply);
      }

      return reply.send(
        createSuccessResponse(result, "Order posted successfully")
      );
    }
  );

  // POST /api/v1/orders/:id/void - Void order
  fastify.post(
    "/:id/void",
    {
      schema: {
        description: "Void order (reverse if posted)",
        tags: ["Orders"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string(),
        }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { reason: string };
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const result = await orderService.voidOrder(
        request.params.id,
        request.body.reason,
        context
      );
      if (!result) {
        return createNotFoundError("Order not found", reply);
      }

      return reply.send(
        createSuccessResponse(result, "Order voided successfully")
      );
    }
  );

  // Payment endpoints

  // POST /api/v1/orders/:id/payments - Add payment to order
  fastify.post(
    "/:id/payments",
    {
      schema: {
        description: "Add payment to order - supports multi-tender payments",
        tags: ["Orders", "Payments"],
        params: z.object({ id: z.string().uuid() }),
        body: orderPaymentSchema,
        response: {
          201: paymentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof orderPaymentSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const payment = await orderService.addPayment(
        request.params.id,
        request.body,
        context
      );
      if (!payment) {
        return createNotFoundError("Order not found", reply);
      }

      return reply
        .status(201)
        .send(createSuccessResponse(payment, "Payment added successfully"));
    }
  );

  // GET /api/v1/orders/:id/payments - Get payments for an order
  fastify.get(
    "/:id/payments",
    {
      schema: {
        description: "Get all payments for an order",
        tags: ["Orders", "Payments"],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: paymentsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const orderPayments = await orderService.listPayments(
        request.params.id,
        context
      );
      if (!orderPayments) {
        return createNotFoundError("Order not found", reply);
      }

      return reply.send(
        createSuccessResponse(orderPayments, "Payments retrieved successfully")
      );
    }
  );

  // PATCH /api/v1/orders/:id/kitchen-status - Update order kitchen status
  fastify.patch(
    "/:id/kitchen-status",
    {
      schema: {
        description: "Update order kitchen status",
        tags: ["Orders", "Kitchen"],
        params: z.object({ id: z.string().uuid() }),
        body: kitchenStatusUpdateSchema,
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof kitchenStatusUpdateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const body = request.body;
      try {
        const updated = await orderService.updateKitchenStatus(
          request.params.id,
          body,
          context
        );
        if (!updated) {
          return createNotFoundError("Order not found", reply);
        }

        return reply.send(
          createSuccessResponse(
            updated,
            `Order kitchen status updated to ${body.kitchenStatus}`
          )
        );
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: "Invalid kitchen status transition",
          message:
            error instanceof Error
              ? error.message
              : "Invalid status transition",
        });
      }
    }
  );

  // PATCH /api/v1/order-items/:id/prep-status - Update order item prep status
  fastify.patch(
    "/items/:id/prep-status",
    {
      schema: {
        description: "Update order item preparation status",
        tags: ["Orders", "Kitchen", "Items"],
        params: z.object({ id: z.string().uuid() }),
        body: prepStatusUpdateSchema,
        response: {
          200: successResponseSchema(z.any()),
          404: notFoundResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof prepStatusUpdateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      const body = request.body;
      try {
        const result = await orderService.updateItemPrepStatus(
          request.params.id,
          body,
          context
        );
        if (!result) {
          return createNotFoundError("Order item not found", reply);
        }

        return reply.send(
          createSuccessResponse(
            {
              ...result.item,
              orderKitchenStatus: result.orderKitchenStatus,
            },
            `Order item prep status updated to ${body.prepStatus}`
          )
        );
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: "Invalid prep status transition",
          message:
            error instanceof Error
              ? error.message
              : "Invalid status transition",
        });
      }
    }
  );
}
