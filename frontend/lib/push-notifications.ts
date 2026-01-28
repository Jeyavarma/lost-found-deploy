interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export class PushNotificationService {
  private static instance: PushNotificationService
  private registration: ServiceWorkerRegistration | null = null

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered')
      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  async showNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.registration) {
      await this.initialize()
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission()
      if (!granted) return false
    }

    try {
      await this.registration?.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        tag: options.tag,
        data: options.data,
        // actions: options.actions, // Not supported in all browsers
        requireInteraction: true,
        silent: false
      })
      return true
    } catch (error) {
      console.error('Failed to show notification:', error)
      return false
    }
  }

  async notifyItemMatch(matchedItem: any): Promise<boolean> {
    return this.showNotification({
      title: 'Potential Match Found!',
      body: `We found a potential match for your ${matchedItem.status} item: ${matchedItem.title}`,
      tag: `match-${matchedItem._id}`,
      data: { itemId: matchedItem._id, type: 'match' },
      actions: [
        { action: 'view', title: 'View Match' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  }

  async notifyNewMessage(sender: string, itemTitle: string): Promise<boolean> {
    return this.showNotification({
      title: 'New Message',
      body: `${sender} sent you a message about "${itemTitle}"`,
      tag: 'new-message',
      data: { type: 'message' },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View Chat' }
      ]
    })
  }

  async notifyItemClaimed(itemTitle: string): Promise<boolean> {
    return this.showNotification({
      title: 'Item Claimed',
      body: `Someone claimed your found item: ${itemTitle}`,
      tag: 'item-claimed',
      data: { type: 'claim' },
      actions: [
        { action: 'view', title: 'View Details' }
      ]
    })
  }
}

export const pushNotificationService = PushNotificationService.getInstance()