import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import { menus, menuItems, products, locations } from '../../../../config/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth.js';

// Create schemas from the database schema
const menuInsertSchema = createInsertSchema(menus).omit({
  id: true,
  tenantId: true,
});

const menuUpdateSchema = menuInsertSchema.partial();

const menuItemInsertSchema = createInsertSchema(menuItems).omit({
  id: true,
  menuId: true,
});

const menuItemUpdateSchema = menuItemInsertSchema.partial();

// Type aliases for better inference
type MenuInsertType = z.infer<typeof menuInsertSchema>;
type MenuUpdateType = z.infer<typeof menuUpdateSchema>;
type MenuItemInsertType = z.infer<typeof menuItemInsertSchema>;
type MenuItemUpdateType = z.infer<typeof menuItemUpdateSchema>;

type MenuUpdateRequest = FastifyRequest<{
  Params: { id: string };
  Body: MenuUpdateType;
}>;

type MenuItemUpdateRequest = FastifyRequest<{
  Params: { id: string; itemId: string };
  Body: MenuItemUpdateType;
}>;

const menuSelectSchema = createSelectSchema(menus);
const menuItemSelectSchema = createSelectSchema(menuItems);

const menuResponseSchema = z.object({
  success: z.literal(true),
  data: menuSelectSchema.extend({
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable().optional(),
    items: z.array(z.any()).optional(),
  }),
  message: z.string(),
});

const menusResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(menuSelectSchema.extend({
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable().optional(),
  })),
  message: z.string(),
});

const menuItemResponseSchema = z.object({
  success: z.literal(true),
  data: menuItemSelectSchema.extend({
    product: z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string().optional(),
    }).nullable().optional(),
    location: z.object({
      id: z.string(),
      name: z.string(),
    }).nullable().optional(),
  }),
  message: z.string(),
});

const menuItemsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(menuItemResponseSchema.shape.data),
  message: z.string(),
});

