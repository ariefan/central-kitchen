# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy app package.json files
COPY apps/erp-api/package.json ./apps/erp-api/

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/erp-api ./apps/erp-api

# Build the application
RUN pnpm --filter=erp-api build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/erp-api/package.json ./apps/erp-api/

# Install ALL dependencies (including drizzle-kit for migrations)
# We need drizzle-kit in production to run migrations
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/apps/erp-api/dist ./apps/erp-api/dist

# Copy migration files and config (CRITICAL for production)
COPY --from=builder /app/apps/erp-api/drizzle ./apps/erp-api/drizzle
COPY --from=builder /app/apps/erp-api/drizzle.config.ts ./apps/erp-api/drizzle.config.ts

# Copy source files needed for migrations (db schema)
COPY --from=builder /app/apps/erp-api/src/db ./apps/erp-api/src/db
COPY --from=builder /app/apps/erp-api/src/config ./apps/erp-api/src/config

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

# Health check using node built-in http (no external dependencies)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/erp-api/dist/index.js"]
