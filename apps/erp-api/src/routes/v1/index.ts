import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { adjustmentRoutes } from './adjustments.routes.js';
import { alertRoutes } from './alerts.routes.js';
import { authRoutes } from './auth.routes.js';
import { categoryRoutes } from './categories.routes.js';
import { customerRoutes } from './customers.routes.js';
import { deliveryRoutes } from './deliveries.routes.js';
import { loyaltyRoutes } from './loyalty.routes.js';
import { goodsReceiptRoutes } from './goods-receipts.routes.js';
import { inventoryRoutes } from './inventory.routes.js';
import { locationRoutes } from './locations.routes.js';
import { menuRoutes } from './menus.routes.js';
import { orderRoutes } from './orders.routes.js';
import { posRoutes } from './pos.routes.js';
import { priceBookRoutes } from './pricebooks.routes.js';
import { productionOrderRoutes } from './production-orders.routes.js';
import { productRoutes } from './products.routes.js';
import { productVariantRoutes } from './product-variants.routes.js';
import { purchaseOrderRoutes } from './purchase-orders.routes.js';
import { recipeRoutes } from './recipes.routes.js';
import { reportRoutes } from './reports.routes.js';
import { requisitionRoutes } from './requisitions.routes.js';
import { returnRoutes } from './returns.routes.js';
import { stockCountRoutes } from './stock-counts.routes.js';
import { supplierRoutes } from './suppliers.routes.js';
import { temperatureLogRoutes } from './temperature-logs.routes.js';
import { transferRoutes } from './transfers.routes.js';
import { uomConversionRoutes } from './uom-conversions.routes.js';
import { uomRoutes } from './uoms.routes.js';
import { userRoutes } from './users.routes.js';
import { wasteRoutes } from './waste.routes.js';
import { authMiddleware } from '../../shared/middleware/auth.js';

export async function apiV1Routes(fastify: FastifyInstance) {
  // Global OPTIONS handler for all API routes for CORS
  fastify.options('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Max-Age', '86400');
    return reply.code(204).send();
  });

  // Protected routes - require authentication
  await fastify.register(async (protectedRoutes) => {
    // Add auth middleware to all routes in this group
    protectedRoutes.addHook('preHandler', authMiddleware);

    // Auth routes (protected - user info endpoints)
    await protectedRoutes.register(authRoutes, { prefix: '/auth' });

    // API v1 prefix - P0 Core Masters + P1 Operations Excellence
    await protectedRoutes.register(locationRoutes, { prefix: '/locations' });
    await protectedRoutes.register(productRoutes, { prefix: '/products' });
    await protectedRoutes.register(userRoutes, { prefix: '/users' });
    await protectedRoutes.register(customerRoutes, { prefix: '/customers' });
    await protectedRoutes.register(loyaltyRoutes, { prefix: '/loyalty' });
    await protectedRoutes.register(priceBookRoutes, { prefix: '/pricebooks' });
    await protectedRoutes.register(menuRoutes, { prefix: '/menus' });
    await protectedRoutes.register(orderRoutes, { prefix: '/orders' });
    await protectedRoutes.register(posRoutes, { prefix: '/pos' });

    // P1 - Operations Excellence
    await protectedRoutes.register(supplierRoutes, { prefix: '/suppliers' });
    await protectedRoutes.register(purchaseOrderRoutes, { prefix: '/purchase-orders' });
    await protectedRoutes.register(goodsReceiptRoutes, { prefix: '/goods-receipts' });
    await protectedRoutes.register(requisitionRoutes, { prefix: '/requisitions' });
    await protectedRoutes.register(transferRoutes, { prefix: '/transfers' });
    await protectedRoutes.register(deliveryRoutes, { prefix: '/deliveries' });

    // P2 - Kitchen Excellence
    await protectedRoutes.register(recipeRoutes, { prefix: '/recipes' });
    await protectedRoutes.register(productionOrderRoutes, { prefix: '/production-orders' });
    await protectedRoutes.register(inventoryRoutes, { prefix: '/inventory' });
    await protectedRoutes.register(stockCountRoutes, { prefix: '/stock-counts' });
    await protectedRoutes.register(wasteRoutes, { prefix: '/waste' });
    await protectedRoutes.register(returnRoutes, { prefix: '/returns' });
    await protectedRoutes.register(adjustmentRoutes, { prefix: '/adjustments' });

    // Categories (master data)
    await protectedRoutes.register(categoryRoutes, { prefix: '/categories' });

    // UOMs (master data - ADM-003)
    await protectedRoutes.register(uomRoutes, { prefix: '/uoms' });

    // UOM Conversions (master data - ADM-003)
    await protectedRoutes.register(uomConversionRoutes, { prefix: '/uom-conversions' });

    // Product Variants (ADM-002) - routes: /products/:id/variants and /product-variants/:id
    await protectedRoutes.register(productVariantRoutes);

    // P1 - Basic Reporting (completes P1)
    await protectedRoutes.register(reportRoutes, { prefix: '/reports' });

    // P3 - Quality Control & Compliance
    await protectedRoutes.register(temperatureLogRoutes, { prefix: '/temperature-logs' });
    await protectedRoutes.register(alertRoutes, { prefix: '/alerts' });
  });
}
