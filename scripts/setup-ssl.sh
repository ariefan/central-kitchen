#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# This script helps setup SSL certificates for your domains

set -e

echo "=========================================="
echo "SSL Certificate Setup for ERP System"
echo "=========================================="
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Error: certbot is not installed"
    echo "Please install certbot first:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    echo "  macOS: brew install certbot"
    exit 1
fi

# Domain configuration
DOMAINS=("erp.personalapp.id" "api.personalapp.id")
EMAIL="admin@personalapp.id"  # Change this to your email

echo "This script will obtain SSL certificates for:"
for domain in "${DOMAINS[@]}"; do
    echo "  - $domain"
done
echo ""
echo "Email for certificate notifications: $EMAIL"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p /var/www/certbot

# Obtain certificates
for domain in "${DOMAINS[@]}"; do
    echo ""
    echo "Obtaining certificate for $domain..."

    sudo certbot certonly --webroot \
        -w /var/www/certbot \
        -d $domain \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --force-renewal

    # Create symbolic links
    sudo mkdir -p nginx/ssl/$domain
    sudo ln -sf /etc/letsencrypt/live/$domain/fullchain.pem nginx/ssl/$domain/fullchain.pem
    sudo ln -sf /etc/letsencrypt/live/$domain/privkey.pem nginx/ssl/$domain/privkey.pem

    echo "Certificate obtained for $domain"
done

echo ""
echo "=========================================="
echo "SSL certificates obtained successfully!"
echo "=========================================="
echo ""
echo "Certificates are stored in:"
echo "  /etc/letsencrypt/live/"
echo ""
echo "Symbolic links created in:"
echo "  nginx/ssl/"
echo ""
echo "Auto-renewal:"
echo "  Certbot will automatically renew certificates"
echo "  You can test renewal with: sudo certbot renew --dry-run"
echo ""
echo "Next steps:"
echo "  1. Update nginx configuration if needed"
echo "  2. Restart nginx: docker-compose restart nginx"
echo ""
