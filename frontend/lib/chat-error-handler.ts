export interface ChatError {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
  recoverable: boolean
  userMessage: string
  action?: () => void
}

export class ChatErrorHandler {
  private static instance: ChatErrorHandler
  private errorCallbacks: ((error: ChatError) => void)[] = []

  static getInstance(): ChatErrorHandler {
    if (!ChatErrorHandler.instance) {
      ChatErrorHandler.instance = new ChatErrorHandler()
    }
    return ChatErrorHandler.instance
  }

  // Register error callback
  onError(callback: (error: ChatError) => void) {
    this.errorCallbacks.push(callback)
  }

  // Remove error callback
  offError(callback: (error: ChatError) => void) {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback)
  }

  // Handle different types of errors
  handleError(error: any, context?: string): ChatError {
    const chatError = this.categorizeError(error, context)
    
    // Notify all listeners
    this.errorCallbacks.forEach(callback => {
      try {
        callback(chatError)
      } catch (err) {
        console.error('Error in error callback:', err)
      }
    })

    return chatError
  }

  private categorizeError(error: any, context?: string): ChatError {
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network connection failed',
        severity: 'high',
        recoverable: true,
        userMessage: 'Connection lost. Trying to reconnect...',
        action: () => window.location.reload()
      }
    }

    // Authentication errors
    if (error.code === 'UNAUTHORIZED' || error.status === 401) {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        severity: 'high',
        recoverable: true,
        userMessage: 'Please login again to continue chatting',
        action: () => window.location.href = '/login'
      }
    }

    // Socket connection errors
    if (error.type === 'TransportError' || context === 'socket') {
      return {
        code: 'SOCKET_ERROR',
        message: error.message || 'Socket connection failed',
        severity: 'medium',
        recoverable: true,
        userMessage: 'Chat temporarily unavailable. Retrying...'
      }
    }

    // Message send errors
    if (context === 'message_send') {
      return {
        code: 'MESSAGE_SEND_ERROR',
        message: error.message || 'Failed to send message',
        severity: 'low',
        recoverable: true,
        userMessage: 'Message failed to send. It will be retried when connection is restored.'
      }
    }

    // Token expiration
    if (error.message?.includes('token') || error.message?.includes('expired')) {
      return {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token expired',
        severity: 'medium',
        recoverable: true,
        userMessage: 'Session expired. Please refresh the page.',
        action: () => window.location.reload()
      }
    }

    // Server errors
    if (error.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: error.message || 'Server error',
        severity: 'high',
        recoverable: true,
        userMessage: 'Server temporarily unavailable. Please try again later.'
      }
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      severity: 'medium',
      recoverable: false,
      userMessage: 'Something went wrong. Please refresh the page if the problem persists.',
      action: () => window.location.reload()
    }
  }

  // Create user-friendly error messages
  getErrorMessage(error: any): string {
    const chatError = this.categorizeError(error)
    return chatError.userMessage
  }

  // Check if error is recoverable
  isRecoverable(error: any): boolean {
    const chatError = this.categorizeError(error)
    return chatError.recoverable
  }
}

export const chatErrorHandler = ChatErrorHandler.getInstance()