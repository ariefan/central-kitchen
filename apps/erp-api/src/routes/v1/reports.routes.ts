/**
 * Reporting & Analytics Routes
 *
 * Implements all 8 reporting endpoints as per USER_STORIES.md (US-RPT-001 to US-RPT-008)
 * Uses contracts from @contracts/erp as single source of truth
 *
 * @module routes/v1/reports
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createSuccessResponse,
  createBadRequestError,
} from "@/modules/shared/responses.js";

// Import all report contracts from @contracts/erp
import {
  dailySalesReportQuerySchema,
  dailySalesReportSchema,
  inventoryValuationReportQuerySchema,
  inventoryValuationReportSchema,
  productPerformanceQuerySchema,
  productPerformanceReportSchema,
  stockMovementReportQuerySchema,
  stockMovementReportSchema,
  wasteSpoilageReportQuerySchema,
  wasteReportSchema,
  purchaseOrderReportQuerySchema,
  purchaseOrderReportSchema,
  cashReconciliationQuerySchema,
  cashReconciliationReportSchema,
  cogsReportQuerySchema,
  cogsReportSchema,
} from "@contracts/erp";

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

/**
 * Register all reporting routes
 * @param fastify - Fastify instance
 */
export function reportRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // US-RPT-001: DAILY SALES REPORT
  // ============================================================================
  fastify.get(
    "/daily-sales",
    {
      schema: {
        description: "Daily sales report with payment/channel/hourly breakdowns",
        tags: ["Reports"],
        querystring: dailySalesReportQuerySchema,
        response: {
          200: createSuccessResponse(dailySalesReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof dailySalesReportQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.dailySales(request.query, context);
        return reply.send(
          createSuccessResponse(data, "Daily sales report generated successfully")
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-002: INVENTORY VALUATION REPORT
  // ============================================================================
  fastify.get(
    "/inventory-valuation",
    {
      schema: {
        description: "Current inventory value by location, category, and product",
        tags: ["Reports"],
        querystring: inventoryValuationReportQuerySchema,
        response: {
          200: createSuccessResponse(inventoryValuationReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof inventoryValuationReportQuerySchema>;
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
            "Inventory valuation report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-003: PRODUCT PERFORMANCE REPORT
  // ============================================================================
  fastify.get(
    "/product-performance",
    {
      schema: {
        description: "Product sales performance with revenue, margin, and velocity",
        tags: ["Reports"],
        querystring: productPerformanceQuerySchema,
        response: {
          200: createSuccessResponse(productPerformanceReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof productPerformanceQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.productPerformance(
          request.query,
          context
        );
        return reply.send(
          createSuccessResponse(
            data,
            "Product performance report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-004: STOCK MOVEMENT REPORT
  // ============================================================================
  fastify.get(
    "/stock-movement",
    {
      schema: {
        description: "Detailed stock movement history for audit trail",
        tags: ["Reports"],
        querystring: stockMovementReportQuerySchema,
        response: {
          200: createSuccessResponse(stockMovementReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof stockMovementReportQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.stockMovement(request.query, context);
        return reply.send(
          createSuccessResponse(
            data,
            "Stock movement report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-005: WASTE & SPOILAGE REPORT
  // ============================================================================
  fastify.get(
    "/waste-spoilage",
    {
      schema: {
        description: "Waste and spoilage analysis by category and reason",
        tags: ["Reports"],
        querystring: wasteSpoilageReportQuerySchema,
        response: {
          200: createSuccessResponse(wasteReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof wasteSpoilageReportQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.wasteSpoilage(request.query, context);
        return reply.send(
          createSuccessResponse(
            data,
            "Waste & spoilage report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-006: PURCHASE ORDER REPORT
  // ============================================================================
  fastify.get(
    "/purchase-orders",
    {
      schema: {
        description: "Purchase order summary with supplier and status breakdowns",
        tags: ["Reports"],
        querystring: purchaseOrderReportQuerySchema,
        response: {
          200: createSuccessResponse(purchaseOrderReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof purchaseOrderReportQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.purchaseOrders(request.query, context);
        return reply.send(
          createSuccessResponse(
            data,
            "Purchase order report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-007: CASH RECONCILIATION REPORT
  // ============================================================================
  fastify.get(
    "/cash-reconciliation",
    {
      schema: {
        description: "POS shift cash reconciliation with variance analysis",
        tags: ["Reports"],
        querystring: cashReconciliationQuerySchema,
        response: {
          200: createSuccessResponse(cashReconciliationReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof cashReconciliationQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.cashReconciliation(
          request.query,
          context
        );
        return reply.send(
          createSuccessResponse(
            data,
            "Cash reconciliation report generated successfully"
          )
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // ============================================================================
  // US-RPT-008: COGS CALCULATION REPORT
  // ============================================================================
  fastify.get(
    "/cogs",
    {
      schema: {
        description: "Cost of Goods Sold calculation with inventory reconciliation",
        tags: ["Reports"],
        querystring: cogsReportQuerySchema,
        response: {
          200: createSuccessResponse(cogsReportSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof cogsReportQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const context = buildRequestContext(request);
      try {
        const data = await reportService.cogs(request.query, context);
        return reply.send(
          createSuccessResponse(data, "COGS report generated successfully")
        );
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
