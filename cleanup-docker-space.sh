#!/bin/bash

echo "========================================="
echo "DOCKER CLEANUP SCRIPT"
echo "This will free up disk space by removing unused Docker resources"
echo "========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo for full cleanup capabilities"
  echo "Usage: sudo bash cleanup-docker-space.sh"
  exit 1
fi

# Show current disk usage
echo "CURRENT DISK USAGE:"
df -h /
echo ""

# Show current Docker disk usage
echo "CURRENT DOCKER DISK USAGE:"
docker system df
echo ""

read -p "Do you want to proceed with cleanup? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Step 1: Remove stopped containers
echo "1. Removing stopped containers..."
docker container prune -f
echo ""

# Step 2: Remove unused images (keep images from last 24 hours)
echo "2. Removing unused Docker images older than 24 hours..."
docker image prune -a -f --filter "until=24h"
echo ""

# Step 3: Remove build cache
echo "3. Removing Docker build cache..."
docker builder prune -a -f
echo ""

# Step 4: Remove unused volumes (CAREFUL - this removes data)
read -p "Do you want to remove unused Docker volumes? This will delete any data not in use. (yes/no): " volume_confirm
if [ "$volume_confirm" == "yes" ]; then
  echo "4. Removing unused Docker volumes..."
  docker volume prune -f
else
  echo "4. Skipping volume cleanup..."
fi
echo ""

# Step 5: Remove unused networks
echo "5. Removing unused Docker networks..."
docker network prune -f
echo ""

# Step 6: Truncate large log files
echo "6. Truncating large Docker log files..."
find /var/lib/docker/containers -name "*-json.log" -size +100M -exec truncate -s 50M {} \; 2>/dev/null
echo "Truncated log files larger than 100MB to 50MB"
echo ""

# Step 7: Clean apt cache (if on Ubuntu/Debian)
if command -v apt-get &> /dev/null; then
  echo "7. Cleaning apt cache..."
  apt-get clean
  apt-get autoclean
  apt-get autoremove -y
  echo ""
fi

# Step 8: Remove old journal logs (if systemd)
if command -v journalctl &> /dev/null; then
  echo "8. Cleaning old journal logs..."
  journalctl --vacuum-time=7d
  echo ""
fi

echo "========================================="
echo "CLEANUP COMPLETE!"
echo "========================================="
echo ""

echo "NEW DISK USAGE:"
df -h /
echo ""

echo "NEW DOCKER DISK USAGE:"
docker system df
echo ""

echo "You have successfully freed up disk space!"
echo "To prevent this in the future, consider:"
echo "1. Setting up automatic Docker cleanup (see setup-auto-cleanup.sh)"
echo "2. Adding log rotation to your docker-compose files"
echo "3. Regularly pruning old images and containers"
