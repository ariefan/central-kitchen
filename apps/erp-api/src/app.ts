import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import middie from '@fastify/middie';
import cookie from '@fastify/cookie';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform, jsonSchemaTransformObject, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { env } from './config/env.js';
import { db } from './config/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiV1Routes } from './routes/v1/index.js';
import { auth } from './lib/auth.js';

export async function build() {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Set compilers for schema validation and serialization
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Register middie for Express-style middleware
  await server.register(middie);

  // Register cookie parser for Better Auth session cookies
  await server.register(cookie);

  // Register CORS
  // Now that API is proxied through the frontend domain, we primarily need same-origin
  const allowedOrigins = env.NODE_ENV === 'production'
    ? [
        'https://erp.personalapp.id', // Frontend domain (proxies to API)
        'http://erp-api:8000', // Internal Docker network (for rewrites)
        'http://localhost:8000', // Internal Docker network alternative
      ]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8000'];

  await server.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflight: true, // Enable preflight handling
    strictPreflight: false, // Disable strict preflight handling
    optionsSuccessStatus: 204, // Return 204 for OPTIONS requests
    hideOptionsRoute: true, // Hide the options route from documentation
  });

  // Register error handler
  server.setErrorHandler(errorHandler);

  // Register Swagger
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'ERP API',
        description: 'Enterprise Resource Planning API built with Fastify and PostgreSQL',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: `${env.NODE_ENV} server`,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Authentication token',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Customers', description: 'Customer management endpoints' },
        { name: 'Products', description: 'Product management endpoints' },
        { name: 'Categories', description: 'Product category management endpoints' },
        { name: 'Orders', description: 'Order management endpoints' },
        { name: 'POS', description: 'Point of Sale endpoints' },
        { name: 'Suppliers', description: 'Supplier management endpoints' },
        { name: 'Purchase Orders', description: 'Purchase order management endpoints' },
        { name: 'Goods Receipts', description: 'Goods receipt processing endpoints' },
        { name: 'Requisitions', description: 'Stock requisition endpoints' },
        { name: 'Transfers', description: 'Stock transfer endpoints' },
        { name: 'Deliveries', description: 'Delivery management endpoints' },
        { name: 'Recipes', description: 'Recipe management endpoints' },
        { name: 'Production Orders', description: 'Production order management endpoints' },
        { name: 'Inventory', description: 'Inventory management endpoints' },
        { name: 'Stock Counts', description: 'Stock count and cycle count endpoints' },
        { name: 'Waste', description: 'Waste tracking endpoints' },
        { name: 'Returns', description: 'Returns processing endpoints' },
        { name: 'Adjustments', description: 'Inventory adjustments endpoints' },
        { name: 'Locations', description: 'Location management endpoints' },
        { name: 'Menus', description: 'Menu management endpoints' },
        { name: 'Pricebooks', description: 'Price book management endpoints' },
        { name: 'UOM Conversions', description: 'Unit of measure conversion endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Reports', description: 'Reporting and analytics endpoints' },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  // Register Swagger UI
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next(); },
      preHandler: function (request, reply, next) { next(); },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Health check route handler
  const healthCheckHandler = async () => {
    let dbStatus: string;
    try {
      // Test database connection
      await db.execute('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        database: dbStatus,
      },
      message: 'Service is healthy',
    };
  };

  const healthCheckSchema = {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: z.object({
          success: z.boolean(),
          data: z.object({
            status: z.string(),
            timestamp: z.string(),
            uptime: z.number(),
            environment: z.string(),
            database: z.string(),
          }),
          message: z.string(),
        }),
      },
    },
  };

  // Health check routes (both /health and /api/health for compatibility)
  server.get('/health', healthCheckSchema, healthCheckHandler);
  server.get('/api/health', healthCheckSchema, healthCheckHandler);

  // Register Better Auth routes using the official Fastify integration approach
  // This creates a catch-all route that handles all auth endpoints
  server.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      try {
        // Construct the full URL for Better Auth
        const url = new URL(request.url, `http://${request.headers.host}`);

        // Convert headers to Headers object
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            if (Array.isArray(value)) {
              value.forEach(v => headers.append(key, v));
            } else {
              headers.set(key, value.toString());
            }
          }
        });

        // Create Web Request with body if present
        const webRequest = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body && request.method !== 'GET' && request.method !== 'HEAD'
            ? JSON.stringify(request.body)
            : undefined,
        });

        // Call Better Auth handler
        const response = await auth.handler(webRequest);

        // Send response
        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        const body = await response.text();
        reply.send(body || null);
      } catch (error) {
        server.log.error({ err: error }, 'Better Auth Error');
        reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    },
  });

  // Register API routes
  await server.register(apiV1Routes, { prefix: '/api/v1' });


  // DON'T start server here - let tests handle that
  return server;
}
