class NotificationManager {
  private permission: NotificationPermission = 'default';
  private isSupported = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  isEnabled(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  showChatNotification(
    senderName: string, 
    message: string, 
    roomId: string, 
    itemTitle: string
  ): Notification | null {
    if (!this.isEnabled() || document.visibilityState === 'visible') {
      return null;
    }

    const notification = new Notification(`${senderName} - ${itemTitle}`, {
      body: message,
      icon: '/favicon.ico',
      tag: `chat-${roomId}`,
      requireInteraction: false,
      silent: false,
      data: { roomId, type: 'chat' }
    });

    notification.onclick = () => {
      window.focus();
      // Dispatch custom event to open chat
      window.dispatchEvent(new CustomEvent('openChat', { 
        detail: { roomId } 
      }));
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }

  showItemNotification(
    title: string, 
    message: string, 
    itemId: string, 
    type: 'match' | 'claim' | 'update'
  ): Notification | null {
    if (!this.isEnabled()) {
      return null;
    }

    const icons = {
      match: '🔍',
      claim: '✋',
      update: '📢'
    };

    const notification = new Notification(`${icons[type]} ${title}`, {
      body: message,
      icon: '/favicon.ico',
      tag: `item-${itemId}-${type}`,
      requireInteraction: type === 'claim',
      data: { itemId, type }
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = `/browse?item=${itemId}`;
      notification.close();
    };

    if (type !== 'claim') {
      setTimeout(() => notification.close(), 8000);
    }

    return notification;
  }

  showSystemNotification(
    title: string, 
    message: string, 
    action?: { label: string; url: string }
  ): Notification | null {
    if (!this.isEnabled()) {
      return null;
    }

    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      tag: 'system',
      requireInteraction: !!action,
      data: { type: 'system', action }
    });

    if (action) {
      notification.onclick = () => {
        window.focus();
        window.location.href = action.url;
        notification.close();
      };
    } else {
      setTimeout(() => notification.close(), 6000);
    }

    return notification;
  }

  // Clear all notifications with specific tag
  clearNotifications(tag: string) {
    // Note: There's no direct way to clear notifications by tag
    // This is a limitation of the Notifications API
    console.log(`Clearing notifications with tag: ${tag}`);
  }

  // Get permission status
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // Check if notifications are supported
  isNotificationSupported(): boolean {
    return this.isSupported;
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;