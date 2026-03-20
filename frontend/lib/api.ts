import { BACKEND_URL } from './config'
import { getAuthToken } from './auth'
import { logger } from './logger'

interface ApiOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
  requireAuth?: boolean
  retries?: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, headers = {}, requireAuth = true, retries = 0 } = options

  const config: RequestInit = {
    method,
    headers: {
      'Accept': 'application/json',
      ...headers
    },
    credentials: 'include'
  }

  // Set JSON content type only if body is not FormData
  if (!(body instanceof FormData)) {
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/json'
    }
  }

  if (requireAuth) {
    const token = getAuthToken()
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      }
    }
  }

  if (body && method !== 'GET') {
    // Stringify JSON bodies, pass FormData raw
    config.body = body instanceof FormData ? body : JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        // Handle expired/invalid token by clearing auth and redirecting to login
        localStorage.removeItem('mcc_auth_token');
        localStorage.removeItem('mcc_user_data');
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        window.location.href = '/login?session=expired';
      }
      const errorText = await response.text()
      throw new Error(`API Error ${response.status}: ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    return await response.text()
  } catch (error) {
    // Retry logic for network errors
    if (retries < MAX_RETRIES && method === 'GET') {
      logger.warn(`API call failed, retrying... (${retries + 1}/${MAX_RETRIES})`)
      await delay(RETRY_DELAY * (retries + 1))
      return apiCall(endpoint, { ...options, retries: retries + 1 })
    }
    
    logger.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

export const api = {
  get: (endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall(endpoint, { ...options, method: 'POST', body }),

  put: (endpoint: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall(endpoint, { ...options, method: 'PUT', body }),

  delete: (endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall(endpoint, { ...options, method: 'DELETE' })
}