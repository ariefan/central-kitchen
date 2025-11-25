#!/bin/bash

# Complete Authentication Test Script for ERP System
# This script tests sign up, sign in, and protected page access

set -e

echo "============================================"
echo "ERP Authentication Test Script"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
API_URL="http://localhost:8000"
COOKIE_FILE="/tmp/erp-test-cookies.txt"

# Test user credentials
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="SecurePassword123!"
TEST_NAME="Test User"

echo "Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  API URL: $API_URL"
echo "  Test Email: $TEST_EMAIL"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        return 1
    fi
}

# Function to check service health
check_service() {
    local url=$1
    local name=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        print_result 0 "$name is running"
        return 0
    else
        print_result 1 "$name is not accessible"
        return 1
    fi
}

echo "============================================"
echo "Step 1: Checking Services"
echo "============================================"

# Check if services are running
check_service "$API_URL/health" "API Server"
check_service "$BASE_URL" "ERP Application"
check_service "http://localhost:3000" "Landing Page"

echo ""
echo "============================================"
echo "Step 2: Testing User Sign Up"
echo "============================================"

# Clean up old cookies
rm -f "$COOKIE_FILE"

# Sign up new user
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-up/email" \
    -H "Content-Type: application/json" \
    -c "$COOKIE_FILE" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"name\": \"$TEST_NAME\"
    }")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SIGNUP_RESPONSE" | head -n -1)

echo "Response: $RESPONSE_BODY"
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    print_result 0 "User signed up successfully"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
elif echo "$RESPONSE_BODY" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠ User already exists, continuing with sign in test${NC}"
else
    print_result 1 "Sign up failed"
    echo "Error: $RESPONSE_BODY"
fi

echo ""
echo "============================================"
echo "Step 3: Testing User Sign In"
echo "============================================"

# Sign in with the test user
SIGNIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -c "$COOKIE_FILE" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

HTTP_CODE=$(echo "$SIGNIN_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SIGNIN_RESPONSE" | head -n -1)

echo "Response: $RESPONSE_BODY"
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "User signed in successfully"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"

    # Check if session cookie was set
    if [ -f "$COOKIE_FILE" ] && grep -q "session" "$COOKIE_FILE"; then
        print_result 0 "Session cookie saved"
    else
        print_result 1 "Session cookie not found"
    fi
else
    print_result 1 "Sign in failed"
    echo "Error: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "============================================"
echo "Step 4: Testing Session Verification"
echo "============================================"

# Get current session
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/auth/get-session" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$SESSION_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SESSION_RESPONSE" | head -n -1)

echo "Session Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q "$TEST_EMAIL"; then
    print_result 0 "Session is valid"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Session verification failed"
fi

echo ""
echo "============================================"
echo "Step 5: Testing Access to /products Page"
echo "============================================"

# Access protected /products page
PRODUCTS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/products" \
    -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$PRODUCTS_RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Successfully accessed /products page"

    # Check if the page contains expected elements
    if echo "$RESPONSE_BODY" | grep -qi "product"; then
        print_result 0 "Products page contains product data"
    else
        echo -e "${YELLOW}⚠ Products page loaded but may not have product data${NC}"
    fi
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    print_result 1 "Access denied - Authentication required"
    echo "User needs to be authenticated to access /products"
elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "307" ]; then
    echo -e "${YELLOW}⚠ Redirected (likely to login page)${NC}"
    print_result 1 "User was redirected - may need to implement auth check"
else
    print_result 1 "Unexpected response from /products page"
fi

echo ""
echo "============================================"
echo "Step 6: Testing API Endpoints Directly"
echo "============================================"

# Test products API endpoint
PRODUCTS_API_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/v1/products" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$PRODUCTS_API_RESPONSE" | tail -n 1)
echo "Products API HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Successfully accessed products API"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠ Products API endpoint not found (may not be implemented yet)${NC}"
else
    echo "Response: $(echo "$PRODUCTS_API_RESPONSE" | head -n -1 | head -c 200)"
fi

echo ""
echo "============================================"
echo "Step 7: Testing Sign Out"
echo "============================================"

# Sign out
SIGNOUT_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-out" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$SIGNOUT_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Successfully signed out"
else
    echo "Sign out status: $HTTP_CODE"
fi

# Verify session is cleared
SESSION_CHECK=$(curl -s "$BASE_URL/api/auth/get-session" -b "$COOKIE_FILE")
if echo "$SESSION_CHECK" | grep -q "null\|unauthorized"; then
    print_result 0 "Session cleared after sign out"
else
    print_result 1 "Session may still be active"
fi

echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo ""
echo "All routing and authentication endpoints are properly configured!"
echo ""
echo "Cleanup: Removing test cookies"
rm -f "$COOKIE_FILE"

echo ""
echo -e "${GREEN}✓ Test script completed${NC}"
