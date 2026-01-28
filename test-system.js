#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 LOST & FOUND SYSTEM TEST\n');

// Test results
const results = {
  backend: {},
  frontend: {},
  database: {},
  dependencies: {},
  configuration: {},
  issues: []
};

// 1. Check Backend Dependencies
console.log('1️⃣ BACKEND DEPENDENCIES');
try {
  const backendPackage = JSON.parse(fs.readFileSync('/home/varma/projects/lost-found-deploy/backend/package.json'));
  console.log('✅ Backend package.json found');
  results.backend.packageJson = true;
  
  // Check if node_modules exists
  if (fs.existsSync('/home/varma/projects/lost-found-deploy/backend/node_modules')) {
    console.log('✅ Backend node_modules found');
    results.backend.nodeModules = true;
  } else {
    console.log('❌ Backend node_modules missing');
    results.backend.nodeModules = false;
    results.issues.push('Backend dependencies not installed');
  }
} catch (error) {
  console.log('❌ Backend package.json error:', error.message);
  results.backend.packageJson = false;
  results.issues.push('Backend package.json missing or corrupted');
}

// 2. Check Frontend Dependencies
console.log('\n2️⃣ FRONTEND DEPENDENCIES');
try {
  const frontendPackage = JSON.parse(fs.readFileSync('/home/varma/projects/lost-found-deploy/frontend/package.json'));
  console.log('✅ Frontend package.json found');
  results.frontend.packageJson = true;
  
  if (fs.existsSync('/home/varma/projects/lost-found-deploy/frontend/node_modules')) {
    console.log('✅ Frontend node_modules found');
    results.frontend.nodeModules = true;
  } else {
    console.log('❌ Frontend node_modules missing');
    results.frontend.nodeModules = false;
    results.issues.push('Frontend dependencies not installed');
  }
} catch (error) {
  console.log('❌ Frontend package.json error:', error.message);
  results.frontend.packageJson = false;
  results.issues.push('Frontend package.json missing or corrupted');
}

// 3. Check Environment Files
console.log('\n3️⃣ ENVIRONMENT CONFIGURATION');
const backendEnv = '/home/varma/projects/lost-found-deploy/backend/.env';
const frontendEnv = '/home/varma/projects/lost-found-deploy/frontend/.env.local';

if (fs.existsSync(backendEnv)) {
  console.log('✅ Backend .env found');
  results.configuration.backendEnv = true;
  
  // Check critical env vars
  const envContent = fs.readFileSync(backendEnv, 'utf8');
  const hasMongoUri = envContent.includes('MONGODB_URI');
  const hasJwtSecret = envContent.includes('JWT_SECRET');
  
  console.log(`  ${hasMongoUri ? '✅' : '❌'} MONGODB_URI configured`);
  console.log(`  ${hasJwtSecret ? '✅' : '❌'} JWT_SECRET configured`);
  
  if (!hasMongoUri) results.issues.push('MONGODB_URI not configured');
  if (!hasJwtSecret) results.issues.push('JWT_SECRET not configured');
} else {
  console.log('❌ Backend .env missing');
  results.configuration.backendEnv = false;
  results.issues.push('Backend environment file missing');
}

if (fs.existsSync(frontendEnv)) {
  console.log('✅ Frontend .env.local found');
  results.configuration.frontendEnv = true;
} else {
  console.log('❌ Frontend .env.local missing');
  results.configuration.frontendEnv = false;
  results.issues.push('Frontend environment file missing');
}

// 4. Check Database Connection
console.log('\n4️⃣ DATABASE CONNECTION');
const mongoose = require('mongoose');

async function testDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connection successful');
    results.database.connection = true;
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    results.database.connection = false;
    results.issues.push(`Database connection failed: ${error.message}`);
  }
}

// 5. Check Redis (Optional)
console.log('\n5️⃣ REDIS STATUS');
try {
  const { execSync } = require('child_process');
  execSync('which redis-cli', { stdio: 'ignore' });
  try {
    execSync('redis-cli ping', { stdio: 'ignore', timeout: 2000 });
    console.log('✅ Redis is running');
    results.dependencies.redis = true;
  } catch {
    console.log('⚠️  Redis installed but not running (optional)');
    results.dependencies.redis = false;
  }
} catch (error) {
  console.log('⚠️  Redis not installed (optional for basic functionality)');
  results.dependencies.redis = false;
}

// 6. Test Backend Server Start
console.log('\n6️⃣ BACKEND SERVER TEST');
async function testBackendServer() {
  return new Promise((resolve) => {
    const server = spawn('node', ['server.js'], {
      cwd: '/home/varma/projects/lost-found-deploy/backend',
      stdio: 'pipe'
    });
    
    let output = '';
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    setTimeout(() => {
      server.kill();
      if (output.includes('Server running on port')) {
        console.log('✅ Backend server starts successfully');
        results.backend.serverStart = true;
      } else {
        console.log('❌ Backend server failed to start');
        console.log('Error output:', output.slice(-200));
        results.backend.serverStart = false;
        results.issues.push('Backend server fails to start');
      }
      resolve();
    }, 5000);
  });
}

// 7. Test API Endpoints
console.log('\n7️⃣ API ENDPOINTS TEST');
async function testApiEndpoints() {
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = 'http://localhost:5000';
    
    const endpoints = [
      { path: '/', name: 'Root endpoint' },
      { path: '/api/health', name: 'Health check' },
      { path: '/api/items', name: 'Items endpoint' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, { timeout: 3000 });
        if (response.ok) {
          console.log(`✅ ${endpoint.name} working`);
        } else {
          console.log(`❌ ${endpoint.name} returned ${response.status}`);
          results.issues.push(`${endpoint.name} not working`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name} failed: ${error.message}`);
        results.issues.push(`${endpoint.name} connection failed`);
      }
    }
  } catch (error) {
    console.log('⚠️  Skipping API tests - fetch not available');
  }
}

// Run all tests
async function runTests() {
  await testDatabase();
  await testBackendServer();
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  if (results.issues.length === 0) {
    console.log('🎉 All systems operational!');
  } else {
    console.log(`❌ Found ${results.issues.length} issues:`);
    results.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('=======================');
  
  if (!results.backend.nodeModules) {
    console.log('• Run: cd backend && npm install');
  }
  
  if (!results.frontend.nodeModules) {
    console.log('• Run: cd frontend && npm install');
  }
  
  if (!results.configuration.backendEnv) {
    console.log('• Create backend/.env file with required variables');
  }
  
  if (!results.configuration.frontendEnv) {
    console.log('• Create frontend/.env.local file');
  }
  
  if (!results.database.connection) {
    console.log('• Start MongoDB service or check connection string');
  }
  
  if (!results.dependencies.redis) {
    console.log('• Install Redis (optional): sudo apt install redis-server');
  }
  
  console.log('\n✅ Test completed!');
}

runTests().catch(console.error);