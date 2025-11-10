import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes';
import { locationRoutes } from './modules/locations/location.routes';
import { productRoutes } from './modules/products/product.routes';
import { userRoutes } from './modules/users/user.routes';
import { orderRoutes } from './modules/orders/order.routes';
import { customerRoutes } from './modules/customers/customer.routes';
import { priceBookRoutes } from './modules/pricebooks/pricebook.routes';
import { menuRoutes } from './modules/menus/menu.routes';
import { supplierRoutes } from './modules/suppliers/supplier.routes';
import { purchaseOrderRoutes } from './modules/purchase-orders/purchase-order.routes';
import { goodsReceiptRoutes } from './modules/goods-receipts/goods-receipt.routes';
import { requisitionRoutes } from './modules/requisitions/requisition.routes';
import { transferRoutes } from './modules/transfers/transfer.routes';
import { deliveryRoutes } from './modules/deliveries/delivery.routes';
import { recipeRoutes } from './modules/recipes/recipe.routes';
import { productionOrderRoutes } from './modules/production-orders/production-order.routes';
import { posRoutes } from './modules/pos/pos.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { stockCountRoutes } from './modules/stock-counts/stock-count.routes';
import { wasteRoutes } from './modules/waste/waste.routes';
import { returnRoutes } from './modules/returns/return.routes';
import { adjustmentRoutes } from './modules/adjustments/adjustment.routes';
import { reportRoutes } from './modules/reports/reports.routes';
import { categoryRoutes } from './modules/categories/category.routes';
import { uomConversionRoutes } from './modules/uom-conversions/uom-conversion.routes';
import { mockAuthMiddleware } from '@/shared/middleware/auth';

export async function apiV1Routes(fastify: FastifyInstance) {
  // Add mock auth middleware for development
  fastify.addHook('preHandler', mockAuthMiddleware);

  // Global OPTIONS handler for all API routes for CORS
  fastify.options('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Max-Age', '86400');
    return reply.code(204).send();
  });

  // API v1 prefix - P0 Core Masters + P1 Operations Excellence
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(locationRoutes, { prefix: '/locations' });
  await fastify.register(productRoutes, { prefix: '/products' });
  await fastify.register(userRoutes, { prefix: '/users' });
  await fastify.register(customerRoutes, { prefix: '/customers' });
  await fastify.register(priceBookRoutes, { prefix: '/pricebooks' });
  await fastify.register(menuRoutes, { prefix: '/menus' });
  await fastify.register(orderRoutes, { prefix: '/orders' });
  await fastify.register(posRoutes, { prefix: '/pos' });

  // P1 - Operations Excellence
  await fastify.register(supplierRoutes, { prefix: '/suppliers' });
  await fastify.register(purchaseOrderRoutes, { prefix: '/purchase-orders' });
  await fastify.register(goodsReceiptRoutes, { prefix: '/goods-receipts' });
  await fastify.register(requisitionRoutes, { prefix: '/requisitions' });
  await fastify.register(transferRoutes, { prefix: '/transfers' });
  await fastify.register(deliveryRoutes, { prefix: '/deliveries' });

  // P2 - Kitchen Excellence
  await fastify.register(recipeRoutes, { prefix: '/recipes' });
  await fastify.register(productionOrderRoutes, { prefix: '/production-orders' });
  await fastify.register(inventoryRoutes, { prefix: '/inventory' });
  await fastify.register(stockCountRoutes, { prefix: '/stock-counts' });
  await fastify.register(wasteRoutes, { prefix: '/waste' });
  await fastify.register(returnRoutes, { prefix: '/returns' });
  await fastify.register(adjustmentRoutes, { prefix: '/adjustments' });

  // Categories (master data)
  await fastify.register(categoryRoutes, { prefix: '/categories' });

  // UOM Conversions (master data)
  await fastify.register(uomConversionRoutes, { prefix: '/uom-conversions' });

  // P1 - Basic Reporting (completes P1)
  await fastify.register(reportRoutes, { prefix: '/reports' });
}