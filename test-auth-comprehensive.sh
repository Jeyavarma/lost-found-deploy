#!/bin/bash

echo "🔍 Comprehensive Authentication Testing..."
echo "========================================"

BACKEND_URL="https://lost-found-79xn.onrender.com"
TEST_EMAIL="test@mcc.edu.in"
TEST_PASSWORD="TestPass123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Backend Health Check
echo -e "\n${BLUE}1. Backend Health Check${NC}"
echo "========================"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BACKEND_URL/api/health" 2>/dev/null)
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Backend is accessible"
    print_info "Response: $(cat /tmp/health_response.json 2>/dev/null || echo 'No response body')"
else
    print_status 1 "Backend health check failed (HTTP: $HTTP_CODE)"
fi

# Test 2: Registration Test
echo -e "\n${BLUE}2. Registration Test${NC}"
echo "===================="

REGISTER_DATA='{
  "name": "Test User",
  "email": "'$TEST_EMAIL'",
  "password": "'$TEST_PASSWORD'",
  "phone": "+91 9876543210",
  "studentId": "TEST2024001",
  "shift": "aided",
  "department": "bsc-cs",
  "year": "1",
  "rollNumber": "TEST2024001"
}'

print_info "Attempting registration with: $TEST_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" \
  -w "%{http_code}" -o /tmp/register_response.json)

REG_HTTP_CODE="${REGISTER_RESPONSE: -3}"
REG_BODY=$(cat /tmp/register_response.json 2>/dev/null)

if [ "$REG_HTTP_CODE" = "201" ]; then
    print_status 0 "Registration successful"
    print_info "Response: $REG_BODY"
elif [ "$REG_HTTP_CODE" = "400" ] && echo "$REG_BODY" | grep -q "already exists"; then
    print_warning "User already exists - proceeding with login test"
else
    print_status 1 "Registration failed (HTTP: $REG_HTTP_CODE)"
    print_info "Response: $REG_BODY"
fi

# Test 3: Login Test (Multiple Approaches)
echo -e "\n${BLUE}3. Login Tests${NC}"
echo "=============="

# Test 3a: Login with authController format
print_info "Testing login with authController format..."
LOGIN_DATA_1='{
  "email": "'$TEST_EMAIL'",
  "password": "'$TEST_PASSWORD'"
}'

LOGIN_RESPONSE_1=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA_1" \
  -w "%{http_code}" -o /tmp/login1_response.json)

LOGIN1_HTTP_CODE="${LOGIN_RESPONSE_1: -3}"
LOGIN1_BODY=$(cat /tmp/login1_response.json 2>/dev/null)

if [ "$LOGIN1_HTTP_CODE" = "200" ]; then
    print_status 0 "Login (authController format) successful"
    TOKEN_1=$(echo "$LOGIN1_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_info "Token received: ${TOKEN_1:0:20}..."
else
    print_status 1 "Login (authController format) failed (HTTP: $LOGIN1_HTTP_CODE)"
    print_info "Response: $LOGIN1_BODY"
fi

# Test 3b: Login with role parameter
print_info "Testing login with role parameter..."
LOGIN_DATA_2='{
  "email": "'$TEST_EMAIL'",
  "password": "'$TEST_PASSWORD'",
  "role": "student"
}'

LOGIN_RESPONSE_2=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA_2" \
  -w "%{http_code}" -o /tmp/login2_response.json)

LOGIN2_HTTP_CODE="${LOGIN_RESPONSE_2: -3}"
LOGIN2_BODY=$(cat /tmp/login2_response.json 2>/dev/null)

