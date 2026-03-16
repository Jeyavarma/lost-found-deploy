#!/usr/bin/env node

/**
 * Automated Auth Performance Test (Native Fetch)
 * Tests registration and login flow with detailed timing
 */

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_USER = {
  name: 'Test User Performance',
  email: `testuser${Date.now()}@mcc.edu.in`,
  password: 'TestPass123!@#',
  phone: '+91 9876543210',
  studentId: `TEST${Date.now()}`,
  shift: 'aided',
  department: 'bsc-cs',
  year: '2',
  rollNumber: `ROLL${Date.now()}`
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step, message) => {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${step}. ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
};

const logTiming = (label, duration) => {
  const color = duration < 1000 ? 'green' : duration < 3000 ? 'yellow' : 'red';
  log(`⏱️  ${label}: ${duration}ms`, color);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');

// Test functions
async function testBackendHealth() {
  logStep(1, 'Testing Backend Health');
  
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    logTiming('Health check response time', duration);
    
    if (duration > 30000) {
      logWarning('Backend took >30s to respond - likely COLD START on Render free tier');
      logInfo('This is the main cause of slow login/signup');
    } else if (duration > 5000) {
      logWarning('Backend took >5s to respond - possible network or server issues');
    } else {
      logSuccess('Backend is warm and responsive');
    }
    
    const data = await response.json();
    logInfo(`Status: ${data.status || 'OK'}`);
    return { success: true, duration, coldStart: duration > 30000 };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTiming('Health check failed after', duration);
    logError(`Health check failed: ${error.message}`);
    
    if (error.name === 'AbortError') {
      logError('Request timeout - backend may be down or extremely slow');
    }
    
    return { success: false, duration, error: error.message };
  }
}

