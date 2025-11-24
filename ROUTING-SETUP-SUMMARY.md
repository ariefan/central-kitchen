# Routing Configuration Setup - Summary

## ✅ Completed Setup

### Local Development Configuration

**Port Mapping:**
- **localhost:3000** → Landing Page (Vite)
- **localhost:3000/api** → API Server (proxied from port 8000)
- **localhost:3001** → ERP Application (Next.js)
- **localhost:3001/api** → API Server (proxied from port 8000)
- **localhost:8000** → API Server (direct access)

**Test Results:**
```bash
# All tests passed ✓

✅ Landing Page (localhost:3000)
   Response: <title>Central Kitchen ERP - F&B Management Made Simple</title>

✅ API through Landing Page Proxy (localhost:3000/api/health)
   Response: {"success":true,"data":{"status":"healthy",...},"message":"Service is healthy"}

✅ ERP Application (localhost:3001)
   Status: Running on Next.js 16.0.3 with Turbopack

✅ API through ERP Proxy (localhost:3001/api/health)
   Response: {"success":true,"data":{"status":"healthy",...},"message":"Service is healthy"}

✅ Direct API Access (localhost:8000/health)
   Response: {"success":true,"data":{"status":"healthy",...},"message":"Service is healthy"}
```

### Docker/Production Configuration

**Domain Mapping:**
- **personalapp.id** → Landing Page
- **personalapp.id/api** → API Server
- **erp.personalapp.id** → ERP Application
- **erp.personalapp.id/api** → API Server

**Infrastructure:**
- Nginx reverse proxy for domain-based routing
- Docker Compose with all three services
- Health checks for all services
- Production resource limits configured

## 📁 Files Modified

### Configuration Files
1. **apps/landing-page/vite.config.ts**
   - Changed port from 3001 to 3000
   - Added proxy configuration for /api routes

2. **apps/erp/package.json**
   - Updated dev script to run on port 3001
   - Updated start script to run on port 3001

3. **apps/erp/next.config.ts**
   - Updated API rewrite rule to proxy /api requests
   - Configured for both local and production environments

4. **package.json** (root)
   - Updated scripts for landing-page
   - Fixed paths for build and start scripts

5. **docker-compose.yml**
   - Added ERP service configuration
   - Added Landing Page service configuration
   - Updated Nginx dependencies

6. **docker-compose.prod.yml**
   - Added resource limits for ERP service
   - Added resource limits for Landing Page service

### New Files Created

1. **nginx/nginx.conf**
   - Main Nginx configuration
   - Gzip compression settings
   - Logging configuration

2. **nginx/conf.d/default.conf**
   - Domain-based routing rules
   - Upstream server configurations
   - Security headers

3. **README.local-dev.md**
   - Comprehensive local development guide
   - Setup instructions
   - Troubleshooting tips
   - Environment variables reference

4. **README.docker.md**
   - Docker deployment guide
   - SSL configuration instructions
   - Database management commands
   - Monitoring and troubleshooting

5. **.env.local.example**
   - Example environment variables for local development

## 🚀 How to Run

### Local Development

```bash
# Install dependencies
pnpm install

# Run all services at once
pnpm dev

# Or run individually
pnpm dev:api      # API server on port 8000
pnpm dev:landing  # Landing page on port 3000
pnpm dev:erp      # ERP app on port 3001
```

### Docker Deployment

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 📊 Current Status

**Local Development:** ✅ TESTED AND WORKING
- All services running successfully
- All routes responding correctly
- Proxies working as expected

**Docker Configuration:** ✅ PREPARED
- Nginx configuration created
- Docker Compose files updated
- Ready for deployment (not yet deployed)

## 🔗 URLs

### Local Development
- Landing Page: http://localhost:3000
- Landing Page API: http://localhost:3000/api/health
- ERP Application: http://localhost:3001
- ERP API: http://localhost:3001/api/health
- Direct API: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

### Production (When Deployed)
- Landing Page: http://personalapp.id
- Landing Page API: http://personalapp.id/api
- ERP Application: http://erp.personalapp.id
- ERP API: http://erp.personalapp.id/api

## 📝 Notes

1. **Database**: Currently using remote database at 18.143.15.78:5432
   - For local PostgreSQL, update DATABASE_URL in apps/erp-api/.env

2. **Environment Variables**:
   - API: See apps/erp-api/.env.example
   - Local reference: See .env.local.example

3. **SSL/HTTPS**:
   - Production setup requires SSL certificates
   - See README.docker.md for SSL configuration options

4. **Next Steps**:
   - Deploy to Docker when ready
   - Configure SSL certificates for production
   - Set up proper secrets management for production environment variables

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOCAL DEVELOPMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                                                         │
│     │                                                            │
│     ├─→ localhost:3000 ────→ Landing Page (Vite)                │
│     │   └─→ /api/* ────────→ localhost:8000 (API Server)        │
│     │                                                            │
│     ├─→ localhost:3001 ────→ ERP App (Next.js)                  │
│     │   └─→ /api/* ────────→ localhost:8000 (API Server)        │
│     │                                                            │
│     └─→ localhost:8000 ────→ API Server (Fastify)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      DOCKER/PRODUCTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                                                         │
│     │                                                            │
│     ├─→ personalapp.id ──┐                                      │
│     │                     │                                      │
│     └─→ erp.personalapp.id ──→ Nginx Reverse Proxy              │
│                               │                                  │
│                               ├─→ /api/* ──→ API Server:8000    │
│                               ├─→ / ───────→ Landing Page:80    │
│                               └─→ erp.* ───→ ERP App:3000       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

- ✅ Single port access (3000 for landing, 3001 for ERP)
- ✅ Automatic API proxying (no CORS issues)
- ✅ Hot reload in development
- ✅ Production-ready Nginx configuration
- ✅ Domain-based routing for production
- ✅ Health checks for all services
- ✅ Comprehensive documentation
- ✅ Resource limits for production
- ✅ Security headers configured

## 🔧 Troubleshooting

See detailed troubleshooting guides in:
- README.local-dev.md (for local development)
- README.docker.md (for Docker deployment)