if [ "$LOGIN2_HTTP_CODE" = "200" ]; then
    print_status 0 "Login (with role) successful"
    TOKEN_2=$(echo "$LOGIN2_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_info "Token received: ${TOKEN_2:0:20}..."
else
    print_status 1 "Login (with role) failed (HTTP: $LOGIN2_HTTP_CODE)"
    print_info "Response: $LOGIN2_BODY"
fi

# Test 4: Token Validation Tests
echo -e "\n${BLUE}4. Token Validation Tests${NC}"
echo "========================="

# Use the first successful token
if [ ! -z "$TOKEN_1" ]; then
    TEST_TOKEN="$TOKEN_1"
    print_info "Using token from authController login"
elif [ ! -z "$TOKEN_2" ]; then
    TEST_TOKEN="$TOKEN_2"
    print_info "Using token from role-based login"
else
    print_warning "No valid token available for validation tests"
    TEST_TOKEN=""
fi

if [ ! -z "$TEST_TOKEN" ]; then
    # Test 4a: Token validation endpoint
    print_info "Testing token validation endpoint..."
    VALIDATE_RESPONSE=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" \
      "$BACKEND_URL/api/auth/validate" \
      -w "%{http_code}" -o /tmp/validate_response.json)
    
    VAL_HTTP_CODE="${VALIDATE_RESPONSE: -3}"
    VAL_BODY=$(cat /tmp/validate_response.json 2>/dev/null)
    
    if [ "$VAL_HTTP_CODE" = "200" ] && echo "$VAL_BODY" | grep -q '"valid":true'; then
        print_status 0 "Token validation successful"
        print_info "Response: $VAL_BODY"
    else
        print_status 1 "Token validation failed (HTTP: $VAL_HTTP_CODE)"
        print_info "Response: $VAL_BODY"
    fi
    
    # Test 4b: Protected endpoint test (if available)
    print_info "Testing protected endpoint access..."
    PROTECTED_RESPONSE=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" \
      "$BACKEND_URL/api/users/profile" \
      -w "%{http_code}" -o /tmp/protected_response.json 2>/dev/null)
    
    PROT_HTTP_CODE="${PROTECTED_RESPONSE: -3}"
    PROT_BODY=$(cat /tmp/protected_response.json 2>/dev/null)
    
    if [ "$PROT_HTTP_CODE" = "200" ]; then
        print_status 0 "Protected endpoint access successful"
    elif [ "$PROT_HTTP_CODE" = "404" ]; then
        print_warning "Protected endpoint not found (expected)"
    else
        print_info "Protected endpoint response (HTTP: $PROT_HTTP_CODE): $PROT_BODY"
    fi
fi

# Test 5: Authentication Issues Analysis
echo -e "\n${BLUE}5. Authentication Issues Analysis${NC}"
echo "================================="

print_info "Analyzing potential issues..."

# Check for JWT format inconsistencies
if [ ! -z "$TOKEN_1" ] && [ ! -z "$TOKEN_2" ]; then
    if [ "$TOKEN_1" = "$TOKEN_2" ]; then
        print_status 0 "Token consistency: Both login methods return same token"
    else
        print_warning "Token inconsistency: Different tokens from different login methods"
        print_info "Token 1 (first 30 chars): ${TOKEN_1:0:30}..."
        print_info "Token 2 (first 30 chars): ${TOKEN_2:0:30}..."
    fi
fi

# Check JWT structure
if [ ! -z "$TEST_TOKEN" ]; then
    JWT_PARTS=$(echo "$TEST_TOKEN" | tr '.' '\n' | wc -l)
    if [ "$JWT_PARTS" -eq 3 ]; then
        print_status 0 "JWT structure: Valid 3-part JWT token"
    else
        print_status 1 "JWT structure: Invalid JWT format (parts: $JWT_PARTS)"
    fi
fi

# Test 6: Database Model Inconsistencies
echo -e "\n${BLUE}6. Model Inconsistencies Check${NC}"
echo "=============================="

print_info "Checking for Sequelize vs Mongoose inconsistencies..."

# Try to identify which database is being used based on error messages
ERROR_INDICATORS=""
if echo "$LOGIN1_BODY" | grep -q "sequelize\|Sequelize"; then
    ERROR_INDICATORS="$ERROR_INDICATORS Sequelize"
fi
if echo "$LOGIN1_BODY" | grep -q "mongoose\|Mongoose"; then
    ERROR_INDICATORS="$ERROR_INDICATORS Mongoose"
fi

if [ ! -z "$ERROR_INDICATORS" ]; then
    print_warning "Database indicators found in responses:$ERROR_INDICATORS"
else
    print_info "No obvious database inconsistency indicators found"
fi

# Test 7: Environment Configuration Check
echo -e "\n${BLUE}7. Environment Configuration${NC}"
echo "============================"

print_info "Testing environment-specific endpoints..."

# Check if there are different auth endpoints
AUTH_ENDPOINTS=("/api/auth/login" "/auth/login" "/login")

for endpoint in "${AUTH_ENDPOINTS[@]}"; do
    TEST_RESPONSE=$(curl -s -X POST "$BACKEND_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d '{"test":"probe"}' \
      -w "%{http_code}" -o /dev/null 2>/dev/null)
    
    TEST_HTTP_CODE="${TEST_RESPONSE: -3}"
    
    if [ "$TEST_HTTP_CODE" != "404" ]; then
        print_info "Endpoint $endpoint exists (HTTP: $TEST_HTTP_CODE)"
    fi
done

# Summary
echo -e "\n${BLUE}📋 Test Summary${NC}"
echo "==============="

if [ "$LOGIN1_HTTP_CODE" = "200" ] || [ "$LOGIN2_HTTP_CODE" = "200" ]; then
    print_status 0 "Login functionality is working"
else
    print_status 1 "Login functionality has issues"
fi

if [ "$VAL_HTTP_CODE" = "200" ] && echo "$VAL_BODY" | grep -q '"valid":true'; then
    print_status 0 "Token validation is working"
else
    print_status 1 "Token validation has issues"
fi

echo -e "\n${BLUE}🔧 Recommendations${NC}"
echo "==================="

if [ "$LOGIN1_HTTP_CODE" != "200" ] && [ "$LOGIN2_HTTP_CODE" != "200" ]; then
    echo "• Check database connection and user model"
    echo "• Verify password hashing/comparison logic"
    echo "• Check environment variables (JWT_SECRET, DB connection)"
fi

if [ "$VAL_HTTP_CODE" != "200" ] || ! echo "$VAL_BODY" | grep -q '"valid":true'; then
    echo "• Check JWT secret consistency between login and validation"
    echo "• Verify SessionManager vs direct JWT usage"
    echo "• Check token format and payload structure"
fi

echo -e "\n${GREEN}🏁 Test Complete${NC}"

# Cleanup
rm -f /tmp/health_response.json /tmp/register_response.json /tmp/login1_response.json /tmp/login2_response.json /tmp/validate_response.json /tmp/protected_response.json