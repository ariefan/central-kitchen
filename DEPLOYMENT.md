# Deployment Guide

This guide covers both Docker deployment (recommended for production) and Vercel deployment options.

## Table of Contents
- [Docker Deployment (Production)](#docker-deployment-production)
- [Vercel Deployment (Alternative)](#vercel-deployment-alternative)

---

## Docker Deployment (Production)

### Prerequisites

1. **Server Requirements:**
   - Linux server (Ubuntu 20.04+ recommended)
   - Minimum 2GB RAM, 2 CPU cores
   - 20GB storage
   - Docker and Docker Compose installed

2. **Domain Configuration:**
   - Point `erp.personalapp.id` to your server IP
   - Point `api.personalapp.id` to your server IP

3. **Install Docker & Docker Compose:**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Install Docker Compose
   sudo apt-get update
   sudo apt-get install docker-compose-plugin

   # Verify installation
   docker --version
   docker compose version
   ```

### Quick Start Deployment

#### 1. Clone Repository
```bash
git clone <your-repo-url>
cd central-kitchen
```

#### 2. Configure Environment Variables
```bash
# Copy and edit production environment file
cp .env.production.example .env.production
nano .env.production
```

**Required Variables in `.env.production`:**
```bash
# Database password (change this!)
POSTGRES_PASSWORD=your-secure-password-here

# JWT Secret (minimum 32 characters - change this!)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

#### 3. Setup SSL Certificates

**Option A: Using Let's Encrypt (Recommended)**
```bash
# Install certbot
sudo apt-get install certbot

# Run SSL setup script
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

**Option B: Manual Certificate Setup**
```bash
# Place your SSL certificates in:
# - nginx/ssl/erp.personalapp.id/fullchain.pem
# - nginx/ssl/erp.personalapp.id/privkey.pem
# - nginx/ssl/api.personalapp.id/fullchain.pem
# - nginx/ssl/api.personalapp.id/privkey.pem
```

**Option C: Self-Signed Certificates (Development/Testing Only)**
```bash
# Generate self-signed certificates
mkdir -p nginx/ssl/erp.personalapp.id nginx/ssl/api.personalapp.id

# For erp.personalapp.id
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/erp.personalapp.id/privkey.pem \
  -out nginx/ssl/erp.personalapp.id/fullchain.pem \
  -subj "/CN=erp.personalapp.id"

# For api.personalapp.id
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/api.personalapp.id/privkey.pem \
  -out nginx/ssl/api.personalapp.id/fullchain.pem \
  -subj "/CN=api.personalapp.id"
```

#### 4. Deploy with Automated Script
```bash
# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**OR Deploy Manually:**
```bash
# Build and start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for database to be ready (about 10 seconds)
sleep 10

# Run database migrations
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"

# (Optional) Seed database with sample data
docker compose exec api sh -c "cd apps/erp-api && pnpm db:seed"
```

#### 5. Verify Deployment
```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f

# Test endpoints
curl https://api.personalapp.id/health
curl https://erp.personalapp.id/health
```

### Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Internet Traffic                │
└─────────────┬───────────────────────────┘
              │
     ┌────────▼────────┐
     │  Nginx Proxy    │ (Port 80, 443)
     │  - SSL/TLS      │
     │  - Load Balance │
     └────┬──────┬─────┘
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

**Service URLs:**
- Frontend: `https://erp.personalapp.id`
- Backend API: `https://api.personalapp.id`
- API Documentation: `https://api.personalapp.id/docs`
- Health Check: `https://api.personalapp.id/health`

### Common Operations

#### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
docker compose logs -f nginx
```

#### Restart Services
```bash
# All services
docker compose restart

# Specific service
docker compose restart api
docker compose restart web
```

#### Stop Services
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

#### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run migrations if needed
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"
```

#### Database Operations
```bash
# Access PostgreSQL CLI
docker compose exec postgres psql -U postgres -d erp-api

# Backup database
docker compose exec postgres pg_dump -U postgres erp-api > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres erp-api < backup.sql

# Run migrations
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"

# Seed database
docker compose exec api sh -c "cd apps/erp-api && pnpm db:seed"
```

#### Access Container Shell
```bash
# API container
docker compose exec api sh

# Web container
docker compose exec web sh

# Database container
docker compose exec postgres sh
```

### Monitoring & Maintenance

#### Health Checks
All services have built-in health checks:
```bash
# Check service health
docker compose ps

# All services should show "healthy" status
```

#### Resource Usage
```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

#### Clean Up
```bash
# Remove stopped containers
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Clean up unused images
docker image prune -a

# Full cleanup
docker system prune -a --volumes
```

### SSL Certificate Renewal

Let's Encrypt certificates auto-renew. To manually renew:
```bash
sudo certbot renew
docker compose restart nginx
```

### Troubleshooting

#### Services Won't Start
```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs api

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker compose exec postgres pg_isready -U postgres

# Check environment variables
docker compose exec api env | grep DATABASE

# Restart database
docker compose restart postgres
```

#### CORS Errors
Check that API is configured to accept requests from your frontend domain.
Edit `apps/erp-api/src/app.ts` and ensure CORS origins include your domains.

#### SSL Certificate Issues
```bash
# Check certificate files exist
ls -la nginx/ssl/*/

# Verify certificate validity
openssl x509 -in nginx/ssl/api.personalapp.id/fullchain.pem -text -noout

# Check nginx configuration
docker compose exec nginx nginx -t
```

### Security Best Practices

1. **Change Default Passwords:**
   - Update `POSTGRES_PASSWORD` in `.env.production`
   - Update `JWT_SECRET` to a strong random string

2. **Firewall Configuration:**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

3. **Regular Updates:**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade

   # Update Docker images
   docker compose pull
   docker compose up -d
   ```

4. **Backup Strategy:**
   - Schedule regular database backups
   - Store backups off-site
   - Test restore procedures regularly

---

## Vercel Deployment (Alternative)

### Quick Deploy Steps

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Login to Vercel
```bash
vercel login
```

#### 3. Deploy
```bash
vercel --prod
```

### Environment Variables

Set these in your Vercel dashboard:

#### Backend Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - "production"
- `JWT_SECRET` - Your JWT secret (min 32 characters)
- `HOST` - "0.0.0.0"
- `PORT` - "8000"

#### Frontend Environment Variables:
- `VITE_API_URL` - Will be set automatically to your Vercel URL

### What Happens Automatically

✅ **Frontend**: Builds and deploys to `your-project-name.vercel.app`
✅ **Backend**: Deploys as serverless functions at same URL
✅ **Routing**: API calls are proxied to backend functions
✅ **Database**: Works with any PostgreSQL connection
✅ **CORS**: Configured for Vercel domains

### Deployment URLs

After deployment:
- **Frontend**: `https://your-project-name.vercel.app`
- **API**: `https://your-project-name.vercel.app/api/v1/...`
- **Health Check**: `https://your-project-name.vercel.app/health`
- **API Docs**: `https://your-project-name.vercel.app/docs`

### Database Setup

#### Your Demo Database (Ready to Use)
Set this exact string as `DATABASE_URL` in Vercel dashboard:
```
postgresql://neondb_owner:npg_dhv2iot6VjnS@ep-twilight-sound-adx9bc6d-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Common Issues

#### CORS Errors
Make sure your Vercel URL is in the CORS origins in `apps/erp-api/src/app.ts:26`

#### Database Connection
Test your `DATABASE_URL` locally first:
```bash
psql "your-connection-string"
```

#### Build Failures
Check that all dependencies are installed:
```bash
pnpm install
pnpm build
```

### Local Development

```bash
# Terminal 1: Backend
pnpm dev:api

# Terminal 2: Frontend
pnpm dev:web
```

### Updating CORS Origins

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

---

## Comparison: Docker vs Vercel

| Feature | Docker (Recommended) | Vercel |
|---------|---------------------|--------|
| Custom Domains | ✅ Full control | ⚠️ Limited |
| SSL Certificates | ✅ Your certificates | ✅ Automatic |
| Database | ✅ Self-hosted PostgreSQL | ⚠️ External required |
| Cost | 💰 Server costs only | 💰 May have usage limits |
| Scalability | ⚙️ Manual scaling | ✅ Auto-scaling |
| Control | ✅ Full control | ⚠️ Platform limits |
| Setup Complexity | ⚙️ Moderate | ✅ Simple |
| Best For | Production | Quick demos |

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service logs: `docker compose logs -f`
3. Verify environment variables are set correctly
4. Ensure all prerequisites are met

## License

ISC
