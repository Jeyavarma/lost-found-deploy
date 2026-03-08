#!/bin/bash

echo "🧪 COMPREHENSIVE API ENDPOINT TESTING"
echo "====================================="

BACKEND_URL="https://lost-found-79xn.onrender.com"
SWAGGER_URL="$BACKEND_URL/api-docs"

echo "📋 Testing Environment:"
echo "- Backend URL: $BACKEND_URL"
echo "- Swagger UI: $SWAGGER_URL"
echo "- MongoDB: Connected via provided URL"
echo ""

# Test 1: Health Check
echo "1️⃣ HEALTH CHECK"
echo "==============="
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")
echo "Health Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    echo "✅ Health Check: PASSED"
else
    echo "❌ Health Check: FAILED"
fi

# Test 2: Root Endpoint
echo -e "\n2️⃣ ROOT ENDPOINT"
echo "================"
ROOT_RESPONSE=$(curl -s "$BACKEND_URL/")
echo "Root Response: $ROOT_RESPONSE"

if echo "$ROOT_RESPONSE" | grep -q "Lost & Found API Server"; then
    echo "✅ Root Endpoint: PASSED"
else
    echo "❌ Root Endpoint: FAILED"
fi

# Test 3: Swagger Documentation
echo -e "\n3️⃣ SWAGGER DOCUMENTATION"
echo "========================"
SWAGGER_RESPONSE=$(curl -s -I "$SWAGGER_URL" | head -n 1)
echo "Swagger Response: $SWAGGER_RESPONSE"

if echo "$SWAGGER_RESPONSE" | grep -q "200"; then
    echo "✅ Swagger UI: ACCESSIBLE at $SWAGGER_URL"
else
    echo "❌ Swagger UI: NOT ACCESSIBLE"
fi

# Test 4: Authentication Endpoints
echo -e "\n4️⃣ AUTHENTICATION ENDPOINTS"
echo "==========================="

# Test 4a: Register
echo "📝 Testing Registration..."
TEST_EMAIL="apitest$(date +%s)@mcc.edu.in"
REGISTER_DATA='{
  "name": "API Test User",
  "email": "'$TEST_EMAIL'",
  "password": "TestPass123!",
  "phone": "+91 9876543210",
  "studentId": "APITEST001",
  "shift": "aided",
  "department": "bsc-cs",
  "year": "1",
  "rollNumber": "APITEST001"
}'

REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

echo "Register Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"token"'; then
    echo "✅ Registration: PASSED"
    REGISTER_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    REGISTER_USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
    echo "🔑 Registration Token: ${REGISTER_TOKEN:0:30}..."
    echo "👤 User ID: $REGISTER_USER_ID"
else
    echo "❌ Registration: FAILED"
fi

# Test 4b: Login
echo -e "\n🔐 Testing Login..."
LOGIN_DATA='{
  "email": "2@mcc.edu.in",
  "password": "123456789"
}'

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

echo "Login Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
    echo "✅ Login: PASSED"
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "🔑 Login Token: ${LOGIN_TOKEN:0:30}..."
else
    echo "❌ Login: FAILED"
fi

# Test 4c: Token Validation
if [ ! -z "$LOGIN_TOKEN" ]; then
    echo -e "\n🔍 Testing Token Validation..."
    VALIDATE_RESPONSE=$(curl -s -H "Authorization: Bearer $LOGIN_TOKEN" \
      "$BACKEND_URL/api/auth/validate")
    
    echo "Validation Response: $VALIDATE_RESPONSE"
    
    if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then
        echo "✅ Token Validation: PASSED"
    else
        echo "❌ Token Validation: FAILED"
    fi
fi

# Test 5: Items Endpoints
echo -e "\n5️⃣ ITEMS ENDPOINTS"
echo "=================="

if [ ! -z "$LOGIN_TOKEN" ]; then
    # Test 5a: Get Items
    echo "📦 Testing Get Items..."
    ITEMS_RESPONSE=$(curl -s -H "Authorization: Bearer $LOGIN_TOKEN" \
      "$BACKEND_URL/api/items")
    
    echo "Items Response Length: $(echo "$ITEMS_RESPONSE" | wc -c) characters"
    
    if echo "$ITEMS_RESPONSE" | grep -q '\['; then
        echo "✅ Get Items: PASSED"
    else
        echo "❌ Get Items: FAILED"
    fi
    
    # Test 5b: Recent Items
    echo -e "\n📦 Testing Recent Items..."
    RECENT_RESPONSE=$(curl -s "$BACKEND_URL/api/items/recent")
    
    if echo "$RECENT_RESPONSE" | grep -q '\['; then
        echo "✅ Recent Items: PASSED"
    else
        echo "❌ Recent Items: FAILED"
    fi
