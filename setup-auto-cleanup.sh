#!/bin/bash

echo "========================================="
echo "DOCKER AUTO-CLEANUP SETUP"
echo "This will set up automatic Docker cleanup to prevent disk space issues"
echo "========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo"
  echo "Usage: sudo bash setup-auto-cleanup.sh"
  exit 1
fi

# Create the cleanup script
echo "Creating daily cleanup script..."
cat > /usr/local/bin/docker-daily-cleanup.sh <<'EOF'
#!/bin/bash
# Docker daily cleanup script
# Runs daily to prevent disk space issues

LOG_FILE="/var/log/docker-cleanup.log"

echo "=================================" >> $LOG_FILE
echo "Docker cleanup started: $(date)" >> $LOG_FILE
echo "=================================" >> $LOG_FILE

# Remove images older than 7 days
echo "Removing Docker images older than 7 days..." >> $LOG_FILE
docker image prune -a -f --filter "until=168h" >> $LOG_FILE 2>&1

# Remove build cache
echo "Removing Docker build cache..." >> $LOG_FILE
docker builder prune -a -f >> $LOG_FILE 2>&1

# Remove stopped containers older than 24 hours
echo "Removing stopped containers..." >> $LOG_FILE
docker container prune -f --filter "until=24h" >> $LOG_FILE 2>&1

# Truncate large log files
echo "Truncating large log files..." >> $LOG_FILE
find /var/lib/docker/containers -name "*-json.log" -size +100M -exec truncate -s 50M {} \; 2>&1 | tee -a $LOG_FILE

echo "Docker cleanup completed: $(date)" >> $LOG_FILE
echo "" >> $LOG_FILE

# Keep only last 30 days of logs
find /var/log -name "docker-cleanup.log*" -mtime +30 -delete 2>/dev/null
EOF

chmod +x /usr/local/bin/docker-daily-cleanup.sh
echo "✓ Cleanup script created at /usr/local/bin/docker-daily-cleanup.sh"
echo ""

# Set up cron job
echo "Setting up cron job to run daily at 2 AM..."
(crontab -l 2>/dev/null | grep -v docker-daily-cleanup.sh; echo "0 2 * * * /usr/local/bin/docker-daily-cleanup.sh") | crontab -
echo "✓ Cron job installed"
echo ""

# Update docker-compose files to add log rotation
echo "Updating docker-compose.dokploy.yml to add log rotation..."
if [ -f "/home/ubuntu/central-kitchen/docker-compose.dokploy.yml" ]; then
  echo "Would you like to add log rotation to docker-compose.dokploy.yml?"
  echo "This will limit each container's logs to 10MB with 3 backup files."
  read -p "Update docker-compose.dokploy.yml? (yes/no): " update_compose

  if [ "$update_compose" == "yes" ]; then
    echo "Please manually add this to each service in docker-compose.dokploy.yml:"
    echo ""
    echo "    logging:"
    echo "      driver: \"json-file\""
    echo "      options:"
    echo "        max-size: \"10m\""
    echo "        max-file: \"3\""
    echo ""
    echo "After adding, redeploy your services for the changes to take effect."
  fi
else
  echo "docker-compose.dokploy.yml not found at expected location"
fi

echo ""
echo "========================================="
echo "AUTO-CLEANUP SETUP COMPLETE!"
echo "========================================="
echo ""
echo "What was set up:"
echo "1. Daily cleanup script at /usr/local/bin/docker-daily-cleanup.sh"
echo "2. Cron job running daily at 2 AM"
echo "3. Cleanup logs at /var/log/docker-cleanup.log"
echo ""
echo "The cleanup will:"
echo "- Remove Docker images older than 7 days"
echo "- Remove Docker build cache"
echo "- Remove stopped containers older than 24 hours"
echo "- Truncate log files larger than 100MB"
echo ""
echo "You can run the cleanup manually anytime with:"
echo "sudo /usr/local/bin/docker-daily-cleanup.sh"
echo ""
echo "To view cleanup logs:"
echo "tail -f /var/log/docker-cleanup.log"
