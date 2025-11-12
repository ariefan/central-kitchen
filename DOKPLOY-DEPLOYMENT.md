# Dokploy Deployment Guide - Central Kitchen ERP

This guide walks you through deploying the Central Kitchen ERP system on Dokploy.

## Prerequisites

- [x] Dokploy installed and accessible at http://18.143.15.78:3000
- [ ] Domain names configured:
  - `api.personalapp.id` → Points to `18.143.15.78`
  - `erp.personalapp.id` → Points to `18.143.15.78`
- [ ] GitHub repository pushed and accessible
- [ ] Strong password for PostgreSQL database

---

## Step 1: Configure DNS Records

Before deploying, ensure your domain DNS is configured:

### DNS A Records Required:
| Subdomain | Type | Value |
|-----------|------|-------|
| api.personalapp.id | A | 18.143.15.78 |
| erp.personalapp.id | A | 18.143.15.78 |

**How to configure:**
1. Log into your domain registrar (e.g., Cloudflare, Namecheap, GoDaddy)
2. Add two A records pointing to your server IP
3. Wait 5-10 minutes for DNS propagation

---

## Step 2: Prepare Environment Variables

1. **Open `.env.production`** in your project
2. **Update the PostgreSQL password:**
   ```env
   POSTGRES_PASSWORD=YourSecurePassword123!@#
   ```
   - Use a strong password (min 16 characters)
   - Mix uppercase, lowercase, numbers, and symbols

3. **Review other settings** (already pre-configured):
   - JWT_SECRET: Already generated securely
   - NODE_ENV: Set to production
   - Domains: Configured for api.personalapp.id and erp.personalapp.id

---

## Step 3: Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Dokploy deployment"
git push origin main
```

---

## Step 4: Create Project in Dokploy

1. **Access Dokploy** at http://18.143.15.78:3000
2. **Log in** with your admin credentials
3. **Click "Create Project"**
   - **Project Name:** `central-kitchen-erp`
   - **Description:** Central Kitchen ERP System
4. **Click "Create"**

---

## Step 5: Deploy the Application

### Option A: Deploy from GitHub (Recommended)

1. **Inside the project, click "Create Service"**
2. **Select service type:** "Docker Compose"
3. **Configure the service:**
   - **Service Name:** `erp-system`
   - **Repository URL:** Your GitHub repository URL
   - **Branch:** `main`
   - **Docker Compose File Path:** `docker-compose.dokploy.yml`

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   POSTGRES_PASSWORD=YourSecurePassword123!@#
   JWT_SECRET=8ed6b3c027c3a419fe54398f805ce75a66cba82d7bab03a23b6c9fd8a25b7b1b
   NODE_ENV=production
   ```

5. **Configure Build Settings:**
   - **Auto Deploy:** Enable (automatically deploys on git push)
   - **Build Path:** `/` (root directory)

6. **Click "Deploy"**

### Option B: Deploy with Manual Docker Compose

If deploying manually via SSH:

```bash
# SSH into your server
ssh -i "C:\Users\arief\.ssh\dev.pem" ubuntu@ec2-18-143-15-78.ap-southeast-1.compute.amazonaws.com

# Clone your repository
git clone <your-repo-url>
cd central-kitchen

# Copy environment variables
cp .env.production .env

# Deploy with docker compose
docker compose -f docker-compose.dokploy.yml up -d
```

---

## Step 6: Configure SSL Certificates (Automatic with Traefik)

Dokploy uses Traefik which automatically obtains SSL certificates from Let's Encrypt.

The `docker-compose.dokploy.yml` includes Traefik labels that will:
- Automatically request SSL certificates for your domains
- Set up HTTP to HTTPS redirects
- Renew certificates automatically

**No manual configuration needed!** Just ensure:
- DNS records are properly configured
- Domains are pointing to your server IP
- Wait 2-3 minutes after deployment for certificates to be issued

---

## Step 7: Verify Deployment

### Check Services Status

In Dokploy dashboard:
- All services should show "Running" status
- Check logs for any errors

### Test the Application

1. **API Backend:** https://api.personalapp.id/health
   - Should return: `{"status":"healthy"}`

2. **Web Frontend:** https://erp.personalapp.id
   - Should load the ERP login page

### Check SSL Certificates

Both URLs should show:
- 🔒 Secure connection
- Valid SSL certificate from Let's Encrypt

---

