# Docker Deployment - Central Kitchen ERP

Complete Docker setup for deploying the Central Kitchen ERP system to production with custom domains.

## Overview

This repository includes a complete Docker-based deployment configuration for running the ERP system on:
- **Frontend**: https://erp.personalapp.id
- **Backend API**: https://api.personalapp.id

## Architecture

The deployment consists of 4 Docker containers:

1. **PostgreSQL** - Database server (port 5432)
2. **API Backend** - Fastify Node.js application (port 8000)
3. **Web Frontend** - React/Vite application (port 80)
4. **Nginx** - Reverse proxy with SSL termination (ports 80, 443)

```
Internet
   ↓
Nginx (SSL/TLS Termination)
   ├→ erp.personalapp.id → Web Frontend
   └→ api.personalapp.id → API Backend
                               ↓
                          PostgreSQL
```

## Quick Start

See [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) for a fast deployment guide.

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Files Overview

### Docker Configuration Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | Base Docker Compose configuration |
| `docker-compose.prod.yml` | Production-specific overrides |
| `.dockerignore` | Files to exclude from Docker builds |
| `.env.production.example` | Template for production environment variables |

### Application Dockerfiles

| File | Description |
|------|-------------|
| `apps/erp-api/Dockerfile` | Multi-stage build for Node.js API |
| `apps/inventory/Dockerfile` | Multi-stage build for React frontend |
| `apps/inventory/nginx.conf` | Nginx config for serving React app |

### Nginx Configuration

| File | Description |
|------|-------------|
| `nginx/nginx.conf` | Main Nginx configuration |
| `nginx/conf.d/api.personalapp.id.conf` | API reverse proxy config |
| `nginx/conf.d/erp.personalapp.id.conf` | Frontend reverse proxy config |

### Deployment Scripts

| File | Description |
|------|-------------|
| `scripts/deploy.sh` | Automated production deployment |
| `scripts/setup-ssl.sh` | SSL certificate setup with Let's Encrypt |

### Documentation

| File | Description |
|------|-------------|
| `DEPLOYMENT.md` | Complete deployment guide |
| `DOCKER-QUICKSTART.md` | Quick reference guide |
| `README-DOCKER.md` | This file |

## Prerequisites

1. **Server Requirements**:
   - Ubuntu 20.04+ or similar Linux distribution
   - Minimum 2GB RAM, 2 CPU cores
   - 20GB available disk space
   - Root or sudo access

2. **Software Requirements**:
   - Docker 20.10+
   - Docker Compose 2.0+

3. **Domain Configuration**:
   - DNS A record: `erp.personalapp.id` → Your server IP
   - DNS A record: `api.personalapp.id` → Your server IP

4. **SSL Certificates**:
   - Let's Encrypt (recommended)
   - Or custom SSL certificates
   - Or self-signed for testing

## Environment Variables

Create `.env.production` with these required variables:

```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-password-here

# JWT Configuration
JWT_SECRET=your-minimum-32-character-secret-key-here
```

## Deployment Commands

### Initial Deployment
```bash
# 1. Configure environment
cp .env.production.example .env.production
nano .env.production

# 2. Setup SSL certificates
./scripts/setup-ssl.sh

# 3. Deploy
./scripts/deploy.sh
```

### Manual Deployment
```bash
# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"
```

### Management Commands
```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Database backup
docker compose exec postgres pg_dump -U postgres erp-api > backup.sql

# Update application
git pull
docker compose up -d --build
```

## Port Mapping

| Service | Internal Port | External Port | Access |
|---------|--------------|---------------|--------|
| Nginx | 80, 443 | 80, 443 | Public |
| API Backend | 8000 | - | Internal only |
| Web Frontend | 80 | - | Internal only |
| PostgreSQL | 5432 | - | Internal only |

## Security Features

1. **Non-root Users**: All containers run as non-root users
2. **Network Isolation**: Services communicate through internal Docker network
3. **SSL/TLS**: HTTPS enforced with automatic redirect
4. **Health Checks**: All services have built-in health monitoring
5. **Resource Limits**: CPU and memory limits in production
6. **Security Headers**: HSTS, X-Frame-Options, CSP, etc.

## Monitoring

### Health Checks
```bash
# Check all services
docker compose ps

# Test endpoints
curl https://api.personalapp.id/health
curl https://erp.personalapp.id/health
```

### Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
docker compose logs -f nginx
```

### Resource Usage
```bash
# Real-time stats
docker stats

# Disk usage
docker system df
```

## Backup & Recovery

### Database Backup
```bash
# Create backup
docker compose exec postgres pg_dump -U postgres erp-api > backup-$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T postgres psql -U postgres erp-api < backup-20250112.sql
```

### Volume Backup
```bash
# Stop services
docker compose down

# Backup volumes
sudo tar czf postgres-data-backup.tar.gz /var/lib/docker/volumes/central-kitchen_postgres_data

# Restore volumes
sudo tar xzf postgres-data-backup.tar.gz -C /
```

## Troubleshooting

### Common Issues

**Services won't start**
```bash
docker compose logs
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Database connection failed**
```bash
docker compose exec postgres pg_isready -U postgres
docker compose restart postgres
```

**SSL certificate errors**
```bash
ls -la nginx/ssl/*/
docker compose exec nginx nginx -t
```

**CORS errors**
- Check `apps/erp-api/src/app.ts` line 25-32
- Ensure domains are listed in `allowedOrigins`

### Debug Mode

Run containers in debug mode:
```bash
# View real-time logs
docker compose up

# Access container shell
docker compose exec api sh
docker compose exec web sh
```

## Performance Optimization

1. **Resource Limits**: Configured in `docker-compose.prod.yml`
2. **Caching**: Nginx caches static assets for 1 year
3. **Compression**: Gzip enabled for text content
4. **Connection Pooling**: PostgreSQL with persistent connections
5. **Health Checks**: Automatic restart of unhealthy containers

## Updating

### Application Updates
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"
```

### Database Migrations
```bash
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"
```

### System Updates
```bash
# Update Docker images
docker compose pull

# Update system packages
sudo apt update && sudo apt upgrade
```

## Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Debug Logs | ✅ Verbose | ⚠️ Info level |
| SSL | ⚠️ Optional | ✅ Required |
| Volumes | 📁 Local bind mounts | 💾 Named volumes |
| Build | 🔧 Development mode | 🚀 Production optimized |

## Support

For detailed deployment instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) - Quick reference

For issues:
1. Check service logs: `docker compose logs -f`
2. Verify environment variables
3. Check troubleshooting section
4. Review Docker documentation

## License

ISC
