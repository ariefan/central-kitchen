# Docker Quick Start Guide

This is a quick reference for deploying the ERP system using Docker.

## Prerequisites Checklist

- [ ] Linux server with Docker installed
- [ ] Docker Compose installed
- [ ] Domains pointing to server:
  - `erp.personalapp.id` → Server IP
  - `api.personalapp.id` → Server IP
- [ ] SSL certificates (or use self-signed for testing)

## Quick Deployment (5 Steps)

### 1. Setup Environment
```bash
cp .env.production.example .env.production
nano .env.production
```

Set these variables:
```bash
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-32-char-minimum-secret-key
```

### 2. Generate SSL Certificates (Choose One)

**For Testing (Self-Signed):**
```bash
mkdir -p nginx/ssl/{erp,api}.personalapp.id

# ERP Frontend
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/erp.personalapp.id/privkey.pem \
  -out nginx/ssl/erp.personalapp.id/fullchain.pem \
  -subj "/CN=erp.personalapp.id"

# API Backend
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/api.personalapp.id/privkey.pem \
  -out nginx/ssl/api.personalapp.id/fullchain.pem \
  -subj "/CN=api.personalapp.id"
```

**For Production (Let's Encrypt):**
```bash
./scripts/setup-ssl.sh
```

### 3. Deploy
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 4. Run Migrations
```bash
# Wait 10 seconds for database to be ready
sleep 10

# Run migrations
docker compose exec api sh -c "cd apps/erp-api && pnpm db:migrate"
```

### 5. Verify
```bash
# Check status
docker compose ps

# Test endpoints
curl -k https://api.personalapp.id/health
curl -k https://erp.personalapp.id/health
```

## Your Application URLs

- **Frontend**: https://erp.personalapp.id
- **Backend API**: https://api.personalapp.id
- **API Docs**: https://api.personalapp.id/docs
- **Health Check**: https://api.personalapp.id/health

## Common Commands

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

# Access database
docker compose exec postgres psql -U postgres -d erp-api

# Backup database
docker compose exec postgres pg_dump -U postgres erp-api > backup.sql
```

## Troubleshooting

### Check Service Health
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs api
docker compose logs web
docker compose logs postgres
```

### Rebuild Everything
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## File Structure

```
central-kitchen/
├── docker-compose.yml              # Main compose file
├── docker-compose.prod.yml         # Production overrides
├── .env.production                 # Your environment variables
├── .dockerignore                   # Files to ignore
├── nginx/
│   ├── nginx.conf                  # Main nginx config
│   ├── conf.d/
│   │   ├── api.personalapp.id.conf # API proxy config
│   │   └── erp.personalapp.id.conf # Web proxy config
│   └── ssl/                        # SSL certificates
│       ├── api.personalapp.id/
│       └── erp.personalapp.id/
├── apps/
│   ├── erp-api/
│   │   ├── Dockerfile              # API Docker image
│   │   └── ...
│   └── inventory/
│       ├── Dockerfile              # Frontend Docker image
│       ├── nginx.conf              # Frontend nginx config
│       └── ...
└── scripts/
    ├── deploy.sh                   # Automated deployment
    └── setup-ssl.sh                # SSL certificate setup
```

## Next Steps

1. Configure your DNS to point to your server
2. Set up SSL certificates (Let's Encrypt recommended)
3. Configure firewall rules
4. Set up automated backups
5. Monitor your application

For detailed information, see [DEPLOYMENT.md](DEPLOYMENT.md)
