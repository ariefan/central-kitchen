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

### Docker/Production Configuration with Traefik

**Domain Mapping:**
- **personalapp.id** → Landing Page
- **personalapp.id/api** → API Server
- **erp.personalapp.id** → ERP Application
- **erp.personalapp.id/api** → API Server
- **traefik.personalapp.id** → Traefik Dashboard

**Infrastructure:**
- **Traefik v3.2** reverse proxy with automatic service discovery
- Automatic HTTPS via Let's Encrypt
- Docker Compose with all services configured
- Health checks for all services
- Production resource limits configured
- Security headers and middlewares

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
   - Replaced Nginx with Traefik v3.2
   - Added Traefik labels to all services
   - Configured automatic service discovery
   - Added API stripprefix middleware
   - Updated volumes (removed nginx_cache, added traefik_letsencrypt)

6. **docker-compose.prod.yml**
   - Added HTTPS router configurations
   - Added Let's Encrypt certificate resolver
   - Added resource limits for all services
   - Configured secure routes for production

### New Files Created

1. **traefik/traefik.yml**
   - Static Traefik configuration
   - Entry points for HTTP (80) and HTTPS (443)
   - Docker provider configuration
   - Let's Encrypt certificate resolver
   - API and dashboard settings
   - Logging configuration

2. **traefik/dynamic.yml**
   - Dynamic configuration for middlewares
   - Security headers
   - Compression
   - Rate limiting

3. **README.docker.md**
   - Comprehensive Docker deployment guide with Traefik
   - SSL/HTTPS configuration instructions
   - Traefik-specific features and usage
   - Production deployment checklist
   - Scaling and monitoring instructions

4. **README.local-dev.md**
   - Comprehensive local development guide
   - Setup instructions
   - Troubleshooting tips
   - Environment variables reference

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
# Development (HTTP only)
docker-compose up --build

# Production (with HTTPS via Let's Encrypt)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 📊 Current Status

**Local Development:** ✅ TESTED AND WORKING
- All services running successfully
- All routes responding correctly
- Proxies working as expected

**Docker Configuration:** ✅ CONFIGURED WITH TRAEFIK
- Traefik reverse proxy configured
- Automatic HTTPS via Let's Encrypt
- Service discovery enabled
- Production-ready (not yet deployed)

## 🔗 URLs

### Local Development
- Landing Page: http://localhost:3000
- Landing Page API: http://localhost:3000/api/health
- ERP Application: http://localhost:3001
- ERP API: http://localhost:3001/api/health
- Direct API: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

### Production (When Deployed)
- Landing Page: https://personalapp.id
- Landing Page API: https://personalapp.id/api
- ERP Application: https://erp.personalapp.id
- ERP API: https://erp.personalapp.id/api
- Traefik Dashboard: https://traefik.personalapp.id

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
│                  DOCKER/PRODUCTION (Traefik)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                                                         │
│     │                                                            │
│     ├─→ personalapp.id ──┐                                      │
│     │                     │                                      │
│     ├─→ erp.personalapp.id ─┐                                   │
│     │                         │                                  │
│     └─→ traefik.personalapp.id ──→ Traefik (Auto HTTPS)         │
│                                     │                            │
│                                     ├─→ /api (strip prefix)      │
│                                     │   └─→ API Server:8000      │
│                                     │                            │
│                                     ├─→ personalapp.id           │
│                                     │   └─→ Landing:80           │
│                                     │                            │
│                                     ├─→ erp.personalapp.id       │
│                                     │   └─→ ERP:3000             │
│                                     │                            │
│                                     └─→ traefik.personalapp.id   │
│                                         └─→ Dashboard:8080       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### Local Development
- ✅ Single port access (3000 for landing, 3001 for ERP)
- ✅ Automatic API proxying (no CORS issues)
- ✅ Hot reload in development
- ✅ Simple configuration

### Docker/Production
- ✅ Traefik v3.2 reverse proxy
- ✅ Automatic HTTPS via Let's Encrypt
- ✅ Automatic service discovery
- ✅ Auto SSL certificate renewal
- ✅ Load balancing support
- ✅ Web dashboard for monitoring
- ✅ Domain-based routing
- ✅ Health checks for all services
- ✅ Security headers configured
- ✅ Compression and rate limiting
- ✅ Resource limits for production

## 🔧 Traefik Advantages Over Nginx

1. **Automatic Service Discovery**
   - No manual configuration needed when adding services
   - Discovers services via Docker labels
   - Hot reload without restarting proxy

2. **Built-in Let's Encrypt**
   - Automatic SSL certificate generation
   - Auto-renewal before expiration
   - HTTP to HTTPS redirect

3. **Modern Dashboard**
   - Web UI for monitoring
   - Real-time service status
   - Route inspection and debugging

4. **Native Docker Support**
   - Designed for containerized environments
   - Scales automatically with services
   - Health check integration

5. **Simpler Configuration**
   - Docker labels vs config files
   - No need to restart for route changes
   - Better suited for dynamic environments

## 📝 Important Notes

1. **Reverse Proxy**: Using Traefik v3.2 instead of Nginx
2. **Database**: Currently using remote database at 18.143.15.78:5432
3. **SSL/HTTPS**: Automatic via Let's Encrypt in production
4. **Before Deployment**: Update email in traefik/traefik.yml for Let's Encrypt notifications

## 📚 Documentation

- **Local Development Guide**: README.local-dev.md
- **Docker Deployment Guide**: README.docker.md
- **Environment Variables**: .env.local.example
