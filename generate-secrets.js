#!/usr/bin/env node

/**
 * Secret Generator for MCC Lost & Found
 * Generates cryptographically secure secrets for environment variables
 */

const crypto = require('crypto');

console.log('\n' + '='.repeat(60));
console.log('🔐 MCC LOST & FOUND - SECRET GENERATOR');
console.log('='.repeat(60) + '\n');

console.log('Copy these values to your Render environment variables:\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (64 chars):');
console.log(jwtSecret);
console.log('');

// Generate Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET (64 chars):');
console.log(sessionSecret);
console.log('');

// Generate API Key
const apiKey = crypto.randomBytes(24).toString('base64');
console.log('API_KEY (32 chars):');
console.log(apiKey);
console.log('');

// Generate Encryption Key
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY (64 chars):');
console.log(encryptionKey);
console.log('');

console.log('='.repeat(60));
console.log('⚠️  IMPORTANT NOTES:');
console.log('='.repeat(60));
console.log('1. Copy these to Render Dashboard → Environment');
console.log('2. Never commit these to git');
console.log('3. Store securely (password manager)');
console.log('4. Rotate every 90 days');
console.log('5. Use different secrets for dev/staging/prod');
console.log('');

console.log('📋 OTHER SECRETS TO ROTATE MANUALLY:');
console.log('─'.repeat(60));
console.log('• MongoDB: Atlas Dashboard → Database Access');
console.log('• Redis: Redis Cloud → Security → Regenerate Password');
console.log('• Cloudinary: Dashboard → Settings → Security');
console.log('• Firebase: Console → Service Accounts → Generate Key');
console.log('• Google OAuth: Cloud Console → Credentials');
console.log('• VAPID: Run "npx web-push generate-vapid-keys"');
console.log('• Resend: Dashboard → API Keys → Create');
console.log('• EmailJS: Dashboard → Account → API Keys');
console.log('');
