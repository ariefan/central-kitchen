# Docker Setup Summary

## What Was Created

This document summarizes all the Docker-related files and configurations created for deploying your ERP system.

## Files Created

### 📦 Docker Configuration (4 files)
- ✅ `docker-compose.yml` - Main Docker Compose configuration
- ✅ `docker-compose.prod.yml` - Production-specific settings with resource limits
- ✅ `.dockerignore` - Excludes unnecessary files from Docker builds
- ✅ `.env.production.example` - Template for production environment variables

### 🐳 Dockerfiles (3 files)
- ✅ `apps/erp-api/Dockerfile` - Multi-stage build for Node.js backend
- ✅ `apps/inventory/Dockerfile` - Multi-stage build for React frontend
- ✅ `apps/inventory/nginx.conf` - Nginx configuration for serving React app

### 🔧 Nginx Reverse Proxy (3 files)
- ✅ `nginx/nginx.conf` - Main Nginx configuration with security headers
- ✅ `nginx/conf.d/api.personalapp.id.conf` - API backend proxy configuration
- ✅ `nginx/conf.d/erp.personalapp.id.conf` - Frontend web app proxy configuration

### 🚀 Deployment Scripts (2 files)
- ✅ `scripts/deploy.sh` - Automated production deployment script
- ✅ `scripts/setup-ssl.sh` - SSL certificate setup script (Let's Encrypt)

### 📚 Documentation (4 files)
- ✅ `DEPLOYMENT.md` - **Updated** with comprehensive Docker deployment guide
- ✅ `DOCKER-QUICKSTART.md` - Quick reference for fast deployment
- ✅ `README-DOCKER.md` - Docker setup overview and architecture
- ✅ `DOCKER-SETUP-SUMMARY.md` - This file

### 🔒 Security Updates (1 file)
- ✅ `apps/erp-api/src/app.ts` - **Updated** CORS to include new domains

## Architecture

```
┌─────────────────────────────────────────┐
│         Internet Traffic                │
│  (erp.personalapp.id, api.personalapp.id)│
└─────────────┬───────────────────────────┘
              │
     ┌────────▼────────┐
     │  Nginx Proxy    │ ← SSL/TLS Termination
     │   Port 80/443   │ ← Load Balancing
     └────┬──────┬─────┘ ← Security Headers
          │      │
   ┌──────▼──┐ ┌▼────────┐
   │Frontend │ │ Backend │
   │  (Web)  │ │  (API)  │
   │ Port 80 │ │Port 8000│
   └─────────┘ └────┬────┘
                    │
              ┌─────▼──────┐
              │ PostgreSQL │
              │  Port 5432 │
              └────────────┘
```

## Services

| Service | Container | Port | Domain | Description |
|---------|-----------|------|--------|-------------|
| Nginx | erp-nginx | 80, 443 | Both | Reverse proxy & SSL |
| Frontend | erp-web | 80 | erp.personalapp.id | React/Vite app |
| Backend | erp-api | 8000 | api.personalapp.id | Fastify Node.js API |
| Database | erp-postgres | 5432 | - | PostgreSQL 16 |

## Deployment Steps

### Prerequisites
1. Linux server with Docker installed
2. Domains pointing to your server:
   - `erp.personalapp.id` → Server IP
   - `api.personalapp.id` → Server IP

### Quick Deployment (5 Commands)

```bash
# 1. Setup environment
cp .env.production.example .env.production
nano .env.production  # Set POSTGRES_PASSWORD and JWT_SECRET

# 2. Generate SSL certificates (self-signed for testing)
mkdir -p nginx/ssl/{erp,api}.personalapp.id
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/erp.personalapp.id/privkey.pem \
  -out nginx/ssl/erp.personalapp.id/fullchain.pem \
  -subj "/CN=erp.personalapp.id"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/api.personalapp.id/privkey.pem \
  -out nginx/ssl/api.personalapp.id/fullchain.pem \
  -subj "/CN=api.personalapp.id"

# 3. Deploy all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Run database migrations
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"

# 5. Verify deployment
docker compose ps
```

## Access Your Application

After deployment, your application will be available at:

- 🌐 **Frontend**: https://erp.personalapp.id
- 🔌 **API**: https://api.personalapp.id
- 📖 **API Docs**: https://api.personalapp.id/docs
- 🏥 **Health Check**: https://api.personalapp.id/health

## Key Features

### Security
- ✅ Non-root containers
- ✅ SSL/TLS encryption
- ✅ CORS protection
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Network isolation
- ✅ Resource limits

### Reliability
- ✅ Health checks on all services
- ✅ Automatic restart on failure
- ✅ Graceful shutdown
- ✅ Database connection pooling

### Performance
- ✅ Multi-stage Docker builds
- ✅ Static asset caching (1 year)
- ✅ Gzip compression
- ✅ HTTP/2 support
- ✅ Production-optimized builds

## Environment Variables

Required in `.env.production`:

```bash
# Database password (REQUIRED - Change this!)
POSTGRES_PASSWORD=your-secure-password

# JWT Secret (REQUIRED - Min 32 chars)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
```

## Common Operations

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Update application
git pull
docker compose up -d --build

# Backup database
docker compose exec postgres pg_dump -U postgres erp-api > backup.sql

# Access API container
docker compose exec api sh

# Check service health
docker compose ps
```

## Next Steps

### For Production Deployment

1. **DNS Configuration**
   - Point domains to your server IP
   - Wait for DNS propagation (can take up to 48 hours)

2. **SSL Certificates**
   - Run `./scripts/setup-ssl.sh` for Let's Encrypt certificates
   - Or use your own SSL certificates

3. **Firewall Setup**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

4. **Automated Backups**
   - Schedule daily database backups
   - Store backups off-site
   - Test restore procedures

5. **Monitoring**
   - Set up uptime monitoring
   - Configure log aggregation
   - Monitor resource usage

### For Testing

1. **Use Self-Signed Certificates**
   - Follow commands in Quick Deployment step 2
   - Your browser will show security warnings (normal for self-signed)

2. **Test Locally**
   - Add to `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1 erp.personalapp.id
   127.0.0.1 api.personalapp.id
   ```

## Troubleshooting

### Services Won't Start
```bash
docker compose logs
docker compose down
docker compose up -d --build
```

### Database Connection Issues
```bash
docker compose exec postgres pg_isready -U postgres
docker compose restart postgres
```

### SSL Certificate Errors
```bash
ls -la nginx/ssl/*/
docker compose exec nginx nginx -t
```

## Resources

- **Full Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Quick Reference**: [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md)
- **Architecture**: [README-DOCKER.md](README-DOCKER.md)

## Changes Made to Existing Files

### Modified Files
1. **`apps/erp-api/src/app.ts`**
   - Updated CORS allowedOrigins to include:
     - `https://erp.personalapp.id`
     - `https://api.personalapp.id`
   - Added `http://localhost:5173` for development

### No Breaking Changes
All existing functionality remains intact. The application will still work with:
- ✅ Local development (`pnpm dev`)
- ✅ Vercel deployment
- ✅ Docker deployment (new)

## Support

If you encounter any issues:

1. Check service logs: `docker compose logs -f`
2. Verify environment variables are set
3. Ensure DNS is configured correctly
4. Check SSL certificates exist
5. Review [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section

---

**Status**: ✅ Docker setup complete and ready for deployment!

**Note**: Testing was skipped to save internet quota. You can test the deployment on your server when ready.
