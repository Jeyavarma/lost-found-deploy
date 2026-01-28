#!/bin/bash

echo "🔍 Lost & Found System Status Check"
echo "=================================="

# Check if backend directory exists
if [ -d "/home/varma/projects/lost-found/backend" ]; then
    echo "✅ Backend directory exists"
else
    echo "❌ Backend directory missing"
    exit 1
fi

# Check if frontend directory exists
if [ -d "/home/varma/projects/lost-found/frontend" ]; then
    echo "✅ Frontend directory exists"
else
    echo "❌ Frontend directory missing"
    exit 1
fi

# Check package.json files
if [ -f "/home/varma/projects/lost-found/backend/package.json" ]; then
    echo "✅ Backend package.json exists"
else
    echo "❌ Backend package.json missing"
fi

if [ -f "/home/varma/projects/lost-found/frontend/package.json" ]; then
    echo "✅ Frontend package.json exists"
else
    echo "❌ Frontend package.json missing"
fi

# Check key files
echo ""
echo "📁 Key Files Status:"
echo "==================="

files=(
    "/home/varma/projects/lost-found/backend/server.js"
    "/home/varma/projects/lost-found/backend/routes/items.js"
    "/home/varma/projects/lost-found/backend/routes/chat.js"
    "/home/varma/projects/lost-found/frontend/app/browse/page.tsx"
    "/home/varma/projects/lost-found/frontend/next.config.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename "$file")"
    else
        echo "❌ $(basename "$file") missing"
    fi
done

echo ""
echo "🚀 To start the system:"
echo "======================"
echo "1. Backend: cd backend && npm install && npm start"
echo "2. Frontend: cd frontend && npm install && npm run dev"
echo ""
echo "🌐 URLs:"
echo "========"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"