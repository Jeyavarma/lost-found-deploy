import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './auth';
import { BACKEND_URL } from './config';

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  lastConnected?: number;
  retryCount: number;
  error?: string;
}

interface QueuedMessage {
  id: string;
  roomId: string;
  content: string;
  type: 'text' | 'image';
  timestamp: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
}

class EnhancedSocketManager {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = { status: 'disconnected', retryCount: 0 };
  private messageQueue: QueuedMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private reconnectTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private maxRetries = 5;
  private baseDelay = 1000;

  // Connection management
  connect(): Promise<Socket | null> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      const token = getAuthToken();
      if (!token) {
        this.updateConnectionState({ status: 'error', error: 'No authentication token' });
        resolve(null);
        return;
      }

      this.updateConnectionState({ status: 'connecting' });

      try {
        this.socket = io(BACKEND_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true,
          withCredentials: true,
          autoConnect: true,
          reconnection: false // We handle reconnection manually
        });

        this.setupEventListeners();
        resolve(this.socket);
      } catch (error) {
        this.updateConnectionState({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Connection failed' 
        });
        resolve(null);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateConnectionState({ 
        status: 'connected', 
        lastConnected: Date.now(),
        retryCount: 0,
        error: undefined
      });
      this.processMessageQueue();
      this.startHealthCheck();
      this.emit('connection_restored');
    });

    this.socket.on('disconnect', (reason) => {
      this.updateConnectionState({ status: 'disconnected' });
      this.stopHealthCheck();
      this.emit('connection_lost', reason);
      
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.updateConnectionState({ 
        status: 'error', 
        error: error.message,
        retryCount: this.connectionState.retryCount + 1
      });
      this.emit('connection_error', error);
      this.scheduleReconnect();
    });

    this.socket.on('pong', () => {
      // Connection is healthy
    });
  }

  private scheduleReconnect() {
    if (this.connectionState.retryCount >= this.maxRetries) {
      this.updateConnectionState({ status: 'error', error: 'Max retries exceeded' });
      return;
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(this.baseDelay * Math.pow(2, this.connectionState.retryCount), 30000);
    
    this.updateConnectionState({ status: 'reconnecting' });
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    
    this.healthCheckTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  // Message handling with offline support
  sendMessage(roomId: string, content: string, type: 'text' | 'image' = 'text'): string {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      roomId,
      content,
      type,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    this.messageQueue.push(queuedMessage);
    
    if (this.isConnected()) {
      this.sendQueuedMessage(queuedMessage);
    }

    return messageId;
  }

  private async sendQueuedMessage(message: QueuedMessage) {
    if (!this.socket?.connected) return;

    message.status = 'sending';
    
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Send timeout')), 10000);
        
        this.socket!.emit('send_message', {
          messageId: message.id,
          roomId: message.roomId,
          content: message.content,
          type: message.type
        }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            message.status = 'sent';
            resolve();
          } else {
            reject(new Error(response.error || 'Send failed'));
          }
        });
      });
    } catch (error) {
      message.status = 'failed';
      message.retryCount++;
      
      if (message.retryCount < 3) {
        setTimeout(() => this.sendQueuedMessage(message), 5000);
      }
    }
  }

  private processMessageQueue() {
    const pendingMessages = this.messageQueue.filter(m => m.status === 'pending' || m.status === 'failed');
    
    pendingMessages.forEach(message => {
      if (message.retryCount < 3) {
        this.sendQueuedMessage(message);
      }
    });
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Also listen on socket if connected
    if (this.socket && !['connection_restored', 'connection_lost', 'connection_error'].includes(event)) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(...args));
  }

  // State management
  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.emit('connection_state_changed', this.connectionState);
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getPendingMessages(roomId?: string): QueuedMessage[] {
    return this.messageQueue.filter(m => 
      (m.status === 'pending' || m.status === 'failed') &&
      (!roomId || m.roomId === roomId)
    );
  }

  // Cleanup
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionState({ status: 'disconnected' });
  }

  // Utility methods
  joinRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', roomId);
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomId);
    }
  }

  markMessagesRead(messageIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { messageIds });
    }
  }
}

export const enhancedSocketManager = new EnhancedSocketManager();
export type { ConnectionState, QueuedMessage };