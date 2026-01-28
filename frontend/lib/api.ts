import { BACKEND_URL } from './config'
import { getAuthToken } from './auth'

interface ApiOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
  requireAuth?: boolean
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, headers = {}, requireAuth = true } = options
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    },
    credentials: 'include'
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
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, config)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error ${response.status}: ${errorText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return await response.text()
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
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