## Step 8: Database Migration (First Time Only)

If this is your first deployment, run database migrations:

1. **In Dokploy, open the API service terminal** or SSH into the container:
   ```bash
   docker exec -it <api-container-name> sh
   ```

2. **Run migrations:**
   ```bash
   cd apps/erp-api
   npx drizzle-kit push
   ```

3. **Verify tables created:**
   ```bash
   # In the API container
   node -e "require('./dist/db').db.select().from(require('./dist/db/schema').users).then(console.log)"
   ```

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Dokploy Server                          │
│                   18.143.15.78:3000                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik (Port 80/443)                     │
│              - Auto SSL with Let's Encrypt                   │
│              - HTTP → HTTPS Redirect                         │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    │                    │
        ┌───────────┘                    └───────────┐
        ▼                                            ▼
┌──────────────────┐                      ┌──────────────────┐
│   API Backend    │                      │   Web Frontend   │
│ api.personalapp  │                      │ erp.personalapp  │
│   (Port 8000)    │◄─────────────────────│   (Port 80)      │
└──────────────────┘                      └──────────────────┘
        │
        │
        ▼
┌──────────────────┐
│   PostgreSQL DB  │
│   (Port 5432)    │
└──────────────────┘
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL database password | `SecurePass123!` |
| `JWT_SECRET` | Secret key for JWT tokens | Auto-generated |
| `NODE_ENV` | Node environment | `production` |
| `PORT` | API server port | `8000` |
| `LOG_LEVEL` | Logging level | `info` |

---

## Troubleshooting

### Issue: Services won't start

**Check logs in Dokploy:**
1. Navigate to your service
2. Click "Logs" tab
3. Look for error messages

**Common fixes:**
- Ensure environment variables are set correctly
- Check if PostgreSQL password matches in all services
- Verify database connection string

### Issue: SSL Certificate not issued

**Wait time:** SSL certificates can take 2-5 minutes to issue

**Requirements:**
- DNS must be properly configured
- Domains must resolve to server IP
- Ports 80 and 443 must be open in security group

**Check DNS:**
```bash
nslookup api.personalapp.id
nslookup erp.personalapp.id
```

Both should return: `18.143.15.78`

### Issue: Database connection failed

**Verify PostgreSQL is running:**
```bash
docker ps | grep postgres
```

**Check database logs:**
```bash
docker logs <postgres-container-name>
```

### Issue: Build failed

**Common causes:**
- Missing dependencies in package.json
- Docker build context issues
- Out of memory during build

**Solution:**
- Check build logs in Dokploy
- Increase server resources if needed
- Verify Dockerfile syntax

---

## Monitoring & Maintenance

### View Logs
In Dokploy dashboard:
- Navigate to your service
- Click "Logs" to view real-time logs
- Filter by service (api, web, postgres)

### Update Application
1. Push changes to GitHub
2. If auto-deploy enabled, Dokploy will automatically rebuild
3. Or manually trigger deployment in Dokploy dashboard

### Backup Database
```bash
# Create backup
docker exec <postgres-container> pg_dump -U postgres erp-api > backup.sql

# Restore backup
docker exec -i <postgres-container> psql -U postgres erp-api < backup.sql
```

### Scale Services
In Dokploy:
1. Navigate to service settings
2. Adjust resource limits
3. Click "Update"

---

## Security Checklist

- [x] Strong PostgreSQL password configured
- [x] JWT_SECRET is cryptographically secure
- [x] SSL certificates automatically managed
- [x] HTTP to HTTPS redirect enabled
- [x] Database not exposed to public internet
- [x] Health checks configured
- [ ] Regular database backups scheduled
- [ ] Monitoring and alerting configured
- [ ] Firewall rules reviewed

---

## Support

If you encounter issues:
1. Check Dokploy documentation: https://docs.dokploy.com
2. Review service logs in Dokploy dashboard
3. Verify DNS and SSL configuration
4. Check AWS Security Group settings

---

## Next Steps After Deployment

1. **Configure monitoring** - Set up health check alerts
2. **Schedule backups** - Automate database backups
3. **Set up CI/CD** - Configure GitHub Actions for testing
4. **Add custom domain** - Configure additional domains if needed
5. **Performance tuning** - Adjust resource limits based on usage

---

**Deployment Status:** Ready to deploy!

Access your Dokploy instance: http://18.143.15.78:3000
