// Performance monitoring middleware
const performanceMonitor = () => {
  const metrics = {
    requests: 0,
    totalResponseTime: 0,
    slowRequests: 0,
    errors: 0
  };
  
  return (req, res, next) => {
    const startTime = Date.now();
    metrics.requests++;
    
    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      metrics.totalResponseTime += responseTime;
      
      // Track slow requests (>1000ms)
      if (responseTime > 1000) {
        metrics.slowRequests++;
        console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} (${responseTime}ms)`);
      }
      
      // Track errors
      if (res.statusCode >= 400) {
        metrics.errors++;
      }
      
      // Log performance every 100 requests
      if (metrics.requests % 100 === 0) {
        const avgResponseTime = Math.round(metrics.totalResponseTime / metrics.requests);
        const errorRate = Math.round((metrics.errors / metrics.requests) * 100);
        const slowRate = Math.round((metrics.slowRequests / metrics.requests) * 100);
        
        console.log(`📊 Performance: ${metrics.requests} requests, ${avgResponseTime}ms avg, ${errorRate}% errors, ${slowRate}% slow`);
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

module.exports = performanceMonitor;