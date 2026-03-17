#!/usr/bin/env node

/**
 * Lazy Module Loading Detector
 * Identifies files with lazy module loading and suggests fixes
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'backend/middleware/security/chatSecurity.js',
  'backend/middleware/auditLogger.js',
  'backend/middleware/security/security.js',
  'backend/middleware/gracefulShutdown.js',
  'backend/middleware/validation.js',
  'backend/middleware/monitoring/activityTracker.js',
  'backend/middleware/requestTracker.js',
  'backend/middleware/security/rateLimiter.js'
];

console.log('\n' + '='.repeat(70));
console.log('🔍 LAZY MODULE LOADING DETECTOR');
console.log('='.repeat(70) + '\n');

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find requires inside functions
  let inFunction = false;
  let functionName = '';
  let lazyLoads = [];
  
  lines.forEach((line, index) => {
    // Detect function start
    if (line.match(/^\s*(async\s+)?(function|const\s+\w+\s*=\s*(async\s*)?\(|const\s+\w+\s*=\s*(async\s*)?\w+\s*=>)/)) {
      inFunction = true;
      functionName = line.trim().substring(0, 50);
    }
    
    // Detect function end
    if (inFunction && line.match(/^}/)) {
      inFunction = false;
    }
    
    // Find requires inside functions
    if (inFunction && line.includes('require(')) {
      lazyLoads.push({
        line: index + 1,
        code: line.trim(),
        function: functionName
      });
    }
  });
  
  if (lazyLoads.length > 0) {
    console.log(`📄 ${file}`);
    console.log('─'.repeat(70));
    lazyLoads.forEach(item => {
      console.log(`  Line ${item.line}: ${item.code}`);
    });
    console.log('');
  }
});

console.log('='.repeat(70));
console.log('✅ FIX: Move all require() statements to the top of each file');
console.log('='.repeat(70) + '\n');

console.log('📋 PATTERN TO FOLLOW:\n');
console.log('❌ WRONG:');
console.log('─'.repeat(70));
console.log(`
function myHandler(req, res) {
  const module = require('module-name');
  // use module
}
`);

console.log('✅ CORRECT:');
console.log('─'.repeat(70));
console.log(`
const module = require('module-name');

function myHandler(req, res) {
  // use module
}
`);

console.log('\n💡 BENEFITS:');
console.log('  • Faster request handling');
console.log('  • Better performance');
console.log('  • Cleaner code');
console.log('  • Easier to maintain');
console.log('  • Follows best practices\n');
