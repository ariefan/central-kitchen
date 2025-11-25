# Docker Deployment Guide with Traefik

## Architecture

This project consists of three main services with Traefik as the reverse proxy:

1. **Landing Page** (Vite/React) - Serves the marketing website
2. **ERP Application** (Next.js) - Main ERP application
3. **API Server** (Fastify) - Backend API service
4. **Traefik** - Modern reverse proxy with automatic HTTPS

## Domain Routing (Production)

- `personalapp.id` → Landing Page
- `personalapp.id/api` → API Server (strips /api prefix)
- `erp.personalapp.id` → ERP Application
- `erp.personalapp.id/api` → API Server (strips /api prefix)
- `traefik.personalapp.id` → Traefik Dashboard

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in docker-compose)
- Domain names pointing to your server:
  - `personalapp.id`
  - `www.personalapp.id`
  - `erp.personalapp.id`
  - `traefik.personalapp.id` (optional, for dashboard)

## Environment Variables

Create a `.env.production` file in the root directory with the following variables:

```env
# Database
POSTGRES_PASSWORD=your_secure_postgres_password

# API
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars
BETTER_AUTH_URL=https://personalapp.id
FRONTEND_URL=https://erp.personalapp.id

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

## Traefik Configuration

### Static Configuration (`traefik/traefik.yml`)

The static configuration includes:
- **Entry Points**: HTTP (80) and HTTPS (443)
- **Docker Provider**: Automatic service discovery
- **Let's Encrypt**: Automatic SSL certificate generation
- **Dashboard**: Web UI for monitoring (port 8080)

### Dynamic Configuration (`traefik/dynamic.yml`)

Includes middleware for:
- Security headers
- Compression
- Rate limiting

### SSL Certificates

Traefik automatically obtains and renews SSL certificates from Let's Encrypt:

1. **Email Configuration**: Update the email in `traefik/traefik.yml`:
   ```yaml
   certificatesResolvers:
     letsencrypt:
       acme:
         email: your-email@example.com  # Change this
   ```

2. **Testing**: For testing, uncomment the staging CA server in `traefik/traefik.yml`:
   ```yaml
   caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
   ```

3. **Production**: Remove or comment out the staging CA server line

## Building and Running

### Development Build (HTTP only)

```bash
docker-compose up --build
```

This will start all services with HTTP access on port 80.

### Production Build (with HTTPS)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This adds:
- HTTPS on port 443
- Automatic SSL certificate generation
- HTTP to HTTPS redirect
- Production resource limits

## Service Ports

- **80**: HTTP (Traefik)
- **443**: HTTPS (Traefik)
- **8080**: Traefik Dashboard
- **3000**: ERP App (internal)
- **8000**: API Server (internal)
- **80**: Landing Page nginx (internal)

## Traefik Dashboard

Access the dashboard at:
- HTTP: `http://traefik.personalapp.id:8080`
- HTTPS (Production): `https://traefik.personalapp.id`

**Security Note**: In production, secure the dashboard with authentication. Update `traefik/traefik.yml`:
```yaml
api:
  dashboard: true
  insecure: false  # Disable insecure access
```

Then add basic auth middleware in the docker-compose labels.

## Monitoring and Management

### Check Service Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f traefik
docker-compose logs -f api
docker-compose logs -f erp
docker-compose logs -f landing
```

### View Traefik Routes

```bash
# Check Traefik dashboard at http://your-server:8080
# Or use the API
curl http://localhost:8080/api/http/routers
```

## Database Management

### Run Migrations

```bash
docker-compose exec api pnpm db:migrate
```

### Seed Database

```bash
docker-compose exec api pnpm db:seed
```

### Access PostgreSQL

```bash
docker-compose exec postgres psql -U postgres -d erp-api
```

## Health Checks

All services have health checks configured:

- **API**: `http://api:8000/health`
- **ERP**: `http://erp:3000/`
- **Landing**: `http://landing/`
- **Traefik**: Built-in health check

Check health status:
```bash
docker-compose ps
```

## Traefik Features

### Automatic Service Discovery

Traefik automatically discovers services through Docker labels. No need to restart Traefik when adding new services.

### Automatic HTTPS

Let's Encrypt certificates are automatically:
- Requested on first access
- Renewed before expiration
- Stored in the `traefik_letsencrypt` volume

### Load Balancing

Traefik automatically load balances if you scale services:
```bash
docker-compose up -d --scale api=3
```

### Middlewares

Configure in service labels:
```yaml
labels:
  - "traefik.http.routers.myservice.middlewares=compress,security"
```

## Troubleshooting

### Service Won't Start

```bash
docker-compose logs [service_name]
```

### SSL Certificate Issues

1. Check Let's Encrypt rate limits
2. Verify DNS is pointing to your server
3. Check Traefik logs: `docker-compose logs traefik`
4. Use staging environment for testing

### Traefik Can't Connect to Services

1. Verify all services are on the same network: `erp-network`
2. Check service labels are correct
3. Inspect Traefik dashboard for errors

### Clear All Containers and Volumes

```bash
docker-compose down -v
docker system prune -a
```

### Rebuild Specific Service

```bash
docker-compose up -d --build [service_name]
```

## Backup

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres erp-api > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d erp-api
```

### Backup SSL Certificates

```bash
docker run --rm -v traefik_letsencrypt:/data -v $(pwd):/backup \
  alpine tar czf /backup/letsencrypt-backup.tar.gz -C /data .
```

## Security Best Practices

1. **Secure Traefik Dashboard**
   - Use authentication middleware
   - Restrict access by IP if possible
   - Use HTTPS only

2. **Environment Variables**
   - Never commit `.env` files
   - Use strong secrets (32+ characters)
   - Rotate secrets regularly

3. **Network Isolation**
   - Services communicate through Docker network
   - Only Traefik exposes ports to the host

4. **Resource Limits**
   - Configured in `docker-compose.prod.yml`
   - Prevents resource exhaustion

5. **Regular Updates**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## Production Deployment Checklist

- [ ] DNS records configured for all domains
- [ ] Email updated in `traefik/traefik.yml`
- [ ] Strong passwords in `.env.production`
- [ ] Tested with Let's Encrypt staging first
- [ ] Traefik dashboard secured with authentication
- [ ] Database backups configured
- [ ] Monitoring and logging set up
- [ ] Resource limits appropriate for your server
- [ ] HTTP to HTTPS redirect enabled
- [ ] Security headers configured

## Scaling

Scale individual services:

```bash
# Scale API servers
docker-compose up -d --scale api=3

# Scale ERP frontend
docker-compose up -d --scale erp=2
```

Traefik automatically load balances across scaled instances.

## Useful Commands

```bash
# View Traefik configuration
docker-compose exec traefik cat /etc/traefik/traefik.yml

# Check which ports are listening
docker-compose ps

# Restart a service
docker-compose restart api

# Update and restart all services
docker-compose pull && docker-compose up -d

# View resource usage
docker stats

# Clean up unused images
docker image prune -a
```

## Advanced Configuration

### Custom Domain for Local Testing

Add to your `/etc/hosts`:
```
127.0.0.1 personalapp.id
127.0.0.1 www.personalapp.id
127.0.0.1 erp.personalapp.id
127.0.0.1 traefik.personalapp.id
```

### Custom Middleware

Add to `traefik/dynamic.yml`:
```yaml
http:
  middlewares:
    custom-auth:
      basicAuth:
        users:
          - "admin:$apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/"
```

Use in service labels:
```yaml
- "traefik.http.routers.myservice.middlewares=custom-auth"
```

## Support and Documentation

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
