# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy app package.json files
COPY apps/inventory/package.json ./apps/inventory/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/inventory ./apps/inventory

# Build argument for API URL
ARG VITE_API_URL=https://api.personalapp.id

# Build the application
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter=inventory build

# Production stage - using Node.js to run TanStack Start with Nitro
FROM node:20-alpine

WORKDIR /app

# Copy built application (.output contains both server and client)
COPY --from=builder /app/apps/inventory/.output ./.output

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run the Nitro server
CMD ["node", ".output/server/index.mjs"]
