# Docker Deployment Guide

## Architecture

This project consists of three main services:

1. **Landing Page** (Vite/React) - Serves the marketing website
2. **ERP Application** (Next.js) - Main ERP application
3. **API Server** (Fastify) - Backend API service

## Domain Routing (Production)

- `personalapp.id` → Landing Page
- `personalapp.id/api` → API Server
- `erp.personalapp.id` → ERP Application
- `erp.personalapp.id/api` → API Server

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in docker-compose)
- SSL certificates for HTTPS (optional, but recommended)

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

## Building and Running

### Development Build

```bash
docker-compose up --build
```

### Production Build

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## SSL Configuration

### Option 1: Self-Signed Certificates (Development)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem
```

### Option 2: Let's Encrypt (Production)

1. Install Certbot:
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

2. Get certificates:
```bash
sudo certbot certonly --standalone -d personalapp.id -d www.personalapp.id -d erp.personalapp.id
```

3. Update docker-compose.prod.yml to use Let's Encrypt certificates (uncomment the volume mount)

## Health Checks

- Landing Page: `http://personalapp.id/health`
- ERP Application: `http://erp.personalapp.id/health`
- API Server: `http://personalapp.id/api/health`

## Monitoring

Check service status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f [service_name]
```

## Database Management

### Run migrations:
```bash
docker-compose exec api pnpm db:migrate
```

### Seed database:
```bash
docker-compose exec api pnpm db:seed
```

### Access PostgreSQL:
```bash
docker-compose exec postgres psql -U postgres -d erp-api
```

## Troubleshooting

### Service won't start
```bash
docker-compose logs [service_name]
```

### Clear all containers and volumes
```bash
docker-compose down -v
docker system prune -a
```

### Rebuild specific service
```bash
docker-compose up -d --build [service_name]
```

## Backup

### Database backup
```bash
docker-compose exec postgres pg_dump -U postgres erp-api > backup.sql
```

### Restore database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d erp-api
```
