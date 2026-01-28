// Memory monitoring and leak prevention
const memoryMonitor = () => {
  let requestCount = 0;
  
  return (req, res, next) => {
    requestCount++;
    
    // Monitor memory every 100 requests
    if (requestCount % 100 === 0) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      console.log(`Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${requestCount} requests)`);
      
      // Warning if memory usage is high
      if (heapUsedMB > 512) {
        console.warn('⚠️  High memory usage detected');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🗑️  Garbage collection triggered');
        }
      }
    }
    
    // Clean up response listeners to prevent leaks
    const originalEnd = res.end;
    res.end = function(...args) {
      res.removeAllListeners();
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

module.exports = memoryMonitor;