export function menuRoutes(fastify: FastifyInstance) {
  // GET /api/v1/menus - List all menus
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all menus',
        tags: ['Menus'],
        response: {
          200: menusResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const allMenus = await db
        .select()
        .from(menus)
        .where(eq(menus.tenantId, tenantId))
        .orderBy(desc(menus.isActive), menus.name);

      return reply.send(createSuccessResponse(allMenus, 'Menus retrieved successfully'));
    }
  );

  // GET /api/v1/menus/:id - Get menu by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get menu by ID',
        tags: ['Menus'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: menuResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const menu = await db
        .select()
        .from(menus)
        .where(and(
          eq(menus.id, request.params.id),
          eq(menus.tenantId, tenantId)
        ))
        .limit(1);

      if (!menu.length) {
        return createNotFoundError('Menu not found', reply);
      }

      return reply.send(createSuccessResponse(menu[0], 'Menu retrieved successfully'));
    }
  );

  // POST /api/v1/menus - Create new menu
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new menu',
        tags: ['Menus'],
        body: menuInsertSchema,
        response: {
          201: menuResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: MenuInsertType }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const newMenu = {
        ...request.body,
        tenantId,
      };

      const result = await db.insert(menus).values(newMenu).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Menu created successfully'));
    }
  );

  // PATCH /api/v1/menus/:id - Update menu
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update menu',
        tags: ['Menus'],
        params: z.object({ id: z.string().uuid() }),
        body: menuUpdateSchema,
        response: {
          200: menuResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: MenuUpdateRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await db
        .update(menus)
        .set(request.body)
        .where(and(
          eq(menus.id, request.params.id),
          eq(menus.tenantId, tenantId)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Menu not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Menu updated successfully'));
    }
  );

  // DELETE /api/v1/menus/:id - Delete menu
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete menu',
        tags: ['Menus'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: menuResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await db
        .delete(menus)
        .where(and(
          eq(menus.id, request.params.id),
          eq(menus.tenantId, tenantId)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Menu not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Menu deleted successfully'));
    }
  );

  // Menu Items endpoints

  // GET /api/v1/menus/:id/items - Get menu items for a menu
  fastify.get(
    '/:id/items',
    {
      schema: {
        description: 'Get menu items for a menu',
        tags: ['Menus', 'Menu Items'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: menuItemsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify menu exists and belongs to tenant
      const menu = await db.select().from(menus)
        .where(and(eq(menus.id, request.params.id), eq(menus.tenantId, tenantId)))
        .limit(1);

      if (!menu.length) {
        return createNotFoundError('Menu not found', reply);
      }

      // Get menu items with product and location information
      const rawItems = await db
        .select({
          id: menuItems.id,
          menuId: menuItems.menuId,
          productId: menuItems.productId,
          variantId: menuItems.variantId,
          locationId: menuItems.locationId,
          isAvailable: menuItems.isAvailable,
          sortOrder: menuItems.sortOrder,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          location_id: locations.id,
          location_name: locations.name,
        })
        .from(menuItems)
        .leftJoin(products, eq(menuItems.productId, products.id))
        .leftJoin(locations, eq(menuItems.locationId, locations.id))
        .where(eq(menuItems.menuId, request.params.id))
        .orderBy(menuItems.sortOrder, products.name);

      // Transform the results to match the expected schema
      const items = rawItems.map(item => ({
        id: item.id,
        menuId: item.menuId,
        productId: item.productId,
        variantId: item.variantId,
        locationId: item.locationId,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        product: item.product_id ? {
          id: item.product_id,
          name: item.product_name ?? '',
          sku: item.product_sku,
        } : null,
        location: item.location_id ? {
          id: item.location_id,
          name: item.location_name ?? '',
        } : null,
      }));

      return reply.send(createSuccessResponse(items, 'Menu items retrieved successfully'));
    }
  );

  // POST /api/v1/menus/:id/items - Add item to menu
  fastify.post(
    '/:id/items',
    {
      schema: {
        description: 'Add item to menu',
        tags: ['Menus', 'Menu Items'],
        params: z.object({ id: z.string().uuid() }),
        body: menuItemInsertSchema,
        response: {
          201: menuItemResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: MenuItemInsertType;
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify menu exists and belongs to tenant
      const menu = await db.select().from(menus)
        .where(and(eq(menus.id, request.params.id), eq(menus.tenantId, tenantId)))
        .limit(1);

      if (!menu.length) {
        return createNotFoundError('Menu not found', reply);
      }

      const newMenuItem = {
        ...request.body,
        menuId: request.params.id,
      };

      const result = await db.insert(menuItems).values(newMenuItem).returning();

      // Get the full item with product info
      if (!result.length) {
        return createNotFoundError('Menu item not found', reply);
      }

      // Get the full item with product info
      const rawItems = await db
        .select({
          id: menuItems.id,
          menuId: menuItems.menuId,
          productId: menuItems.productId,
          variantId: menuItems.variantId,
          locationId: menuItems.locationId,
          isAvailable: menuItems.isAvailable,
          sortOrder: menuItems.sortOrder,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          location_id: locations.id,
          location_name: locations.name,
        })
        .from(menuItems)
        .leftJoin(products, eq(menuItems.productId, products.id))
        .leftJoin(locations, eq(menuItems.locationId, locations.id))
        .where(eq(menuItems.id, result[0]!.id))
        .limit(1);

      // Transform the results to match the expected schema
      const fullItem = rawItems.map(item => ({
        id: item.id,
        menuId: item.menuId,
        productId: item.productId,
        variantId: item.variantId,
        locationId: item.locationId,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        product: item.product_id ? {
          id: item.product_id,
          name: item.product_name ?? '',
          sku: item.product_sku,
        } : null,
        location: item.location_id ? {
          id: item.location_id,
          name: item.location_name ?? '',
        } : null,
      }));

      return reply.status(201).send(createSuccessResponse(fullItem[0] ?? null, 'Menu item added successfully'));
    }
  );

  // PATCH /api/v1/menus/:id/items/:itemId - Update menu item
  fastify.patch(
    '/:id/items/:itemId',
    {
      schema: {
        description: 'Update menu item',
        tags: ['Menus', 'Menu Items'],
        params: z.object({
          id: z.string().uuid(),
          itemId: z.string().uuid(),
        }),
        body: menuItemUpdateSchema,
        response: {
          200: menuItemResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: MenuItemUpdateRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify menu exists and belongs to tenant
      const menu = await db.select().from(menus)
        .where(and(eq(menus.id, request.params.id), eq(menus.tenantId, tenantId)))
        .limit(1);

      if (!menu.length) {
        return createNotFoundError('Menu not found', reply);
      }

      const result = await db
        .update(menuItems)
        .set(request.body)
        .where(and(
          eq(menuItems.id, request.params.itemId),
          eq(menuItems.menuId, request.params.id)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Menu item not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Menu item updated successfully'));
    }
  );

  // DELETE /api/v1/menus/:id/items/:itemId - Remove item from menu
  fastify.delete(
    '/:id/items/:itemId',
    {
      schema: {
        description: 'Remove item from menu',
        tags: ['Menus', 'Menu Items'],
        params: z.object({
          id: z.string().uuid(),
          itemId: z.string().uuid(),
        }),
        response: {
          200: menuItemResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string; itemId: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify menu exists and belongs to tenant
      const menu = await db.select().from(menus)
        .where(and(eq(menus.id, request.params.id), eq(menus.tenantId, tenantId)))
        .limit(1);

      if (!menu.length) {
        return createNotFoundError('Menu not found', reply);
      }

      const result = await db
        .delete(menuItems)
        .where(and(
          eq(menuItems.id, request.params.itemId),
          eq(menuItems.menuId, request.params.id)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Menu item not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Menu item removed successfully'));
    }
  );
}