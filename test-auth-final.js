#!/usr/bin/env node

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

const c = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

const log = (msg, color = 'reset') => console.log(`${c[color]}${msg}${c.reset}`);
const logStep = (step, msg) => { log(`\n${'='.repeat(60)}`, 'cyan'); log(`${step}. ${msg}`, 'bright'); log('='.repeat(60), 'cyan'); };
const logTiming = (label, dur) => log(`⏱️  ${label}: ${dur}ms`, dur < 1000 ? 'green' : dur < 3000 ? 'yellow' : 'red');
const logSuccess = (msg) => log(`✅ ${msg}`, 'green');
const logError = (msg) => log(`❌ ${msg}`, 'red');
const logWarning = (msg) => log(`⚠️  ${msg}`, 'yellow');
const logInfo = (msg) => log(`ℹ️  ${msg}`, 'blue');

async function wakeBackend() {
  logStep(0, 'Waking Up Backend (Handling Cold Start)');
  logInfo('This may take 30-60 seconds on Render free tier...');
  
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
    
    const response = await fetch(`${BACKEND_URL}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const duration = Date.now() - start;
    logTiming('Backend wake-up time', duration);
    
    if (duration > 30000) {
      logWarning('COLD START DETECTED - Backend was sleeping');
      logInfo('This is why your users experience slow login/signup!');
      return { coldStart: true, duration };
    } else {
      logSuccess('Backend was already warm');
      return { coldStart: false, duration };
    }
  } catch (error) {
    const duration = Date.now() - start;
    logError(`Failed to wake backend after ${duration}ms: ${error.message}`);
    return { coldStart: false, duration, error: error.message };
  }
}

async function testRegistration() {
  logStep(1, 'Testing User Registration');
  
  logInfo('Registering user:');
  log(`  Email: ${TEST_USER.email}`, 'cyan');
  
  const start = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const duration = Date.now() - start;
    logTiming('Registration time', duration);
    
    const data = await response.json();
    
    if (response.status === 201) {
      logSuccess('Registration successful!');
      if (data.token) logSuccess('JWT token received');
      if (data.userId) logInfo(`User ID: ${data.userId}`);
      
      if (duration < 1000) logSuccess('Excellent performance (<1s)');
      else if (duration < 3000) logWarning('Acceptable (1-3s) - optimize DB queries');
      else logError('Slow (>3s) - multiple DB queries + bcrypt hashing');
      
      return { success: true, duration, token: data.token, userId: data.userId };
    } else {
      logError(`Failed: ${data.message}`);
      return { success: false, duration, error: data.message };
    }
  } catch (error) {
    const duration = Date.now() - start;
    logError(`Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testLogin(email, password) {
  logStep(2, 'Testing User Login');
  
  logInfo(`Logging in: ${email}`);
  
  const start = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const duration = Date.now() - start;
    logTiming('Login time', duration);
    
    const data = await response.json();
    
    if (response.status === 200) {
      logSuccess('Login successful!');
      if (data.token) logSuccess('JWT token received');
      if (data.role) logInfo(`Role: ${data.role}`);
      
      if (duration < 500) logSuccess('Excellent (<500ms)');
      else if (duration < 1500) logSuccess('Good (500ms-1.5s)');
      else if (duration < 3000) logWarning('Acceptable (1.5-3s) - optimize bcrypt/DB');
      else logError('Slow (>3s) - critical optimization needed');
      
      return { success: true, duration, token: data.token };
    } else {
      logError(`Failed: ${data.message}`);
      return { success: false, duration, error: data.message };
    }
  } catch (error) {
    const duration = Date.now() - start;
    logError(`Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function generateReport(results) {
  logStep(3, 'Performance Report');
  
  log('\n📊 TIMING BREAKDOWN:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  if (results.wake) {
    logTiming('Backend Wake-Up', results.wake.duration);
    if (results.wake.coldStart) {
      logError('🚨 COLD START DETECTED - PRIMARY ISSUE!');
      log('\n💡 SOLUTIONS:', 'yellow');
      log('   1. Upgrade Render to paid tier ($7/mo)', 'yellow');
      log('   2. Use cron job to ping every 10 min', 'yellow');
      log('   3. Switch to Railway/Fly.io (no cold starts)', 'yellow');
    }
  }
  
  if (results.registration) {
    logTiming('Registration', results.registration.duration);
    if (results.registration.duration > 3000) {
      log('\n🔍 REGISTRATION ISSUES:', 'yellow');
      log('   • 3 separate DB queries (email, studentId, rollNumber)', 'yellow');
      log('   • Bcrypt hashing (8 rounds)', 'yellow');
    }
  }
  
  if (results.login) {
    logTiming('Login', results.login.duration);
    if (results.login.duration > 2000) {
      log('\n🔍 LOGIN ISSUES:', 'yellow');
      log('   • Bcrypt comparison (8 rounds)', 'yellow');
      log('   • Multiple DB updates (lastLogin, isOnline, etc.)', 'yellow');
    }
  }
  
  const totalAuth = (results.registration?.duration || 0) + (results.login?.duration || 0);
  const totalUser = (results.wake?.duration || 0) + totalAuth;
  
  log('\n─'.repeat(60), 'cyan');
  logTiming('Total Auth Time (Register + Login)', totalAuth);
  logTiming('Total User Experience (Wake + Auth)', totalUser);
  
  log('\n🎯 VERDICT:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  if (results.wake?.coldStart) {
    logError('PRIMARY ISSUE: Render Cold Start');
    log('   Your code is fine - infrastructure is the problem', 'red');
  } else if (totalAuth < 2000) {
    logSuccess('Code is well optimized!');
  } else {
    logWarning('Code needs minor optimization');
  }
  
  log('\n💡 ACTION ITEMS:', 'bright');
  log('─'.repeat(60), 'cyan');
  
  const actions = [];
  if (results.wake?.coldStart) actions.push('1. [CRITICAL] Fix cold starts (upgrade or keep-alive)');
  if (results.registration?.duration > 3000) actions.push('2. [HIGH] Combine 3 DB queries into 1');
  if (results.login?.duration > 2000) actions.push('3. [MEDIUM] Batch DB updates in login');
  
  if (actions.length === 0) logSuccess('No issues - system is optimal!');
  else actions.forEach(a => log(`   ${a}`, 'yellow'));
  
  log('\n' + '='.repeat(60), 'cyan');
}

async function run() {
  log('\n' + '█'.repeat(60), 'magenta');
  log('  AUTH PERFORMANCE TEST', 'bright');
  log('█'.repeat(60) + '\n', 'magenta');
  
  logInfo(`Backend: ${BACKEND_URL}`);
  logInfo(`Started: ${new Date().toLocaleString()}`);
  
  const results = {};
  
  try {
    results.wake = await wakeBackend();
    if (results.wake.error) {
      logError('Backend unreachable. Check if it\'s running.');
      process.exit(1);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    results.registration = await testRegistration();
    if (!results.registration.success) {
      logError('Registration failed - cannot test login');
      await generateReport(results);
      process.exit(1);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    results.login = await testLogin(TEST_USER.email, TEST_USER.password);
    if (!results.login.success) {
      logError('Login failed after successful registration - BUG DETECTED!');
    }
    
    await generateReport(results);
    
    if (results.registration.success && results.login.success) {
      log('\n✅ All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n❌ Tests failed!', 'red');
      process.exit(1);
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();
