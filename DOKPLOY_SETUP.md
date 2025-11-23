# Dokploy Deployment Setup Guide

This guide explains how to deploy the ERP system to Dokploy with the new same-domain proxy configuration to fix cookie issues.

## Architecture

**Before (Cross-Origin - Cookie Issues):**
- Frontend: `erp.personalapp.id` → `apps/erp`
- API: `api.personalapp.id` → `apps/erp-api`
- ❌ Cookies don't work properly across different subdomains

**After (Same-Domain - Cookies Work):**
- Frontend: `erp.personalapp.id` → `apps/erp`
- API: `erp.personalapp.id/api` → proxied to `apps/erp-api`
- ✅ Everything on same domain, cookies work perfectly!

## Dokploy Configuration

### 1. ERP API Service (apps/erp-api)

**Service Name:** `erp-api` (or your actual service name in Dokploy)

**Domain Configuration:**
- ❌ **REMOVE** the domain `api.personalapp.id` from this service
- ℹ️ This service should NOT have any public domain
- ℹ️ It will only be accessible internally via Docker network

**Environment Variables:**
```env
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
DATABASE_URL=your-database-url
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=https://erp.personalapp.id/api
FRONTEND_URL=https://erp.personalapp.id
```

**Port:** `8000` (internal only)

### 2. ERP Frontend Service (apps/erp)

**Service Name:** `erp` (or your actual service name in Dokploy)

**Domain Configuration:**
- ✅ Domain: `erp.personalapp.id`
- ✅ HTTPS: Enabled
- ✅ Certificate: Let's Encrypt

**Environment Variables:**
```env
NODE_ENV=production
PORT=3000
API_SERVICE_URL=http://erp-api:8000
```

**Important Notes:**
- `API_SERVICE_URL` should point to the **internal Docker service name** of your API
- If your API service is named `erp-api` in Dokploy, use `http://erp-api:8000`
- If it has a different name, use `http://<your-api-service-name>:8000`
- This is how the Next.js rewrite proxy will connect to the API internally

**Port:** `3000`

### 3. Landing Page Service (apps/landing-page)

**Domain Configuration:**
- ✅ Domain: `personalapp.id`
- ✅ HTTPS: Enabled

No changes needed for the landing page.

## How It Works

1. User visits `erp.personalapp.id` → Next.js frontend
2. Frontend makes API call to `/api/auth/session`
3. Next.js rewrites `/api/*` to `http://erp-api:8000/api/*` (internal Docker network)
4. API responds with cookies set for `erp.personalapp.id`
5. Browser stores cookies for `erp.personalapp.id`
6. All subsequent requests include cookies automatically ✅

## Verification Steps

After deployment, verify the setup:

1. **Check Network Tab:**
   - Open DevTools → Network
   - Look for API calls
   - They should go to `erp.personalapp.id/api/...` (NOT `api.personalapp.id`)

2. **Check Cookies:**
   - Open DevTools → Application → Cookies
   - Look for cookies under `erp.personalapp.id`
   - Should see `session_token` and other auth cookies

3. **Test Login Flow:**
   - Go to `erp.personalapp.id`
   - Login with credentials
   - Should stay logged in (NOT redirect back to login)

## Troubleshooting

### Issue: Still redirecting to login after successful login

**Check:**
- Verify `API_SERVICE_URL` is set correctly in frontend environment
- Check API service logs for CORS errors
- Verify cookies are being set in DevTools

**Solution:**
```bash
# In Dokploy, check frontend logs:
# Should see: "Using rewrites to proxy API requests"

# Check API logs for:
# - Incoming requests from frontend
# - No CORS errors
```

### Issue: 404 on API requests

**Check:**
- Verify API service is running: `http://erp-api:8000/health`
- Check `API_SERVICE_URL` matches your actual API service name

**Solution:**
- Update `API_SERVICE_URL` to match your Dokploy service name
- Example: If service is named `centralkitchen-api`, use `http://centralkitchen-api:8000`

### Issue: CORS errors in console

**Check:**
- API should allow `https://erp.personalapp.id` in CORS origins
- API should allow internal origins for rewrites

**Solution:**
- Already configured in `apps/erp-api/src/app.ts`
- Verify no environment variables are overriding CORS settings

## Docker Service Names

To find your API service name in Dokploy:
1. Go to your API service settings
2. Look for "Service Name" or check the Docker container name
3. Use that name in `API_SERVICE_URL`

Common patterns:
- `erp-api:8000`
- `centralkitchen-api:8000`
- `<project>-<service>:8000`

## Security Improvements

With this new setup, we get better security:

✅ **SameSite=Lax** instead of SameSite=None (more secure)
✅ **No cross-origin requests** (everything on same domain)
✅ **Simpler CORS configuration** (fewer attack vectors)
✅ **Better cookie isolation** (domain-specific cookies)

## Summary

**What to change in Dokploy:**

1. **Remove** domain from API service (`api.personalapp.id`)
2. **Add** `API_SERVICE_URL=http://erp-api:8000` to frontend service
3. **Update** `BETTER_AUTH_URL=https://erp.personalapp.id/api` in API service
4. **Redeploy** both services

That's it! Your cookies will work perfectly. 🎉
