const jwt = require('jsonwebtoken');
const config = require('../../config/environment');

// Session management utilities
class SessionManager {
  // Generate secure session token
  static generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '24h',
      issuer: 'mcc-lost-found',
      audience: 'mcc-users'
    };
    
    return jwt.sign(payload, config.JWT_SECRET, { ...defaultOptions, ...options });
  }
  
  // Verify and decode token
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        issuer: 'mcc-lost-found',
        audience: 'mcc-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Check if token is about to expire (within 1 hour)
  static isTokenExpiringSoon(token) {
    try {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      return timeUntilExpiry < 3600; // 1 hour
    } catch {
      return true;
    }
  }
  
  // Refresh token if needed
  static refreshTokenIfNeeded(token, userPayload) {
    if (this.isTokenExpiringSoon(token)) {
      return this.generateToken(userPayload);
    }
    return token;
  }
}

// Token blacklist for logout functionality
const tokenBlacklist = new Set();

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Clean up old tokens periodically
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

module.exports = { SessionManager, blacklistToken, isTokenBlacklisted };