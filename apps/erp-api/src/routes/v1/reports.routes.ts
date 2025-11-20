import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createSuccessResponse,
  createBadRequestError,
} from "@/modules/shared/responses.js";
import {
  salesSummaryQuerySchema,
  productMixQuerySchema,
  inventoryValuationQuerySchema,
  poSummaryQuerySchema,
  salesSummarySchema,
  productMixSchema,
  inventoryValuationSchema,
  poSummarySchema,
} from "@/modules/reports/report.schema.js";
import {
  reportService,
  ReportServiceError,
} from "@/modules/reports/report.service.js";
import { buildRequestContext } from "@/shared/middleware/auth.js";

const handleServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof ReportServiceError) {
    return createBadRequestError(error.message, reply);
  }
  throw error;
};

export function reportRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/sales-summary",
    {
      schema: {
        description: "Get sales summary report",
        tags: ["Reports"],
        querystring: salesSummaryQuerySchema,
        response: {
          200: salesSummarySchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof salesSummaryQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.salesSummary(request.query, context);
        return reply.send(
          createSuccessResponse(data, "Sales summary retrieved successfully")
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.get(
    "/product-mix",
    {
      schema: {
        description: "Get product mix report",
        tags: ["Reports"],
        querystring: productMixQuerySchema,
        response: {
          200: productMixSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof productMixQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.productMix(request.query, context);
        return reply.send(
          createSuccessResponse(
            data,
            "Product mix report retrieved successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.get(
    "/inventory-valuation",
    {
      schema: {
        description: "Get inventory valuation report",
        tags: ["Reports"],
        querystring: inventoryValuationQuerySchema,
        response: {
          200: inventoryValuationSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof inventoryValuationQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.inventoryValuation(
          request.query,
          context
        );
        return reply.send(
          createSuccessResponse(
            data,
            "Inventory valuation report retrieved successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  fastify.get(
    "/po-summary",
    {
      schema: {
        description: "Get purchase order summary report",
        tags: ["Reports"],
        querystring: poSummaryQuerySchema,
        response: {
          200: poSummarySchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof poSummaryQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.purchaseOrderSummary(
          request.query,
          context
        );
        return reply.send(
          createSuccessResponse(
            data,
            "Purchase order summary retrieved successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
