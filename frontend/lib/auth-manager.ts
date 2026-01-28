import { getAuthToken, removeAuthToken, setAuthToken, setUserData } from './auth'

class AuthManager {
  private refreshTimer: NodeJS.Timeout | null = null

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }

  // Handle token expiration
  handleTokenExpiration() {
    removeAuthToken()
    window.location.href = '/login?expired=true'
  }

  // Setup automatic token validation
  setupTokenValidation() {
    const token = getAuthToken()
    if (!token) return

    // Check token every 5 minutes
    this.refreshTimer = setInterval(() => {
      const currentToken = getAuthToken()
      if (!currentToken || this.isTokenExpired(currentToken)) {
        this.handleTokenExpiration()
      }
    }, 5 * 60 * 1000)
  }

  // Cleanup
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  // Enhanced fetch with token handling
  async authenticatedFetch(url: string, options: RequestInit = {}) {
    const token = getAuthToken()
    if (!token) {
      throw new Error('No authentication token')
    }

    if (this.isTokenExpired(token)) {
      this.handleTokenExpiration()
      throw new Error('Token expired')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 401) {
      this.handleTokenExpiration()
      throw new Error('Authentication failed')
    }

    return response
  }
}

export const authManager = new AuthManager()
export default authManager