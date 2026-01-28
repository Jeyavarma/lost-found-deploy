const UserActivity = require('../models/UserActivity');

// Audit logging middleware
const auditLogger = (action, resourceType = 'unknown') => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the activity after response
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400) {
            await UserActivity.create({
              userId: req.user.id || req.user._id,
              action,
              resourceType,
              resourceId: req.params.id || req.params.itemId || null,
              details: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                statusCode: res.statusCode,
                timestamp: new Date()
              }
            });
          }
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Security event logger for suspicious activities
const securityLogger = async (event, details, req) => {
  try {
    const securityEvent = {
      event,
      details,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date(),
      severity: details.severity || 'medium'
    };
    
    console.warn('Security Event:', JSON.stringify(securityEvent, null, 2));
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to security monitoring service
    }
  } catch (error) {
    console.error('Security logging failed:', error);
  }
};

module.exports = { auditLogger, securityLogger };