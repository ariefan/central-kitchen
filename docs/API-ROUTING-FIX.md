# API Routing Issue and Fix

## Problem Found

When testing Better Auth endpoints through the proxy, I discovered a routing mismatch:

### What Doesn't Work:
```bash
# Via Landing Page proxy
curl -X POST http://localhost:3000/api/auth/sign-up/email
# Returns: 404 - Route POST:/auth/sign-up/email not found

# Via ERP proxy
curl -X POST http://localhost:3001/api/auth/sign-up/email
# Returns: 404 - Route POST:/auth/sign-up/email not found
```

### What Works:
```bash
# Direct API access
curl -X POST http://localhost:8000/api/auth/sign-up/email
# Returns: {"code":"PASSWORD_TOO_SHORT","message":"Password too short"} ✅
```

## Root Cause

The proxy configuration strips the `/api` prefix before forwarding to the backend:

1. **User requests:** `localhost:3000/api/auth/sign-up/email`
2. **Proxy processes:** Strips `/api` per configuration
3. **Backend receives:** `POST /auth/sign-up/email`
4. **Backend expects:** `/api/auth/*` (Better Auth is mounted here)
5. **Result:** 404 Not Found

## The Fix

Changed Better Auth route mounting in `apps/erp-api/src/app.ts`:

**Before:**
```typescript
server.all('/api/auth/*', async (request, reply) => {
  // Better Auth handler
});
```

**After:**
```typescript
server.all('/auth/*', async (request, reply) => {
  // Better Auth handler
  // Note: Mounted at /auth/* because proxies strip /api prefix
});
```

## How It Works After Fix

### For Direct API Access (port 8000):
- Old path `/api/auth/*` → No longer works (404)
- New path `/auth/*` → Works ✅

### For Proxied Access (through ports 3000 and 3001):
- User requests: `localhost:3000/api/auth/sign-up/email`
- Proxy strips `/api`: `/auth/sign-up/email`
- Backend receives: `POST /auth/sign-up/email`
- Backend handler: Matches `/auth/*` ✅
- Result: Better Auth responds correctly

## Expected Behavior After Fix

```bash
# Via Landing Page proxy - WORKS ✅
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","name":"Test"}'
# Returns: User created (or appropriate Better Auth response)

# Via ERP proxy - WORKS ✅
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","name":"Test"}'
# Returns: User created (or appropriate Better Auth response)

# Direct API access - Use new path ✅
curl -X POST http://localhost:8000/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","name":"Test"}'
# Returns: User created (or appropriate Better Auth response)
```

## Testing

After restarting the API service with the fix:

```bash
# 1. Restart services
pnpm kill-port 3000 3001 8000
pnpm dev

# 2. Test all endpoints
./scripts/test-authentication.sh
```

All Better Auth endpoints should now be accessible through:
- Landing Page proxy: `localhost:3000/api/auth/*`
- ERP proxy: `localhost:3001/api/auth/*`
- Direct API: `localhost:8000/auth/*` (new path)

## Impact

- ✅ **Proxied routes now work** - Users can authenticate through frontend apps
- ⚠️ **Breaking change for direct API users** - Path changed from `/api/auth/*` to `/auth/*`
- ✅ **Frontend apps unaffected** - They always use `/api/auth/*` which gets proxied correctly

## Configuration

The proxy middleware configuration remains unchanged:

**Vite (Landing Page):**
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),  // Strips /api
    },
  },
}
```

**Next.js (ERP):**
```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `http://localhost:8000/:path*`,  // Strips /api
    },
  ];
}
```

**Traefik (Docker):**
```yaml
labels:
  - "traefik.http.middlewares.api-stripprefix.stripprefix.prefixes=/api"
```

All proxies strip `/api` before forwarding, so the backend must mount routes without the `/api` prefix.
