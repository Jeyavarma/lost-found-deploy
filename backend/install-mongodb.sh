#!/bin/bash
set -e

# MongoDB Installation Script for Ubuntu/Debian

echo "📦 Installing MongoDB Community Edition..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️ Warning: Running as root. Consider using sudo instead."
fi

# Check OS compatibility
if ! command -v apt-get &> /dev/null; then
    echo "❌ Error: This script is for Ubuntu/Debian systems only"
    exit 1
fi

# Import MongoDB public GPG key
echo "🔑 Importing MongoDB GPG key..."
if ! curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor; then
    echo "❌ Error: Failed to import MongoDB GPG key"
    exit 1
fi

# Add MongoDB repository
echo "📋 Adding MongoDB repository..."
if ! echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list; then
    echo "❌ Error: Failed to add MongoDB repository"
    exit 1
fi

# Update package database
echo "🔄 Updating package database..."
if ! sudo apt-get update; then
    echo "❌ Error: Failed to update package database"
    exit 1
fi

# Install MongoDB
echo "📦 Installing MongoDB..."
if ! sudo apt-get install -y mongodb-org; then
    echo "❌ Error: Failed to install MongoDB"
    exit 1
fi

# Start MongoDB service
echo "🚀 Starting MongoDB service..."
if ! sudo systemctl start mongod; then
    echo "❌ Error: Failed to start MongoDB service"
    exit 1
fi

if ! sudo systemctl enable mongod; then
    echo "⚠️ Warning: Failed to enable MongoDB service for auto-start"
fi

echo "✅ MongoDB installed successfully!"
echo "📋 Status:"
sudo systemctl status mongod --no-pager || echo "⚠️ Could not get service status"