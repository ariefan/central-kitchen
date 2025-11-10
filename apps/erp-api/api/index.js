import { fastify } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const app = fastify()

await app.register(cors)
await app.register(swagger)
await app.register(swaggerUi, {
  routePrefix: '/docs'
})

// Add your routes here...
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Export for Vercel
export default async function handler(req, res) {
  await app.ready()
  app.server.emit('request', req, res)
}