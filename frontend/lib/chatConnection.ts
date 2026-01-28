// Chat connection health checker for production
export class ChatConnectionHealth {
  private static instance: ChatConnectionHealth;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

  static getInstance(): ChatConnectionHealth {
    if (!ChatConnectionHealth.instance) {
      ChatConnectionHealth.instance = new ChatConnectionHealth();
    }
    return ChatConnectionHealth.instance;
  }

  startHealthCheck(socket: any) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (socket && socket.connected) {
        this.lastPingTime = Date.now();
        socket.emit('ping', this.lastPingTime);
        this.connectionStatus = 'connected';
      } else {
        this.connectionStatus = 'disconnected';
        console.warn('Chat connection lost, attempting reconnect...');
      }
    }, 30000); // Check every 30 seconds
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      lastPing: this.lastPingTime,
      isHealthy: this.connectionStatus === 'connected' && 
                 (Date.now() - this.lastPingTime) < 60000 // Within last minute
    };
  }
}

export const chatHealth = ChatConnectionHealth.getInstance();