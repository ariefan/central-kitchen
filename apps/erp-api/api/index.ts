import { build } from '../src/app';

// Cache the server instance for better performance
let server: Awaited<ReturnType<typeof build>>;

async function getServer() {
  if (!server) {
    server = await build();
  }
  return server;
}

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  const server = await getServer();

  // Handle the request
  await server.ready();
  server.server.emit('request', req, res);
}