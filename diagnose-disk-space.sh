#!/bin/bash

echo "========================================="
echo "DISK SPACE DIAGNOSTIC REPORT"
echo "Generated: $(date)"
echo "========================================="
echo ""

echo "1. OVERALL DISK USAGE"
echo "---------------------"
df -h
echo ""

echo "2. DOCKER SYSTEM DISK USAGE"
echo "---------------------------"
docker system df
echo ""

echo "3. DOCKER DETAILED BREAKDOWN"
echo "----------------------------"
docker system df -v
echo ""

echo "4. DOCKER IMAGES COUNT AND SIZE"
echo "--------------------------------"
echo "Total images: $(docker images | wc -l)"
echo ""
echo "Top 10 largest images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -11
echo ""

echo "5. DOCKER CONTAINERS"
echo "--------------------"
echo "Running containers: $(docker ps -q | wc -l)"
echo "Stopped containers: $(docker ps -aq | wc -l)"
echo ""

echo "6. DOCKER VOLUMES"
echo "-----------------"
echo "Total volumes: $(docker volume ls -q | wc -l)"
echo ""

echo "7. LARGEST DIRECTORIES IN /var/lib/docker"
echo "------------------------------------------"
sudo du -sh /var/lib/docker/* 2>/dev/null | sort -hr | head -10
echo ""

echo "8. LARGEST LOG FILES"
echo "--------------------"
sudo find /var/lib/docker/containers -name "*-json.log" -exec du -h {} \; 2>/dev/null | sort -hr | head -10
echo ""

echo "9. TOP 20 LARGEST DIRECTORIES SYSTEM-WIDE"
echo "------------------------------------------"
sudo du -sh /* 2>/dev/null | sort -hr | head -20
echo ""

echo "10. POSTGRESQL DATABASE SIZES"
echo "------------------------------"
docker exec postgres psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;" 2>/dev/null || echo "Could not connect to PostgreSQL"
echo ""

echo "========================================="
echo "DIAGNOSTIC REPORT COMPLETE"
echo "========================================="
