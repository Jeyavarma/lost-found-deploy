#!/bin/bash

echo "🔍 Testing Login Flow..."

# Test backend login
echo "📡 Testing backend login API..."
RESPONSE=$(curl -s -X POST https://lost-found-79xn.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"2@mcc.edu.in","password":"123456789","role":"student"}')

echo "Backend Response: $RESPONSE"

# Check if response contains token
if echo "$RESPONSE" | grep -q "token"; then
    echo "✅ Backend login working - token received"
    
    # Extract token
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "🔑 Token: ${TOKEN:0:20}..."
    
    # Test token validation
    echo "🔍 Testing token validation..."
    VALIDATION=$(curl -s -H "Authorization: Bearer $TOKEN" \
      https://lost-found-79xn.onrender.com/api/auth/validate)
    
    echo "Validation Response: $VALIDATION"
    
    if echo "$VALIDATION" | grep -q "valid.*true"; then
        echo "✅ Token validation working"
    else
        echo "❌ Token validation failed"
    fi
else
    echo "❌ Backend login failed"
fi

echo "🏁 Test complete"