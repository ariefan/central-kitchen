import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createSuccessResponse } from "@/modules/shared/responses.js";
import { db } from "@/config/database.js";
import { requisitions, transfers } from "@/config/schema.js";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import { buildRequestContext } from "@/shared/middleware/auth.js";

const dashboardStatsSchema = z.object({
  pendingRequisitions: z.number(),
  approvedRequisitions: z.number(),
  inTransitTransfers: z.number(),
  completedTransfers: z.number(),
});

export function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
    {
      schema: {
        description: "Get dashboard statistics",
        tags: ["Dashboard"],
        response: {
          200: z.object({
            data: dashboardStatsSchema,
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const context = buildRequestContext(request);

      try {
        // Get current month start and end
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Count pending requisitions
        const pendingReqResult = await db
          .select({ count: sql`count(*)::int` })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.tenantId, context.tenantId),
              eq(requisitions.status, "pending_approval")
            )
          );

        // Count approved requisitions
        const approvedReqResult = await db
          .select({ count: sql`count(*)::int` })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.tenantId, context.tenantId),
              eq(requisitions.status, "approved"),
              sql`${requisitions.transferId} IS NULL`
            )
          );

        // Count in-transit transfers
        const inTransitResult = await db
          .select({ count: sql`count(*)::int` })
          .from(transfers)
          .where(
            and(
              eq(transfers.tenantId, context.tenantId),
              eq(transfers.status, "in_transit")
            )
          );

        // Count completed transfers this month
        const completedResult = await db
          .select({ count: sql`count(*)::int` })
          .from(transfers)
          .where(
            and(
              eq(transfers.tenantId, context.tenantId),
              eq(transfers.status, "completed"),
              gte(transfers.transferDate, monthStart),
              lte(transfers.transferDate, monthEnd)
            )
          );

        const stats = {
          pendingRequisitions: pendingReqResult[0]?.count || 0,
          approvedRequisitions: approvedReqResult[0]?.count || 0,
          inTransitTransfers: inTransitResult[0]?.count || 0,
          completedTransfers: completedResult[0]?.count || 0,
        };

        return reply.send(
          createSuccessResponse(stats, "Dashboard stats retrieved successfully")
        );
      } catch (error) {
        console.error("Dashboard stats error:", error);
        return reply.status(500).send({
          error: "Failed to retrieve dashboard statistics",
          message: "Internal server error",
        });
      }
    }
  );
}
