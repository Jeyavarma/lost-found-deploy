#!/bin/bash

echo "🔍 Token Validation Issue Analysis"
echo "=================================="

# Test login and get token
echo "1. Getting fresh token..."
RESPONSE=$(curl -s -X POST https://lost-found-79xn.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"2@mcc.edu.in","password":"123456789"}')

echo "Login Response: $RESPONSE"

# Extract token
TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Extracted Token: $TOKEN"

# Test validation
echo -e "\n2. Testing token validation..."
VALIDATION=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://lost-found-79xn.onrender.com/api/auth/validate)

echo "Validation Response: $VALIDATION"

# Decode JWT payload (base64 decode the middle part)
echo -e "\n3. JWT Token Analysis..."
if [ ! -z "$TOKEN" ]; then
    # Split token by dots
    HEADER=$(echo "$TOKEN" | cut -d'.' -f1)
    PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)
    SIGNATURE=$(echo "$TOKEN" | cut -d'.' -f3)
    
    echo "JWT Parts:"
    echo "- Header: $HEADER"
    echo "- Payload: $PAYLOAD"
    echo "- Signature: $SIGNATURE"
    
    # Decode payload (add padding if needed)
    PAYLOAD_PADDED="$PAYLOAD"
    while [ $((${#PAYLOAD_PADDED} % 4)) -ne 0 ]; do
        PAYLOAD_PADDED="${PAYLOAD_PADDED}="
    done
    
    echo -e "\nDecoded Payload:"
    echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Failed to decode"
fi

echo -e "\n4. Issue Analysis:"
echo "The problem is likely:"
echo "- JWT secret mismatch between login and validation"
echo "- SessionManager using different JWT options (issuer/audience)"
echo "- Token format inconsistency"