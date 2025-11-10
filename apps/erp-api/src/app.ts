import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform, jsonSchemaTransformObject, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { env } from './config/env';
import { db } from './config/database';
import { errorHandler } from './middleware/error-handler';
import { apiV1Routes } from './routes/v1/index';

export async function build() {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Set compilers for schema validation and serialization
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Register CORS
  const allowedOrigins = env.NODE_ENV === 'production'
    ? ['https://your-project-name.vercel.app', 'https://your-custom-domain.com']
    : ['http://localhost:3000'];

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
        { name: 'Customers', description: 'Customer management endpoints' },
        { name: 'Products', description: 'Product management endpoints' },
        { name: 'Orders', description: 'Order management endpoints' },
        { name: 'Returns', description: 'Returns processing endpoints' },
        { name: 'Adjustments', description: 'Inventory adjustments endpoints' },
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

  // Health check route
  server.get(
    '/health',
    {
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
    },
    async (_request, _reply) => {
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
    }
  );

  // Register API routes
  await server.register(apiV1Routes, { prefix: '/api/v1' });

  
  // DON'T start server here - let tests handle that
  return server;
}
