#!/bin/bash

# Configuration
FRONTEND_PORT=3002
BACKEND_PORT=10000
BASE_DIR=$(pwd)

echo "🚀 Starting MCC Lost & Found Development Environment..."

# Function to clean up processes on a port
cleanup_port() {
    local port=$1
    echo "🧹 Cleaning up port $port..."
    # Try different methods for cleanup
    fuser -k $port/tcp 2>/dev/null
    lsof -ti :$port | xargs kill -9 2>/dev/null
}

# Clean up existing processes
cleanup_port $FRONTEND_PORT
cleanup_port $BACKEND_PORT
sleep 2

# Start backend
echo "📡 Starting backend server..."
cd "$BASE_DIR/backend" && npm run dev &
BACKEND_PID=$!

# Wait for backend
sleep 5

# Start frontend  
echo "🌐 Starting frontend server..."
cd "$BASE_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers started!"
echo "📡 Backend: http://localhost:$BACKEND_PORT"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "🌐 Network Frontend: http://10.10.54.72:$FRONTEND_PORT"
echo ""
echo "⏹️  Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    cleanup_port $FRONTEND_PORT
    cleanup_port $BACKEND_PORT
    exit
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
