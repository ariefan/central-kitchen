# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy app package.json files
COPY apps/landing-page/package.json ./apps/landing-page/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/landing-page ./apps/landing-page

# Build the application
RUN pnpm --filter=landing-page build

# Production stage - using nginx to serve static files
FROM nginx:alpine

# Copy built application from builder
COPY --from=builder /app/apps/landing-page/dist /usr/share/nginx/html

# Copy custom nginx config (if needed)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
