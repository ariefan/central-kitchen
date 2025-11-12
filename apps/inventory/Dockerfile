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

# Production stage - using nginx to serve static files
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/apps/inventory/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/inventory/nginx.conf /etc/nginx/conf.d/default.conf

# Nginx runs as root by default which is needed to bind to port 80
# The worker processes will run as nginx user (configured in nginx.conf)
# This is the standard and secure way to run nginx in containers

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
