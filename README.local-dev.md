# Local Development Guide

## Port Configuration

- **localhost:3000** → Landing Page (Vite)
- **localhost:3000/api** → API Server (proxied from port 8000)
- **localhost:3001** → ERP Application (Next.js)
- **localhost:8000** → API Server (direct access)

## Prerequisites

- Node.js 20+
- pnpm 10.20.0+
- PostgreSQL 16+

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database

```bash
# Create database
createdb erp-api

# Or using psql
psql -U postgres -c "CREATE DATABASE \"erp-api\";"
```

### 3. Configure Environment

Create `.env` file in `apps/erp-api/`:

```bash
cp apps/erp-api/.env.example apps/erp-api/.env
```

Edit the `.env` file with your local configuration:

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

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

### 5. Seed Database (Optional)

```bash
pnpm db:seed
```

## Running the Application

### Option 1: Run All Services

```bash
pnpm dev
```

This will start:
- Landing Page on port 3000
- ERP Application on port 3001
- API Server on port 8000

### Option 2: Run Services Individually

In separate terminal windows:

```bash
# Terminal 1 - API Server
pnpm dev:api

# Terminal 2 - ERP Application
pnpm dev:erp

# Terminal 3 - Landing Page
pnpm dev:landing
```

## Testing the Setup

### 1. Landing Page
```bash
curl http://localhost:3000
```

### 2. API through Landing Page Proxy
```bash
curl http://localhost:3000/api/health
```

### 3. ERP Application
```bash
curl http://localhost:3001
```

### 4. API through ERP Proxy
```bash
curl http://localhost:3001/api/health
```

### 5. API Direct Access
```bash
curl http://localhost:8000/health
```

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Kill process on specific port
pnpm kill-port 3000
pnpm kill-port 3001
pnpm kill-port 8000
```

Or manually find and kill:

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

Ensure PostgreSQL is running:

```bash
# Check PostgreSQL status
pg_isready

# If not running, start it
sudo service postgresql start
# or on macOS with Homebrew
brew services start postgresql
```

### API Proxy Not Working

Make sure:
1. API server is running on port 8000
2. Check the proxy configuration in:
   - `apps/landing-page/vite.config.ts` for landing page
   - `apps/erp/next.config.ts` for ERP app

## Development Workflow

### Making Changes

1. **Frontend (Landing Page)**
   - Edit files in `apps/landing-page/src`
   - Changes will hot-reload automatically

2. **Frontend (ERP)**
   - Edit files in `apps/erp/`
   - Changes will hot-reload automatically

3. **Backend (API)**
   - Edit files in `apps/erp-api/src`
   - Server will restart automatically (tsx watch)

### Running Tests

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter erp-api test

# Run tests in watch mode
pnpm --filter erp-api test:watch
```

### Database Operations

```bash
# Generate migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Push schema without migration
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

### Linting and Type Checking

```bash
# Lint all projects
pnpm lint

# Fix lint issues
pnpm lint:fix

# Type check
pnpm typecheck
```

## Project Structure

```
central-kitchen/
├── apps/
│   ├── erp/              # Next.js ERP app (port 3001)
│   ├── erp-api/          # Fastify API (port 8000)
│   └── landing-page/     # Vite landing page (port 3000)
├── packages/
│   └── contracts/        # Shared types and schemas
├── nginx/                # Nginx config for Docker
├── scripts/              # Utility scripts
└── docker-compose.yml    # Docker orchestration
```

## API Documentation

When the API server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Environment Variables Reference

### Landing Page (Vite)
No environment variables required for local development.

### ERP Application (Next.js)
- `API_SERVICE_URL` - API server URL (default: http://localhost:8000)
- `NODE_ENV` - Environment (development/production)

### API Server (Fastify)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production/test)
- `BETTER_AUTH_SECRET` - Auth secret (min 32 chars)
- `BETTER_AUTH_URL` - Auth service URL
- `FRONTEND_URL` - Frontend URL for CORS
- `JWT_SECRET` - JWT secret (min 32 chars)
- `JWT_EXPIRES_IN` - JWT expiration (default: 24h)
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
