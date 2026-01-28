// Real-time updates manager
class RealTimeManager {
  private eventSource: EventSource | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  // Initialize real-time connection
  initialize(baseUrl: string) {
    if (typeof window === 'undefined') return

    try {
      this.eventSource = new EventSource(`${baseUrl}/api/events`)
      
      this.eventSource.onopen = () => {
        console.log('Real-time connection established')
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(data.type, data.payload)
        } catch (error) {
          console.error('Failed to parse real-time message:', error)
        }
      }

      this.eventSource.onerror = () => {
        console.error('Real-time connection error')
        this.handleReconnect()
      }
    } catch (error) {
      console.error('Failed to initialize real-time connection:', error)
    }
  }

  // Handle reconnection
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.eventSource?.close()
        // Re-initialize would go here
      }, 1000 * this.reconnectAttempts)
    }
  }

  // Subscribe to events
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  // Emit events
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in event callback:', error)
        }
      })
    }
  }

  // Manual refresh trigger
  triggerRefresh(type: 'items' | 'activity' | 'chats') {
    this.emit(`refresh_${type}`, { timestamp: Date.now() })
  }

  // Cleanup
  cleanup() {
    this.eventSource?.close()
    this.listeners.clear()
  }
}

export const realTimeManager = new RealTimeManager()

// Polling fallback for real-time updates
export class PollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  startPolling(key: string, callback: Function, interval = 30000) {
    this.stopPolling(key)
    
    const intervalId = setInterval(async () => {
      try {
        await callback()
      } catch (error) {
        console.error(`Polling error for ${key}:`, error)
      }
    }, interval)
    
    this.intervals.set(key, intervalId)
  }

  stopPolling(key: string) {
    const intervalId = this.intervals.get(key)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(key)
    }
  }

  cleanup() {
    this.intervals.forEach(intervalId => clearInterval(intervalId))
    this.intervals.clear()
  }
}

export const pollingManager = new PollingManager()