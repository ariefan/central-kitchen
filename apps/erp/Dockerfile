# Multi-stage build for Next.js ERP Frontend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/erp/package.json ./apps/erp/
COPY packages/contracts/package.json ./packages/contracts/

# Copy contracts source (needed for prepare script during install)
COPY packages/contracts ./packages/contracts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/erp/node_modules ./apps/erp/node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules

# Copy source code
COPY . .

# Build contracts package first
RUN pnpm --filter @contracts/erp build

# Set environment variables for build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# API service URL for rewrites (must be available at build time for Next.js standalone)
ARG API_SERVICE_URL=http://localhost:8000
ENV API_SERVICE_URL=$API_SERVICE_URL

# Build the ERP app
RUN pnpm --filter erp build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/erp/public ./apps/erp/public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp/.next/static ./apps/erp/.next/static

# Copy and prepare entrypoint script (before switching to nextjs user)
COPY apps/erp/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && chown nextjs:nodejs /docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# API service URL for server-side proxy rewrites
# This will be overridden by docker-compose environment variables
ENV API_SERVICE_URL="http://localhost:8000"

# Start the application using entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
