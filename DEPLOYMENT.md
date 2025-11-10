# Vercel Deployment Guide

## Quick Deploy Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel --prod
```

## Environment Variables

Set these in your Vercel dashboard:

### Backend Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - "production"
- `JWT_SECRET` - Your JWT secret (min 32 characters)
- `HOST` - "0.0.0.0"
- `PORT` - "8000"

### Frontend Environment Variables:
- `VITE_API_URL` - Will be set automatically to your Vercel URL

## What Happens Automatically

✅ **Frontend**: Builds and deploys to `your-project-name.vercel.app`
✅ **Backend**: Deploys as serverless functions at same URL
✅ **Routing**: API calls are proxied to backend functions
✅ **Database**: Works with any PostgreSQL connection
✅ **CORS**: Configured for Vercel domains

## Deployment URLs

After deployment:
- **Frontend**: `https://your-project-name.vercel.app`
- **API**: `https://your-project-name.vercel.app/api/v1/...`
- **Health Check**: `https://your-project-name.vercel.app/health`
- **API Docs**: `https://your-project-name.vercel.app/docs`

## Database Setup

### Your Demo Database (Ready to Use)
Set this exact string as `DATABASE_URL` in Vercel dashboard:
```
postgresql://neondb_owner:npg_dhv2iot6VjnS@ep-twilight-sound-adx9bc6d-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Common Issues

### CORS Errors
Make sure your Vercel URL is in the CORS origins in `apps/erp-api/src/app.ts:26`

### Database Connection
Test your `DATABASE_URL` locally first:
```bash
psql "your-connection-string"
```

### Build Failures
Check that all dependencies are installed:
```bash
pnpm install
pnpm build
```

## Local Development

```bash
# Terminal 1: Backend
pnpm dev:api

# Terminal 2: Frontend
pnpm dev:web
```

## Updating CORS Origins

After your first deployment, update `apps/erp-api/src/app.ts:26`:
```typescript
const allowedOrigins = env.NODE_ENV === 'production'
  ? ['https://your-actual-project-name.vercel.app']
  : ['http://localhost:3000'];
```

Then redeploy:
```bash
vercel --prod
```