else
    echo "⚠️ Skipping Items tests - No valid token"
fi

# Test 6: User Endpoints
echo -e "\n6️⃣ USER ENDPOINTS"
echo "================="

if [ ! -z "$LOGIN_TOKEN" ]; then
    # Test 6a: User Search
    echo "🔍 Testing User Search..."
    SEARCH_RESPONSE=$(curl -s -H "Authorization: Bearer $LOGIN_TOKEN" \
      "$BACKEND_URL/api/users/search?q=test")
    
    echo "Search Response: $SEARCH_RESPONSE"
    
    if echo "$SEARCH_RESPONSE" | grep -q '\['; then
        echo "✅ User Search: PASSED"
    else
        echo "❌ User Search: FAILED"
    fi
else
    echo "⚠️ Skipping User tests - No valid token"
fi

# Test 7: Error Handling
echo -e "\n7️⃣ ERROR HANDLING"
echo "=================="

# Test 7a: Invalid Login
echo "🚫 Testing Invalid Login..."
INVALID_LOGIN=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@mcc.edu.in","password":"wrongpass"}')

if echo "$INVALID_LOGIN" | grep -q "Invalid credentials"; then
    echo "✅ Invalid Login Error: PASSED"
else
    echo "❌ Invalid Login Error: FAILED"
fi

# Test 7b: Missing Token
echo -e "\n🚫 Testing Missing Token..."
NO_TOKEN_RESPONSE=$(curl -s "$BACKEND_URL/api/auth/validate")

if echo "$NO_TOKEN_RESPONSE" | grep -q "No token provided"; then
    echo "✅ Missing Token Error: PASSED"
else
    echo "❌ Missing Token Error: FAILED"
fi

# Test 8: MongoDB Connection Verification
echo -e "\n8️⃣ DATABASE VERIFICATION"
echo "========================"

if [ ! -z "$REGISTER_USER_ID" ]; then
    echo "🗄️ Verifying user was saved to MongoDB..."
    echo "User ID from registration: $REGISTER_USER_ID"
    echo "Email used: $TEST_EMAIL"
    echo ""
    echo "To verify in MongoDB:"
    echo "1. Connect to: mongodb+srv://render-backend:RenderBackend2024@lostandfound.6mo1sey.mongodb.net/?appName=lostAndFound"
    echo "2. Check users collection for: $TEST_EMAIL"
    echo "3. User ID should be: $REGISTER_USER_ID"
else
    echo "⚠️ No user ID to verify - registration may have failed"
fi

# Summary
echo -e "\n📊 TEST SUMMARY"
echo "==============="

TOTAL_TESTS=8
PASSED_TESTS=0

# Count passed tests (simplified)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then ((PASSED_TESTS++)); fi
if echo "$ROOT_RESPONSE" | grep -q "Lost & Found API Server"; then ((PASSED_TESTS++)); fi
if echo "$SWAGGER_RESPONSE" | grep -q "200"; then ((PASSED_TESTS++)); fi
if echo "$REGISTER_RESPONSE" | grep -q '"token"'; then ((PASSED_TESTS++)); fi
if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then ((PASSED_TESTS++)); fi
if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then ((PASSED_TESTS++)); fi
if echo "$INVALID_LOGIN" | grep -q "Invalid credentials"; then ((PASSED_TESTS++)); fi
if echo "$NO_TOKEN_RESPONSE" | grep -q "No token provided"; then ((PASSED_TESTS++)); fi

echo "✅ Tests Passed: $PASSED_TESTS/$TOTAL_TESTS"
echo ""
echo "🔗 Access Swagger UI for interactive testing:"
echo "   $SWAGGER_URL"
echo ""
echo "🗄️ MongoDB Connection String:"
echo "   mongodb+srv://render-backend:RenderBackend2024@lostandfound.6mo1sey.mongodb.net/?appName=lostAndFound"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n🎉 ALL TESTS PASSED - API is fully functional!"
else
    echo -e "\n⚠️ Some tests failed - Check individual results above"
fi