# Complete Local Testing Guide

## Prerequisites

### 1. PostgreSQL Setup

You need a running PostgreSQL instance. Choose one of these options:

#### Option A: Using Docker (Recommended)
```bash
docker run --name erp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=erp-api \
  -p 5432:5432 \
  -d postgres:16-alpine
```

#### Option B: Local PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb erp-api

# macOS
brew install postgresql
brew services start postgresql
createdb erp-api
```

## Setup Steps

### 1. Configure Database Connection

Edit `apps/erp-api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-api"
PORT=8000
HOST=0.0.0.0
NODE_ENV=development
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars-change-in-production
BETTER_AUTH_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-in-production
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Database Migrations

```bash
# Push schema to database
pnpm --filter erp-api db:push

# Or run migrations
pnpm --filter erp-api db:migrate

# Seed database with initial data (optional)
pnpm --filter erp-api db:seed
```

### 4. Start All Services

```bash
# Start all services together
pnpm dev

# Or start individually:
pnpm dev:api      # API on port 8000
pnpm dev:erp      # ERP on port 3001
pnpm dev:landing  # Landing on port 3000
```

## Running the Complete Authentication Test

### Automated Test Script

```bash
./scripts/test-authentication.sh
```

This script will:
1. ✅ Check all services are running
2. ✅ Test user sign up
3. ✅ Test user sign in
4. ✅ Verify session
5. ✅ Test accessing /products page
6. ✅ Test API endpoints
7. ✅ Test sign out

### Manual Testing

#### 1. Sign Up

```bash
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "testuser@example.com",
    "name": "Test User"
  },
  "session": {
    "token": "...",
    "expiresAt": "..."
  }
}
```

#### 2. Sign In

```bash
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "testuser@example.com",
    "name": "Test User"
  },
  "session": {
    "token": "...",
    "expiresAt": "..."
  }
}
```

#### 3. Get Session

```bash
curl -X GET http://localhost:3001/api/auth/get-session \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "session": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "name": "Test User"
    }
  }
}
```

#### 4. Access Protected /products Page

```bash
# With authentication
curl http://localhost:3001/products -b cookies.txt

# Without authentication (should redirect or show error)
curl http://localhost:3001/products
```

#### 5. Test Products API

```bash
curl http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### 6. Sign Out

```bash
curl -X POST http://localhost:3001/api/auth/sign-out \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

## Browser Testing

### 1. Open ERP Application
```
http://localhost:3001
```

### 2. Sign Up
- Navigate to `/sign-up` or the registration page
- Fill in:
  - Email: `testuser@example.com`
  - Password: `SecurePassword123!`
  - Name: `Test User`
- Submit the form

### 3. Sign In
- Navigate to `/sign-in` or the login page
- Enter credentials
- Submit

### 4. Access Protected Pages
- After signing in, navigate to:
  - `/products` - Should load successfully
  - `/dashboard` - Should show user dashboard
  - `/settings` - Should show user settings

### 5. Verify Session Persistence
- Refresh the page - should stay logged in
- Close and reopen browser - session should persist (if "Remember me" was checked)

## Testing Routing

### Local Development URLs

| URL | Expected Result |
|-----|----------------|
| `http://localhost:3000` | Landing Page |
| `http://localhost:3000/api/health` | API health check (proxied) |
| `http://localhost:3001` | ERP Application |
| `http://localhost:3001/api/health` | API health check (proxied) |
| `http://localhost:8000/health` | API health check (direct) |
| `http://localhost:8000/docs` | API documentation (Swagger) |

### Test Proxy Configuration

```bash
# Test API proxy through landing page
curl http://localhost:3000/api/health

# Test API proxy through ERP
curl http://localhost:3001/api/health

# Direct API access
curl http://localhost:8000/health
```

All three should return the same health check response.

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U postgres -d erp-api -c "SELECT 1;"

# Check database exists
psql -h localhost -U postgres -l | grep erp-api
```

### Port Conflicts

```bash
# Kill processes on specific ports
pnpm kill-port 3000 3001 8000

# Or manually
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### Service Not Starting

```bash
# Check logs
pnpm dev:api 2>&1 | tee api.log
pnpm dev:erp 2>&1 | tee erp.log
pnpm dev:landing 2>&1 | tee landing.log
```

### Authentication Not Working

1. **Check Database Connection**
   ```bash
   curl http://localhost:8000/health
   # Should show "database": "connected"
   ```

2. **Verify Better Auth Configuration**
   - Check `BETTER_AUTH_SECRET` is set (min 32 chars)
   - Check `BETTER_AUTH_URL` matches API URL
   - Check `FRONTEND_URL` matches ERP URL

3. **Check Cookies**
   ```bash
   # Sign in and save cookies
   curl -X POST http://localhost:3001/api/auth/sign-in/email \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email":"test@example.com","password":"SecurePassword123!"}'

   # Check cookies file
   cat cookies.txt
   # Should contain session cookies
   ```

## Success Criteria

✅ All services start without errors
✅ Database connection is "connected" in health check
✅ User can sign up with email/password
✅ User can sign in with credentials
✅ Session cookie is saved and persists
✅ Authenticated user can access /products page
✅ Unauthenticated requests to /products are blocked/redirected
✅ API endpoints accessible through proxy (/api/*)
✅ User can sign out successfully

## Next Steps After Testing

1. **Add more test users with different roles**
2. **Test role-based access control (if implemented)**
3. **Test password reset flow**
4. **Test email verification (if enabled)**
5. **Load test with multiple concurrent users**
6. **Test session expiration and renewal**
