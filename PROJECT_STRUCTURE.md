# Central Kitchen ERP - Project Structure

## Clean Monorepo Architecture

```
central-kitchen/
├── apps/
│   ├── erp/                    # Next.js frontend (NEW)
│   ├── erp-api/                # Fastify API backend
│   └── landing-page/           # Marketing website
│
├── packages/
│   └── contracts/              # Shared TypeScript contracts (Single source of truth)
│
├── nginx/                      # Nginx configuration for deployment
│   ├── conf.d/
│   └── ssl/
│
├── scripts/                    # Build and deployment scripts
│
└── Configuration files:
    ├── .gitignore              # Comprehensive ignore patterns
    ├── package.json            # Workspace root
    ├── pnpm-workspace.yaml     # pnpm workspace config
    ├── turbo.json              # Turborepo config
    ├── manual-seed-phase1.sql  # Database seed script
    └── MANUAL_SEED_INSTRUCTIONS.md
```

## Recent Cleanup (2025-11-20)

### ✅ Removed Junk Files
- `cookies.txt` - Temporary browser cookies
- `fix_transfers*.ps1` - Obsolete PowerShell scripts
- `apps/erp-api/auth-schema.ts` - Temporary schema file
- `apps/erp-api/tests/integration/products-bulk.test.ts.tmp` - Test temp file
- `apps/landing-page/dist/assets/*.css|js` - Build artifacts (now in .gitignore)

### ✅ Fixed Structural Issues
- **Removed circular symlink**: `packages/contracts/erp` → `packages/contracts` (infinite loop)
- **Deleted old inventory app**: Replaced with new `apps/erp/`
- **Flattened API routes**: Removed nested `/modules/` structure
- **Added contracts package**: Now properly tracked in git

### ✅ Updated .gitignore
Comprehensive patterns for:
- Build outputs (dist/, .next/, .turbo/)
- Dependencies (node_modules/)
- Environment files (.env*)
- IDE files (.vscode/, .idea/)
- Logs (*.log)
- Testing artifacts (coverage/)
- OS files (.DS_Store, Thumbs.db)

## Architecture Patterns

### Frontend (apps/erp/)
- **Framework**: Next.js 16 with App Router
- **Auth**: Better Auth integration
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod

### Backend (apps/erp-api/)
- **Framework**: Fastify
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth
- **Validation**: Zod schemas from @contracts/erp
- **Architecture**: Repository/Service pattern

### Contracts (packages/contracts/)
- **Purpose**: Single source of truth for API contracts
- **Exports**: Zod schemas, TypeScript types, enums
- **Used by**: Both frontend and backend
- **Build**: TypeScript compilation to dist/

## Naming Conventions

### Consistent Patterns
- **Route files**: `{resource}.routes.ts` (e.g., `products.routes.ts`)
- **Module structure**: `{resource}/{resource}.{layer}.ts`
  - `*.repository.ts` - Database queries
  - `*.service.ts` - Business logic
  - `*.schema.ts` - Zod validation schemas
- **Components**: PascalCase (e.g., `LocationForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `use-locations.ts`)

## Monorepo Benefits

1. **Shared contracts**: Type safety across frontend/backend
2. **Unified build**: Turborepo caching and parallelization
3. **Code reuse**: Shared utilities and components
4. **Atomic changes**: Update API and frontend together
5. **Simplified deployment**: Single repository to manage

## Development Commands

```bash
# Install dependencies
pnpm install

# Build contracts (required first)
pnpm --filter @contracts/erp build

# Development
pnpm dev                 # All apps
pnpm dev:api            # API only
pnpm dev:web            # Frontend only

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed with test data

# Testing
pnpm test               # Run all tests
pnpm test:integration   # Integration tests only

# Production build
pnpm build
```

---

**Last Updated**: 2025-11-20  
**Status**: Clean and organized ✅
