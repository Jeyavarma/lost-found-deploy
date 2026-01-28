const rateLimit = require('express-rate-limit');

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduced to 5 attempts per IP+email combination
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `${req.ip}-${email}`;
  },
  skip: (req) => {
    return req.path.includes('/validate'); // Only skip validation endpoint
  }
});

// Separate strict limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-${req.body?.email || 'unknown'}`
});

// Admin route limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lower limit for admin operations
  message: { error: 'Too many admin requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for general API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat-specific rate limiter (more permissive)
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: { error: 'Too many messages. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production'
});

// Enhanced security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  
  // Strict Transport Security (HTTPS enforcement)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Enhanced CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.cloudinary.com https://lost-found-79xn.onrender.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
};

// Simple CSRF-like protection using custom headers
const csrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const userAgent = req.get('User-Agent');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://lost-found-mcc.vercel.app',
      'https://mcc-lost-found.vercel.app',
      'https://lost-found-79xn.onrender.com'
    ];
    
    // Allow requests with valid origin/referer or from browsers
    if (origin || referer || (userAgent && userAgent.includes('Mozilla'))) {
      const requestOrigin = origin || (referer && new URL(referer).origin);
      
      // Also allow any vercel.app subdomain in production
      const isVercelDomain = requestOrigin && requestOrigin.match(/https:\/\/.*\.vercel\.app$/);
      
      if (requestOrigin && !allowedOrigins.includes(requestOrigin) && !isVercelDomain) {
        return res.status(403).json({ error: 'Invalid origin' });
      }
    }
  }
  next();
};

module.exports = { authLimiter, apiLimiter, chatLimiter, passwordResetLimiter, adminLimiter, securityHeaders, csrfProtection };