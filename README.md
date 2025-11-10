# Central Kitchen ERP System

A monorepo-based ERP system for central kitchen management, built with Turbo, containing:

- **erp-api**: Fastify-based Node.js API service (port 8000)
- **inventory**: React-based web frontend (port 3000)

## Projects Structure

```
central-kitchen/
├── erp-api/           # Node.js API service
├── inventory/         # React frontend
├── package.json       # Root package.json
├── turbo.json         # Turbo configuration
└── pnpm-workspace.yaml # PNPM workspace configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 10.20.0+
- PostgreSQL database (for erp-api)

### Installation
```bash
pnpm install
```

### Development
```bash
# Start both applications
pnpm dev

# Start individual applications
pnpm dev:api      # Starts erp-api on port 8000
pnpm dev:web      # Starts inventory on port 3000
```

### Build
```bash
# Build both applications
pnpm build

# Build individual applications
pnpm build:api
pnpm build:web
```

### Database Management (API)
```bash
# Generate database migrations
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Seed database with sample data
pnpm db:seed
```

### Available Scripts
- `pnpm build` - Build all projects
- `pnpm dev` - Start all projects in development mode
- `pnpm lint` - Lint all projects
- `pnpm test` - Run tests for all projects
- `pnpm clean` - Clean build outputs
- `pnpm typecheck` - Type check all TypeScript projects

## Application URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health

## Technology Stack

### ERP API
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Vitest

### Inventory Frontend
- **Framework**: React with Vite
- **UI Library**: Radix UI components
- **Styling**: Tailwind CSS
- **Routing**: TanStack Router
- **State Management**: TanStack Query
- **Testing**: Vitest with Testing Library

## Environment Configuration

### ERP API (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-api"

# Server
PORT=8000
HOST=127.0.0.1
NODE_ENV=development

# JWT (for future auth)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

ISC License