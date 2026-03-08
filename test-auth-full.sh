#!/bin/bash

echo "🧪 COMPREHENSIVE LOGIN & SIGNUP TEST"
echo "===================================="

BACKEND_URL="https://lost-found-79xn.onrender.com"
TEST_EMAIL="testuser$(date +%s)@mcc.edu.in"
TEST_PASSWORD="TestPass123!"

# Test 1: Signup
echo -e "\n1️⃣ TESTING SIGNUP"
echo "=================="

SIGNUP_DATA='{
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

echo "📝 Registering new user: $TEST_EMAIL"
SIGNUP_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$SIGNUP_DATA")

echo "Signup Response: $SIGNUP_RESPONSE"

if echo "$SIGNUP_RESPONSE" | grep -q '"token"'; then
    echo "✅ Signup: SUCCESS"
    SIGNUP_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "🔑 Signup Token: ${SIGNUP_TOKEN:0:30}..."
else
    echo "❌ Signup: FAILED"
fi

# Test 2: Login with existing user
echo -e "\n2️⃣ TESTING LOGIN (Existing User)"
echo "================================="

LOGIN_DATA='{
  "email": "2@mcc.edu.in",
  "password": "123456789"
}'

echo "🔐 Logging in existing user: 2@mcc.edu.in"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

echo "Login Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
    echo "✅ Login: SUCCESS"
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "🔑 Login Token: ${LOGIN_TOKEN:0:30}..."
else
    echo "❌ Login: FAILED"
fi

# Test 3: Token Validation
echo -e "\n3️⃣ TESTING TOKEN VALIDATION"
echo "============================"

if [ ! -z "$LOGIN_TOKEN" ]; then
    echo "🔍 Validating login token..."
    VALIDATE_RESPONSE=$(curl -s -H "Authorization: Bearer $LOGIN_TOKEN" \
      "$BACKEND_URL/api/auth/validate")
    
    echo "Validation Response: $VALIDATE_RESPONSE"
    
    if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then
        echo "✅ Token Validation: SUCCESS"
    else
        echo "❌ Token Validation: FAILED"
    fi
else
    echo "⚠️ No token to validate"
fi

# Test 4: Login with newly registered user
if [ ! -z "$SIGNUP_TOKEN" ]; then
    echo -e "\n4️⃣ TESTING LOGIN (New User)"
    echo "==========================="
    
    NEW_LOGIN_DATA='{
      "email": "'$TEST_EMAIL'",
      "password": "'$TEST_PASSWORD'"
    }'
    
    echo "🔐 Logging in newly registered user: $TEST_EMAIL"
    NEW_LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "$NEW_LOGIN_DATA")
    
    echo "New User Login Response: $NEW_LOGIN_RESPONSE"
    
    if echo "$NEW_LOGIN_RESPONSE" | grep -q '"token"'; then
        echo "✅ New User Login: SUCCESS"
    else
        echo "❌ New User Login: FAILED"
    fi
fi

# Test 5: Error Cases
echo -e "\n5️⃣ TESTING ERROR CASES"
echo "======================"

# Invalid email
echo "🚫 Testing invalid email..."
INVALID_EMAIL_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test"}')

if echo "$INVALID_EMAIL_RESPONSE" | grep -q "Invalid email format"; then
    echo "✅ Invalid Email Validation: SUCCESS"
else
    echo "❌ Invalid Email Validation: FAILED"
fi

# Missing credentials
echo "🚫 Testing missing credentials..."
MISSING_CREDS_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mcc.edu.in"}')

if echo "$MISSING_CREDS_RESPONSE" | grep -q "Email and password are required"; then
    echo "✅ Missing Credentials Validation: SUCCESS"
else
    echo "❌ Missing Credentials Validation: FAILED"
fi

# Summary
echo -e "\n📊 TEST SUMMARY"
echo "==============="

TESTS_PASSED=0
TOTAL_TESTS=0

# Count results
if echo "$SIGNUP_RESPONSE" | grep -q '"token"'; then ((TESTS_PASSED++)); fi
((TOTAL_TESTS++))

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then ((TESTS_PASSED++)); fi
((TOTAL_TESTS++))

if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then ((TESTS_PASSED++)); fi
((TOTAL_TESTS++))

if echo "$INVALID_EMAIL_RESPONSE" | grep -q "Invalid email format"; then ((TESTS_PASSED++)); fi
((TOTAL_TESTS++))

if echo "$MISSING_CREDS_RESPONSE" | grep -q "Email and password are required"; then ((TESTS_PASSED++)); fi
((TOTAL_TESTS++))

echo "✅ Tests Passed: $TESTS_PASSED/$TOTAL_TESTS"

if [ $TESTS_PASSED -eq $TOTAL_TESTS ]; then
    echo "🎉 ALL TESTS PASSED - Authentication system is fully functional!"
else
    echo "⚠️ Some tests failed - Check individual results above"
fi