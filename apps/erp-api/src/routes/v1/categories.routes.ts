/**
 * Product Categories API Routes (Helper Endpoint)
 *
 * Returns product kinds (types) for frontend dropdown lists.
 * Product kinds categorize products as raw materials, finished goods, etc.
 *
 * Note: This is a static reference endpoint. For full category management
 * with CRUD operations, see recommended enhancement in FEATURES.md.
 *
 * @see FEATURES.md Section 12.1 - Product kinds enumeration
 * @module routes/v1/categories
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createSuccessResponse } from '@/shared/utils/responses.js';
import { productKinds } from '@contracts/erp';

export function categoryRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/categories
   *
   * List product kinds (categories) for frontend selection
   *
   * Returns static list of product kinds from enum:
   * - raw_material
   * - semi_finished
   * - finished_good
   * - packaging
   * - consumable
   *
   * @see FEATURES.md ADM-001 - Product kinds enumeration
   */
  fastify.get('/', {
    schema: {
      description: 'List product kinds (categories)',
      tags: ['Categories', 'Products'],
      // Note: Response schema validation removed because Fastify with Zod type provider
      // doesn't accept plain JSON schemas
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // Return product kinds from enum with proper display names
    const categories = productKinds.map((kind) => {
      const displayNames: Record<string, { code: string; name: string }> = {
        raw_material: { code: 'RAW', name: 'Raw Material' },
        semi_finished: { code: 'SEMI', name: 'Semi-Finished Good' },
        finished_good: { code: 'FIN', name: 'Finished Good' },
        packaging: { code: 'PACK', name: 'Packaging' },
        consumable: { code: 'CONS', name: 'Consumable' },
      };

      const info = displayNames[kind];
      if (!info) {
        throw new Error(`Unknown product kind: ${kind}`);
      }
      return {
        id: kind, // Use enum value as ID (raw_material, not raw-materials)
        code: info.code,
        name: info.name,
      };
    });

    return reply.send(createSuccessResponse(categories, 'Product kinds retrieved successfully'));
  });
}