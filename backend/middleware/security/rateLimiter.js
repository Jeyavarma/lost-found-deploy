const rateLimit = require('express-rate-limit');

// Student login rate limiter - more restrictive
const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to student role
    return req.body.role !== 'student';
  }
});

// Staff/Admin login rate limiter - less restrictive
const staffAdminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to staff/admin roles
    return req.body.role === 'student';
  }
});

module.exports = {
  studentLoginLimiter,
  staffAdminLoginLimiter
};