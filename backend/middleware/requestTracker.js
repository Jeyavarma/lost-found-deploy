const crypto = require('crypto');

// Request ID middleware for tracking
const requestTracker = (req, res, next) => {
  // Generate unique request ID
  req.id = crypto.randomUUID();
  
  // Add to response headers for debugging
  res.setHeader('X-Request-ID', req.id);
  
  // Log request start
  const startTime = Date.now();
  console.log(`[${req.id}] ${req.method} ${req.originalUrl} - Started`);
  
  // Override res.end to log completion
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    console.log(`[${req.id}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = requestTracker;