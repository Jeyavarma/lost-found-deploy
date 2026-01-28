export interface QueuedMessage {
  id: string
  roomId: string
  content: string
  type: 'text' | 'image' | 'file'
  timestamp: number
  status: 'pending' | 'sending' | 'sent' | 'failed'
  retryCount: number
  metadata?: {
    fileName?: string
    fileSize?: number
    mimeType?: string
  }
}

export class EnhancedMessageQueue {
  private static instance: EnhancedMessageQueue
  private messages: Map<string, QueuedMessage> = new Map()
  private storageKey = process.env.NEXT_PUBLIC_QUEUE_STORAGE_KEY || 'chat_message_queue'
  private maxRetries = parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3')
  private maxQueueSize = parseInt(process.env.NEXT_PUBLIC_MAX_QUEUE_SIZE || '100')
  private maxMessageAge = parseInt(process.env.NEXT_PUBLIC_MAX_MESSAGE_AGE || '86400000') // 24 hours

  static getInstance(): EnhancedMessageQueue {
    if (!EnhancedMessageQueue.instance) {
      EnhancedMessageQueue.instance = new EnhancedMessageQueue()
    }
    return EnhancedMessageQueue.instance
  }

  constructor() {
    this.loadFromStorage()
    this.startCleanupTimer()
  }

  // Add message to queue
  addMessage(
    roomId: string, 
    content: string, 
    type: 'text' | 'image' | 'file' = 'text',
    metadata?: any
  ): string {
    const id = this.generateMessageId()
    const message: QueuedMessage = {
      id,
      roomId,
      content,
      type,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      metadata
    }

    this.messages.set(id, message)
    this.saveToStorage()
    this.enforceQueueLimit()
    
    return id
  }

  // Update message status
  updateStatus(messageId: string, status: QueuedMessage['status']) {
    const message = this.messages.get(messageId)
    if (message) {
      message.status = status
      this.saveToStorage()
    }
  }

  // Mark message as sent
  markAsSent(messageId: string) {
    this.updateStatus(messageId, 'sent')
    // Remove sent messages after a delay to allow for UI updates
    setTimeout(() => {
      this.messages.delete(messageId)
      this.saveToStorage()
    }, 5000)
  }

  // Mark message as failed
  markAsFailed(messageId: string) {
    const message = this.messages.get(messageId)
    if (message) {
      message.status = 'failed'
      message.retryCount++
      
      // Remove if max retries exceeded
      if (message.retryCount >= this.maxRetries) {
        this.messages.delete(messageId)
      }
      
      this.saveToStorage()
    }
  }

  // Get all pending messages
  getAllPending(): QueuedMessage[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.status === 'pending' && msg.retryCount < this.maxRetries)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  // Get pending messages for specific room
  getPendingMessages(roomId: string): QueuedMessage[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.roomId === roomId && msg.status !== 'sent')
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  // Get failed messages
  getFailedMessages(): QueuedMessage[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.status === 'failed')
  }

  // Retry failed messages
  retryFailedMessages(): QueuedMessage[] {
    const failedMessages = this.getFailedMessages()
    failedMessages.forEach(msg => {
      if (msg.retryCount < this.maxRetries) {
        msg.status = 'pending'
        msg.retryCount++
      }
    })
    this.saveToStorage()
    return failedMessages.filter(msg => msg.status === 'pending')
  }

  // Clear messages for a room
  clearRoom(roomId: string) {
    const toDelete = Array.from(this.messages.entries())
      .filter(([_, msg]) => msg.roomId === roomId)
      .map(([id, _]) => id)
    
    toDelete.forEach(id => this.messages.delete(id))
    this.saveToStorage()
  }

  // Clear all messages
  clearAll() {
    this.messages.clear()
    this.saveToStorage()
  }

  // Get queue statistics
  getStats() {
    const messages = Array.from(this.messages.values())
    return {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      sending: messages.filter(m => m.status === 'sending').length,
      failed: messages.filter(m => m.status === 'failed').length,
      oldestMessage: messages.length > 0 ? Math.min(...messages.map(m => m.timestamp)) : null
    }
  }

  // Private methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.messages = new Map(Object.entries(data))
        this.cleanupOldMessages()
      }
    } catch (error) {
      console.error('Failed to load message queue from storage:', error)
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.messages)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save message queue to storage:', error)
      // If storage is full, clear old messages and try again
      this.cleanupOldMessages()
      try {
        const data = Object.fromEntries(this.messages)
        localStorage.setItem(this.storageKey, JSON.stringify(data))
      } catch (retryError) {
        console.error('Failed to save message queue after cleanup:', retryError)
      }
    }
  }

  private cleanupOldMessages() {
    const now = Date.now()
    const toDelete: string[] = []

    this.messages.forEach((message, id) => {
      // Remove old messages
      if (now - message.timestamp > this.maxMessageAge) {
        toDelete.push(id)
      }
      // Remove sent messages older than 1 hour
      else if (message.status === 'sent' && now - message.timestamp > 60 * 60 * 1000) {
        toDelete.push(id)
      }
      // Remove failed messages that exceeded retry count
      else if (message.status === 'failed' && message.retryCount >= this.maxRetries) {
        toDelete.push(id)
      }
    })

    toDelete.forEach(id => this.messages.delete(id))
  }

  private enforceQueueLimit() {
    if (this.messages.size > this.maxQueueSize) {
      // Remove oldest sent/failed messages first
      const sortedMessages = Array.from(this.messages.entries())
        .filter(([_, msg]) => msg.status === 'sent' || msg.status === 'failed')
        .sort(([_, a], [__, b]) => a.timestamp - b.timestamp)

      const toRemove = Math.min(sortedMessages.length, this.messages.size - this.maxQueueSize)
      for (let i = 0; i < toRemove; i++) {
        this.messages.delete(sortedMessages[i][0])
      }
    }
  }

  private startCleanupTimer() {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanupOldMessages()
      this.saveToStorage()
    }, 5 * 60 * 1000)
  }
}

export const enhancedMessageQueue = EnhancedMessageQueue.getInstance()