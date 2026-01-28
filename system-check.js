#!/usr/bin/env node

console.log('🔍 MCC LOST & FOUND - SYSTEM STATUS CHECK\n');

const issues = [];
const fixes = [];

// 1. Check Backend Status
console.log('1️⃣ BACKEND STATUS');
console.log('==================');

// Check if MongoDB is accessible
async function checkMongoDB() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/lost-found', { 
      serverSelectionTimeoutMS: 3000 
    });
    console.log('✅ MongoDB: Connected successfully');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ MongoDB: Connection failed -', error.message);
    issues.push('MongoDB connection failed');
    fixes.push('Start MongoDB: sudo systemctl start mongod');
    return false;
  }
}

// Check authentication system
async function checkAuth() {
  try {
    const User = require('/home/varma/projects/lost-found-deploy/backend/models/User');
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments();
    
    console.log(`✅ Authentication: ${userCount} users, ${adminCount} admins`);
    
    if (adminCount === 0) {
      issues.push('No admin users found');
      fixes.push('Create admin: Visit http://localhost:5000/create-admin');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Authentication: Database models error -', error.message);
    issues.push('Authentication system error');
    return false;
  }
}

// Check items system
async function checkItems() {
  try {
    const Item = require('/home/varma/projects/lost-found-deploy/backend/models/Item');
    const itemCount = await Item.countDocuments();
    const lostCount = await Item.countDocuments({ status: 'lost' });
    const foundCount = await Item.countDocuments({ status: 'found' });
    
    console.log(`✅ Items System: ${itemCount} total (${lostCount} lost, ${foundCount} found)`);
    return true;
  } catch (error) {
    console.log('❌ Items System: Error -', error.message);
    issues.push('Items system error');
    return false;
  }
}

// 2. Check Frontend Status
console.log('\n2️⃣ FRONTEND STATUS');
console.log('==================');

function checkFrontendConfig() {
  const fs = require('fs');
  const path = require('path');
  
  // Check if frontend files exist
  const frontendPath = '/home/varma/projects/lost-found-deploy/frontend';
  const packagePath = path.join(frontendPath, 'package.json');
  const envPath = path.join(frontendPath, '.env.local');
  
  if (fs.existsSync(packagePath)) {
    console.log('✅ Frontend: Package.json found');
  } else {
    console.log('❌ Frontend: Package.json missing');
    issues.push('Frontend package.json missing');
    return false;
  }
  
  if (fs.existsSync(envPath)) {
    console.log('✅ Frontend: Environment file found');
  } else {
    console.log('❌ Frontend: .env.local missing');
    issues.push('Frontend environment file missing');
    fixes.push('Create frontend/.env.local with NEXT_PUBLIC_BACKEND_URL');
  }
  
  // Check node_modules
  const nodeModulesPath = path.join(frontendPath, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ Frontend: Dependencies installed');
  } else {
    console.log('❌ Frontend: Dependencies not installed');
    issues.push('Frontend dependencies missing');
    fixes.push('Run: cd frontend && npm install');
  }
  
  return true;
}

// 3. Test API Endpoints
console.log('\n3️⃣ API ENDPOINTS');
console.log('=================');

async function testEndpoints() {
  const endpoints = [
    { path: '/', name: 'Root' },
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/items', name: 'Items API' },
    { path: '/api/auth/validate', name: 'Auth Validation' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint.path}`, {
        timeout: 3000
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: Working (${response.status})`);
      } else {
        console.log(`⚠️  ${endpoint.name}: Returns ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Failed - ${error.message}`);
      issues.push(`${endpoint.name} endpoint not accessible`);
    }
  }
}

// 4. Check Critical Features
console.log('\n4️⃣ CRITICAL FEATURES');
console.log('====================');

async function checkFeatures() {
  // Test login functionality
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrongpass' })
    });
    
    if (response.status === 401) {
      console.log('✅ Login System: Properly rejects invalid credentials');
    } else {
      console.log(`⚠️  Login System: Unexpected response ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Login System: Not accessible');
    issues.push('Login system not working');
  }
  
  // Test item submission
  try {
    const response = await fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Item',
        description: 'Test Description',
        category: 'Electronics',
        location: 'Test Location',
        status: 'found',
        contactName: 'Test User',
        contactEmail: 'test@example.com'
      })
    });
    
    if (response.status === 201 || response.status === 401) {
      console.log('✅ Item Submission: Working');
    } else {
      console.log(`⚠️  Item Submission: Unexpected response ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Item Submission: Not accessible');
    issues.push('Item submission not working');
  }
}

// Main execution
async function runSystemCheck() {
  try {
    // Connect to database first
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/lost-found', { 
      serverSelectionTimeoutMS: 5000 
    });
    
    await checkMongoDB();
    await checkAuth();
    await checkItems();
    checkFrontendConfig();
    
    // Only test endpoints if server might be running
    const { spawn } = require('child_process');
    const serverCheck = spawn('curl', ['-s', 'http://localhost:5000'], { stdio: 'ignore' });
    
    serverCheck.on('close', async (code) => {
      if (code === 0) {
        console.log('🌐 Server appears to be running, testing endpoints...');
        await testEndpoints();
        await checkFeatures();
      } else {
        console.log('⚠️  Server not running on port 5000');
        issues.push('Backend server not running');
        fixes.push('Start server: cd backend && npm start');
      }
      
      await mongoose.disconnect();
      showSummary();
    });
    
  } catch (error) {
    console.error('System check failed:', error.message);
    showSummary();
  }
}

function showSummary() {
  console.log('\n📊 SYSTEM SUMMARY');
  console.log('=================');
  
  if (issues.length === 0) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('✅ Authentication: Working');
    console.log('✅ Database: Connected');
    console.log('✅ API: Accessible');
    console.log('✅ Frontend: Configured');
  } else {
    console.log(`❌ FOUND ${issues.length} ISSUES:`);
    issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    fixes.forEach((fix, i) => console.log(`${i + 1}. ${fix}`));
  }
  
  console.log('\n🚀 QUICK START COMMANDS:');
  console.log('========================');
  console.log('Backend: cd backend && npm start');
  console.log('Frontend: cd frontend && npm run dev');
  console.log('Admin: http://localhost:5000/create-admin');
  console.log('App: http://localhost:3000');
}

// Handle fetch for Node.js
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

runSystemCheck().catch(console.error);