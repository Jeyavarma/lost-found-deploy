import { useState, useEffect } from 'react'

// Offline support and caching
class OfflineManager {
  private cache: Map<string, any> = new Map()
  private isOnline = true
  private callbacks: Set<Function> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.setupEventListeners()
      this.loadFromStorage()
    }
  }

  // Setup online/offline event listeners
  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyStatusChange()
      this.syncPendingData()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyStatusChange()
    })
  }

  // Load cached data from localStorage
  private loadFromStorage() {
    try {
      const cached = localStorage.getItem('offline_cache')
      if (cached) {
        const data = JSON.parse(cached)
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value)
        })
      }
    } catch (error) {
      console.error('Failed to load offline cache:', error)
    }
  }

  // Save cache to localStorage
  private saveToStorage() {
    try {
      const data: { [key: string]: any } = {}
      this.cache.forEach((value, key) => {
        data[key] = value
      })
      localStorage.setItem('offline_cache', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save offline cache:', error)
    }
  }

  // Cache data
  cacheData(key: string, data: any, ttl = 3600000) { // 1 hour default TTL
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    }
    this.cache.set(key, cacheEntry)
    this.saveToStorage()
  }

  // Get cached data
  getCachedData(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.saveToStorage()
      return null
    }

    return entry.data
  }

  // Enhanced fetch with offline support
  async fetchWithCache(url: string, options: RequestInit = {}, cacheKey?: string) {
    const key = cacheKey || url

    // If offline, return cached data
    if (!this.isOnline) {
      const cached = this.getCachedData(key)
      if (cached) {
        return { data: cached, fromCache: true }
      }
      throw new Error('No internet connection and no cached data available')
    }

    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Cache successful responses
      if (options.method === 'GET' || !options.method) {
        this.cacheData(key, data)
      }

      return { data, fromCache: false }
    } catch (error) {
      // If fetch fails, try to return cached data
      const cached = this.getCachedData(key)
      if (cached) {
        console.warn('Using cached data due to network error:', error)
        return { data: cached, fromCache: true }
      }
      throw error
    }
  }

  // Queue data for sync when online
  queueForSync(key: string, data: any) {
    const syncQueue = this.getCachedData('sync_queue') || []
    syncQueue.push({ key, data, timestamp: Date.now() })
    this.cacheData('sync_queue', syncQueue, 86400000) // 24 hours
  }

  // Sync pending data when back online
  private async syncPendingData() {
    const syncQueue = this.getCachedData('sync_queue') || []
    if (syncQueue.length === 0) return

    console.log(`Syncing ${syncQueue.length} pending items...`)

    for (const item of syncQueue) {
      try {
        // Implement sync logic based on your API
        await this.syncItem(item)
      } catch (error) {
        console.error('Failed to sync item:', error)
      }
    }

    // Clear sync queue
    this.cache.delete('sync_queue')
    this.saveToStorage()
  }

  // Sync individual item (implement based on your API)
  private async syncItem(item: any) {
    // This would be implemented based on your specific sync requirements
    console.log('Syncing item:', item)
  }

  // Subscribe to online/offline status changes
  onStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  // Notify status change
  private notifyStatusChange() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.isOnline)
      } catch (error) {
        console.error('Status change callback error:', error)
      }
    })
  }

  // Get current status
  getStatus() {
    return {
      isOnline: this.isOnline,
      cacheSize: this.cache.size,
      hasPendingSync: (this.getCachedData('sync_queue') || []).length > 0
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    localStorage.removeItem('offline_cache')
  }
}

export const offlineManager = new OfflineManager()

// React hook for offline support
export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(offlineManager.getStatus().isOnline)

  useEffect(() => {
    const unsubscribe = offlineManager.onStatusChange(setIsOnline)
    return unsubscribe
  }, [])

  return {
    isOnline,
    fetchWithCache: offlineManager.fetchWithCache.bind(offlineManager),
    cacheData: offlineManager.cacheData.bind(offlineManager),
    getCachedData: offlineManager.getCachedData.bind(offlineManager),
    status: offlineManager.getStatus()
  }
}