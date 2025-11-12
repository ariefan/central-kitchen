#!/bin/bash

# Production Deployment Script
# Deploys the ERP system using Docker Compose

set -e

echo "=========================================="
echo "ERP System Production Deployment"
echo "=========================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production file not found!"
    echo "Please create it from .env.production.example"
    echo ""
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production  # Edit with your values"
    echo ""
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
if [ -z "$POSTGRES_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "Error: Required environment variables not set!"
    echo "Please ensure .env.production contains:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - JWT_SECRET"
    exit 1
fi

echo "Environment: Production"
echo "Database: PostgreSQL"
echo "Domains:"
echo "  - Frontend: erp.personalapp.id"
echo "  - API: api.personalapp.id"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Pull latest code (if using git)
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Build images
echo "Building Docker images..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# Start services
echo "Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Run database migrations
echo ""
echo "Running database migrations..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api sh -c "cd apps/erp-api && pnpm db:migrate"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your ERP system is now running at:"
echo "  - Frontend: https://erp.personalapp.id"
echo "  - API: https://api.personalapp.id"
echo "  - API Docs: https://api.personalapp.id/docs"
echo "  - Health Check: https://api.personalapp.id/health"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo ""
