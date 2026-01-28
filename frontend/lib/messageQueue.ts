interface QueuedMessage {
  id: string
  roomId: string
  content: string
  type: 'text' | 'image'
  timestamp: number
  status: 'pending' | 'sending' | 'sent' | 'failed'
  retryCount: number
}

class MessageQueue {
  private queue: QueuedMessage[] = []
  private readonly STORAGE_KEY = 'chat_message_queue'
  private readonly MAX_RETRIES = 3
  private initialized = false

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
      this.initialized = true
    }
  }

  private ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      this.loadFromStorage()
      this.initialized = true
    }
  }

  // Add message to queue
  addMessage(roomId: string, content: string, type: 'text' | 'image' = 'text'): string {
    this.ensureInitialized()
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      roomId,
      content,
      type,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    }

    this.queue.push(queuedMessage)
    this.saveToStorage()
    return messageId
  }

  // Get pending messages for a room
  getPendingMessages(roomId: string): QueuedMessage[] {
    this.ensureInitialized()
    return this.queue.filter(msg => 
      msg.roomId === roomId && 
      (msg.status === 'pending' || msg.status === 'sending')
    )
  }

  // Get all pending messages
  getAllPending(): QueuedMessage[] {
    this.ensureInitialized()
    return this.queue.filter(msg => 
      msg.status === 'pending' || msg.status === 'sending'
    )
  }

  // Update message status
  updateStatus(messageId: string, status: QueuedMessage['status']) {
    this.ensureInitialized()
    const message = this.queue.find(msg => msg.id === messageId)
    if (message) {
      message.status = status
      this.saveToStorage()
    }
  }

  // Mark message as sent and remove from queue
  markAsSent(messageId: string) {
    this.ensureInitialized()
    this.queue = this.queue.filter(msg => msg.id !== messageId)
    this.saveToStorage()
  }

  // Mark message as failed and increment retry count
  markAsFailed(messageId: string) {
    this.ensureInitialized()
    const message = this.queue.find(msg => msg.id === messageId)
    if (message) {
      message.retryCount++
      message.status = message.retryCount >= this.MAX_RETRIES ? 'failed' : 'pending'
      this.saveToStorage()
    }
  }

  // Remove failed messages older than 24 hours
  cleanup() {
    this.ensureInitialized()
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    this.queue = this.queue.filter(msg => 
      !(msg.status === 'failed' && msg.timestamp < oneDayAgo)
    )
    this.saveToStorage()
  }

  // Clear all messages for a room
  clearRoom(roomId: string) {
    this.ensureInitialized()
    this.queue = this.queue.filter(msg => msg.roomId !== roomId)
    this.saveToStorage()
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save message queue:', error)
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        this.cleanup() // Clean up old messages on load
      }
    } catch (error) {
      console.error('Failed to load message queue:', error)
      this.queue = []
    }
  }
}

export const messageQueue = new MessageQueue()
export type { QueuedMessage }