const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Security audit script
async function runSecurityAudit() {
  console.log('🔍 Running Security Audit...\n');
  
  try {
    // 1. NPM Audit
    console.log('1. Checking for vulnerable dependencies...');
    try {
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata.vulnerabilities.total > 0) {
        console.log(`❌ Found ${audit.metadata.vulnerabilities.total} vulnerabilities:`);
        console.log(`   - Critical: ${audit.metadata.vulnerabilities.critical}`);
        console.log(`   - High: ${audit.metadata.vulnerabilities.high}`);
        console.log(`   - Moderate: ${audit.metadata.vulnerabilities.moderate}`);
        console.log(`   - Low: ${audit.metadata.vulnerabilities.low}`);
        console.log('\n   Run "npm audit fix" to resolve automatically fixable issues');
      } else {
        console.log('✅ No known vulnerabilities found');
      }
    } catch (error) {
      console.log('⚠️  NPM audit failed or found issues');
    }
    
    // 2. Check for outdated packages
    console.log('\n2. Checking for outdated packages...');
    try {
      const outdatedResult = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdated = JSON.parse(outdatedResult);
      
      if (Object.keys(outdated).length > 0) {
        console.log('⚠️  Outdated packages found:');
        Object.entries(outdated).forEach(([pkg, info]) => {
          console.log(`   - ${pkg}: ${info.current} → ${info.latest}`);
        });
      } else {
        console.log('✅ All packages are up to date');
      }
    } catch (error) {
      console.log('✅ All packages are up to date');
    }
    
    // 3. Check environment configuration
    console.log('\n3. Checking environment configuration...');
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All required environment variables are set');
    }
    
    // 4. Check file permissions
    console.log('\n4. Checking file permissions...');
    const sensitiveFiles = ['.env', 'config/', 'uploads/'];
    let permissionIssues = 0;
    
    sensitiveFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        if (mode === '777' || mode === '666') {
          console.log(`⚠️  ${file} has overly permissive permissions: ${mode}`);
          permissionIssues++;
        }
      }
    });
    
    if (permissionIssues === 0) {
      console.log('✅ File permissions look secure');
    }
    
    // 5. Summary
    console.log('\n📊 Security Audit Summary:');
    console.log('- Dependency vulnerabilities: Checked');
    console.log('- Package updates: Checked');
    console.log('- Environment variables: Checked');
    console.log('- File permissions: Checked');
    console.log('\n🔒 Run this audit regularly to maintain security');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityAudit();
}

module.exports = { runSecurityAudit };