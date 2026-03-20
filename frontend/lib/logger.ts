/**
 * Simple logging utility for the application
 * Logs are only shown in development mode
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (message: string, data?: any) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, data || '')
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '')
  },
  warn: (message: string, data?: any) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data || '')
    }
  },
  info: (message: string, data?: any) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, data || '')
    }
  }
}
