#!/bin/bash

echo "🚀 Deploying Central Kitchen to Vercel..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Build to ensure everything works
echo "🔨 Building project..."
pnpm build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set DATABASE_URL in Vercel dashboard:"
echo "   postgresql://neondb_owner:npg_dhv2iot6VjnS@ep-twilight-sound-adx9bc6d-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
echo ""
echo "2. Set JWT_SECRET in Vercel dashboard (min 32 characters)"
echo ""
echo "3. Update CORS origins after first deployment in:"
echo "   apps/erp-api/src/app.ts:26"