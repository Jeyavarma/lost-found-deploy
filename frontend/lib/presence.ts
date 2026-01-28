'use client'

import { BACKEND_URL } from './config'
import { getAuthToken } from './auth'

class PresenceManager {
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isActive = true

  initialize() {
    if (typeof window === 'undefined') return

    // Start heartbeat
    this.startHeartbeat()

    // Track user activity
    this.trackActivity()

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setOffline()
      } else {
        this.setOnline()
        this.startHeartbeat()
      }
    })

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.setOffline()
    })
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isActive) {
        this.sendHeartbeat()
      }
    }, 60000) // Every minute
  }

  private async sendHeartbeat() {
    try {
      const token = getAuthToken()
      if (!token) return

      const deviceType = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop'

      await fetch(`${BACKEND_URL}/api/presence/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceType })
      })
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }

  private async setOffline() {
    try {
      const token = getAuthToken()
      if (!token) return

      await fetch(`${BACKEND_URL}/api/presence/offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Set offline failed:', error)
    }
  }

  private setOnline() {
    this.isActive = true
    this.sendHeartbeat()
  }

  private trackActivity() {
    let activityTimer: NodeJS.Timeout

    const resetTimer = () => {
      this.isActive = true
      clearTimeout(activityTimer)
      
      // Set as away after 5 minutes of inactivity
      activityTimer = setTimeout(() => {
        this.isActive = false
      }, 5 * 60 * 1000)
    }

    // Track mouse and keyboard activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer, true)
    })

    resetTimer()
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.setOffline()
  }
}

export const presenceManager = new PresenceManager()