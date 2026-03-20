/**
 * Backend logging utility
 * Provides consistent logging with timestamps and levels
 */

const isDev = process.env.NODE_ENV === 'development'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
}

const getTimestamp = () => new Date().toISOString()

const logger = {
  log: (message, data) => {
    console.log(`${colors.blue}[${getTimestamp()}] [LOG]${colors.reset} ${message}`, data || '')
  },

  error: (message, error) => {
    console.error(`${colors.red}[${getTimestamp()}] [ERROR]${colors.reset} ${message}`, error || '')
  },

  warn: (message, data) => {
    console.warn(`${colors.yellow}[${getTimestamp()}] [WARN]${colors.reset} ${message}`, data || '')
  },

  info: (message, data) => {
    console.info(`${colors.green}[${getTimestamp()}] [INFO]${colors.reset} ${message}`, data || '')
  },

  debug: (message, data) => {
    if (isDev) {
      console.log(`${colors.gray}[${getTimestamp()}] [DEBUG]${colors.reset} ${message}`, data || '')
    }
  }
}

module.exports = logger
