// Centralized logging service
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }
  
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }
  
  formatMessage(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...meta,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const logEntry = this.formatMessage('error', message, meta);
      console.error(JSON.stringify(logEntry));
      
      // In production, send to external logging service
      if (process.env.NODE_ENV === 'production') {
        this.sendToExternalService('error', logEntry);
      }
    }
  }
  
  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatMessage('warn', message, meta);
      console.warn(JSON.stringify(logEntry));
    }
  }
  
  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const logEntry = this.formatMessage('info', message, meta);
      console.log(JSON.stringify(logEntry));
    }
  }
  
  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatMessage('debug', message, meta);
      console.log(JSON.stringify(logEntry));
    }
  }
  
  // Placeholder for external logging service integration
  sendToExternalService(level, logEntry) {
    // TODO: Integrate with services like:
    // - AWS CloudWatch
    // - Datadog
    // - New Relic
    // - Sentry
  }
}

const logger = new Logger();
module.exports = logger;