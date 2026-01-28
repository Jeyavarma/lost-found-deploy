"use client"

import { create } from 'zustand'

interface Notification {
  id: string
  type: 'match' | 'claim' | 'message' | 'system'
  title: string
  message: string
  itemId?: string
  itemTitle?: string
  matchScore?: number
  read: boolean
  createdAt: Date
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotifications = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date()
    }

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }))
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find(n => n.id === id)
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  }
}))

// Helper functions to create specific notifications
export const notificationHelpers = {
  matchFound: (itemTitle: string, matchScore: number, itemId: string) => {
    useNotifications.getState().addNotification({
      type: 'match',
      title: '🔥 Match Found!',
      message: `${matchScore}% match found for "${itemTitle}"`,
      itemId,
      itemTitle,
      matchScore
    })
  },

  itemClaimed: (itemTitle: string, itemId: string) => {
    useNotifications.getState().addNotification({
      type: 'claim',
      title: '📦 Item Claimed',
      message: `Someone claimed your found item: "${itemTitle}"`,
      itemId,
      itemTitle
    })
  },

  newMessage: (senderName: string, itemTitle: string, itemId: string) => {
    useNotifications.getState().addNotification({
      type: 'message',
      title: '💬 New Message',
      message: `${senderName} sent you a message about "${itemTitle}"`,
      itemId,
      itemTitle
    })
  },

  systemAlert: (title: string, message: string) => {
    useNotifications.getState().addNotification({
      type: 'system',
      title,
      message
    })
  }
}

// Chat notification manager for compatibility
class NotificationManager {
  initialize() {
    // Request notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }
  
  showChatNotification(senderName: string, content: string, roomId: string, itemTitle: string) {
    // Add to notification store
    notificationHelpers.newMessage(senderName, itemTitle, roomId);
    
    // Show browser notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`${senderName} - ${itemTitle}`, {
        body: content,
        icon: '/favicon.ico',
        tag: roomId
      });
    }
  }
}

export const notificationManager = new NotificationManager();