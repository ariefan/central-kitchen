import { build } from './app';
import { env } from './config/env';

// Create server instance with all configuration from app.ts
const server = await build();

// Server is already configured with logger from app.ts

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await server.close();
    server.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    server.log.error({ err }, 'Error during server shutdown:');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    await server.listen({
      port: env.PORT,
      host: env.HOST
    });

    console.log(`🚀 ERP API Server started successfully!`);
    console.log(`📍 Server: http://${env.HOST}:${env.PORT}`);
    console.log(`📚 Documentation: http://${env.HOST}:${env.PORT}/docs`);
    console.log(`🏥 Health Check: http://${env.HOST}:${env.PORT}/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
  } catch (err) {
    server.log.error({ err }, 'Failed to start server:');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  server.log.error({ promise, reason }, 'Unhandled Rejection at:');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  server.log.error({ error }, 'Uncaught Exception:');
  process.exit(1);
});

void start();