async function testRegistration() {
  logStep(2, 'Testing User Registration');
  
  logInfo('Registering user with:');
  log(`  Email: ${TEST_USER.email}`, 'cyan');
  log(`  Student ID: ${TEST_USER.studentId}`, 'cyan');
  log(`  Roll Number: ${TEST_USER.rollNumber}`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const totalDuration = Date.now() - startTime;
    
    logTiming('Total registration time', totalDuration);
    
    const data = await response.json();
    
    if (response.status === 201) {
      logSuccess('Registration successful!');
      
      if (data.token) {
        logSuccess('JWT token received');
      }
      
      if (data.userId) {
        logInfo(`User ID: ${data.userId}`);
      }
      
      // Performance analysis
      if (totalDuration < 1000) {
        logSuccess('Excellent performance (<1s)');
      } else if (totalDuration < 3000) {
        logWarning('Acceptable performance (1-3s)');
        logInfo('Consider optimizing database queries');
      } else if (totalDuration < 5000) {
        logWarning('Slow performance (3-5s)');
        logWarning('Likely causes: Multiple DB queries, slow bcrypt hashing');
      } else {
        logError('Very slow performance (>5s)');
        logError('Critical issues: Check DB connection, bcrypt rounds, or network');
      }
      
      return {
        success: true,
        duration: totalDuration,
        token: data.token,
        userId: data.userId
      };
    } else {
      logError(`Registration failed: ${data.message || response.statusText}`);
      logInfo(`Status code: ${response.status}`);
      return { success: false, duration: totalDuration, error: data.message };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logTiming('Registration failed after', duration);
    logError(`Network error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testLogin(email, password) {
  logStep(3, 'Testing User Login');
  
  logInfo('Attempting login with:');
  log(`  Email: ${email}`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const totalDuration = Date.now() - startTime;
    
    logTiming('Total login time', totalDuration);
    
    const data = await response.json();
    
    if (response.status === 200) {
      logSuccess('Login successful!');
      
      if (data.token) {
        logSuccess('JWT token received');
      }
      
      if (data.userId || data.id) {
        logInfo(`User ID: ${data.userId || data.id}`);
      }
      
      if (data.role) {
        logInfo(`Role: ${data.role}`);
      }
      
      // Performance analysis
      if (totalDuration < 500) {
        logSuccess('Excellent login performance (<500ms)');
      } else if (totalDuration < 1500) {
        logSuccess('Good login performance (500ms-1.5s)');
      } else if (totalDuration < 3000) {
        logWarning('Acceptable login performance (1.5-3s)');
        logInfo('Consider reducing bcrypt rounds or optimizing DB queries');
      } else {
        logError('Slow login performance (>3s)');
        logError('Critical issues: Check bcrypt rounds, DB indexes, or network');
      }
      
      return {
        success: true,
        duration: totalDuration,
        token: data.token,
        userId: data.userId || data.id
      };
    } else {
      logError(`Login failed: ${data.message || response.statusText}`);
      logInfo(`Status code: ${response.status}`);
      return { success: false, duration: totalDuration, error: data.message };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logTiming('Login failed after', duration);
    logError(`Network error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function generatePerformanceReport(results) {
  logStep(4, 'Performance Analysis Report');
  
  log('\n📊 TIMING BREAKDOWN:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  if (results.health) {
    logTiming('Backend Health Check', results.health.duration);
    if (results.health.coldStart) {
      logError('⚠️  COLD START DETECTED - This is your main performance issue!');
      log('\n💡 SOLUTION:', 'yellow');
      log('   1. Upgrade to Render paid tier ($7/mo) to eliminate cold starts', 'yellow');
      log('   2. OR use a cron job to ping backend every 10 minutes', 'yellow');
      log('   3. OR switch to a provider without cold starts (Railway, Fly.io)', 'yellow');
    }
  }
  
  if (results.registration) {
    logTiming('User Registration', results.registration.duration);
    
    if (results.registration.duration > 3000) {
      log('\n🔍 REGISTRATION BOTTLENECKS:', 'yellow');
      log('   • Multiple database queries (3 separate checks)', 'yellow');
      log('   • Bcrypt password hashing (currently 8 rounds)', 'yellow');
      log('   • Email service initialization', 'yellow');
    }
  }
  
  if (results.login) {
    logTiming('User Login', results.login.duration);
    
    if (results.login.duration > 2000) {
      log('\n🔍 LOGIN BOTTLENECKS:', 'yellow');
      log('   • Bcrypt password comparison (8 rounds)', 'yellow');
      log('   • Database query for user lookup', 'yellow');
      log('   • Multiple database updates (lastLogin, isOnline, etc.)', 'yellow');
    }
  }
  
  // Calculate total time
  const totalTime = (results.registration?.duration || 0) + (results.login?.duration || 0);
  log('\n─'.repeat(60), 'cyan');
  logTiming('Total Auth Flow Time (Register + Login)', totalTime);
  
  // Overall assessment
  log('\n🎯 OVERALL ASSESSMENT:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  if (results.health?.coldStart) {
    logError('PRIMARY ISSUE: Render Free Tier Cold Start (30-60s delay)');
    log('   This is NOT a code issue - it\'s infrastructure', 'red');
  } else if (totalTime < 2000) {
    logSuccess('Excellent performance - no optimization needed');
  } else if (totalTime < 5000) {
    logWarning('Acceptable performance - minor optimizations recommended');
  } else {
    logError('Poor performance - optimization required');
  }
  
  // Recommendations
  log('\n💡 RECOMMENDATIONS:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  const recommendations = [];
  
  if (results.health?.coldStart) {
    recommendations.push('1. [CRITICAL] Eliminate cold starts (upgrade Render or use keep-alive)');
  }
  
  if (results.registration?.duration > 3000) {
    recommendations.push('2. [HIGH] Combine 3 database queries into 1 in registration');
    recommendations.push('3. [MEDIUM] Consider reducing bcrypt rounds from 8 to 6');
  }
  
  if (results.login?.duration > 2000) {
    recommendations.push('4. [MEDIUM] Optimize login database updates (batch them)');
    recommendations.push('5. [LOW] Add database indexes on email, studentId, rollNumber');
  }
  
  if (recommendations.length === 0) {
    logSuccess('No critical issues found - system is well optimized!');
  } else {
    recommendations.forEach(rec => log(`   ${rec}`, 'yellow'));
  }
  
  log('\n' + '='.repeat(60), 'cyan');
}

// Main test execution
async function runTests() {
  log('\n' + '█'.repeat(60), 'magenta');
  log('  MCC LOST & FOUND - AUTH PERFORMANCE TEST', 'bright');
  log('█'.repeat(60) + '\n', 'magenta');
  
  logInfo(`Testing backend: ${BACKEND_URL}`);
  logInfo(`Test started: ${new Date().toLocaleString()}`);
  
  const results = {};
  
  try {
    // Test 1: Backend Health
    results.health = await testBackendHealth();
    if (!results.health.success) {
      logError('Backend is not accessible. Aborting tests.');
      process.exit(1);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Registration
    results.registration = await testRegistration();
    if (!results.registration.success) {
      logError('Registration failed. Cannot proceed with login test.');
      await generatePerformanceReport(results);
      process.exit(1);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Login
    results.login = await testLogin(TEST_USER.email, TEST_USER.password);
    if (!results.login.success) {
      logError('Login failed after successful registration!');
      logError('This indicates a critical bug in the auth flow.');
    }
    
    // Generate report
    await generatePerformanceReport(results);
    
    // Exit with appropriate code
    const allPassed = results.registration.success && results.login.success;
    if (allPassed) {
      log('\n✅ All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n❌ Some tests failed!', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();
