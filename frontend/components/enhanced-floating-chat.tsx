'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, AlertCircle, Wifi, WifiOff, Bell, BellOff, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { isAuthenticated, getUserData, getAuthToken } from '@/lib/auth'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import UserSearchModal from '@/components/user-search-modal'
import { socketManager } from '@/lib/socket'
import { BACKEND_URL } from '@/lib/config'

interface ChatRoom {
  _id: string
  itemId: {
    _id: string
    title: string
    category: string
    imageUrl?: string
    status: string
  }
  participants: Array<{
    userId: {
      _id: string
      name: string
      email: string
      role: string
    }
    role: string
  }>
  lastMessage?: {
    content: string
    timestamp: string
    senderId: string
  }
  unreadCount?: number
  updatedAt: string
}

interface ConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  lastConnected?: number
  retryCount: number
}

export default function EnhancedFloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [hasChats, setHasChats] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const healthCheckRef = useRef<NodeJS.Timeout>()

  // Check authentication and initialize
  useEffect(() => {
    const auth = isAuthenticated()
    setAuthenticated(auth)
    
    if (auth) {
      const userData = getUserData()
      setCurrentUserId(userData?.id || '')
      initializeChat()
    } else {
      setIsGuest(true)
    }

    // Listen for item-based chat events
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<{ room: ChatRoom }>;
      const { room } = customEvent.detail;
      if (room) {
        setSelectedRoom(room);
        setIsOpen(true);
        loadChatRooms(); // Refresh chat list
      }
    };
    
    window.addEventListener('openChat', handleOpenChat);

    // Check auth status periodically
    const authCheckInterval = setInterval(() => {
      const currentAuth = isAuthenticated()
      if (currentAuth !== authenticated) {
        if (!currentAuth) {
          // User logged out, disconnect chat
          socketManager.disconnect()
          setAuthenticated(false)
          setIsGuest(true)
          setIsOpen(false)
        } else {
          // User logged in, reconnect
          setAuthenticated(true)
          setIsGuest(false)
          initializeChat()
        }
      }
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('openChat', handleOpenChat);
      clearInterval(authCheckInterval)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (healthCheckRef.current) clearTimeout(healthCheckRef.current)
      // Cleanup socket connection
      socketManager.disconnect()
    }
  }, [])

  // Initialize chat system
  const initializeChat = useCallback(async () => {
    try {
      setError(null)
      // Check if token is still valid before connecting
      if (!isAuthenticated()) {
        setAuthenticated(false)
        setIsGuest(true)
        return
      }
      await connectToChat()
      await loadChatRooms()
      startHealthCheck()
    } catch (err) {
      setError('Failed to initialize chat system')
      console.error('Chat initialization error:', err)
    }
  }, [])

  // Connect to chat with retry logic
  const connectToChat = useCallback(async () => {
    try {
      setConnectionState(prev => ({ ...prev, status: 'reconnecting' }))
      
      const socket = socketManager.connect()
      if (!socket) {
        throw new Error('Failed to create socket connection')
      }

      // Listen for connection events
      socket.on('connect', () => {
        console.log('Enhanced chat connected')
        setConnectionState({
          status: 'connected',
          lastConnected: Date.now(),
          retryCount: 0
        })
        setError(null)
      })

      socket.on('disconnect', (reason) => {
        console.log('Enhanced chat disconnected:', reason)
        setConnectionState(prev => ({ ...prev, status: 'disconnected' }))
        if (reason !== 'io client disconnect') {
          scheduleReconnect()
        }
      })

      socket.on('connect_error', (error) => {
        console.error('Enhanced chat connection error:', error)
        setConnectionState(prev => ({ 
          ...prev, 
          status: 'error',
          retryCount: prev.retryCount + 1
        }))
        setError(`Connection failed: ${error.message}`)
        scheduleReconnect()
      })

      // Listen for new messages
      socket.on('new_message', (message) => {
        if (message.senderId !== currentUserId) {
          setTotalUnread(prev => prev + 1)
          showNotification(message)
        }
      })

    } catch (err) {
      setConnectionState(prev => ({ 
        ...prev, 
        status: 'error',
        retryCount: prev.retryCount + 1
      }))
      setError('Connection failed')
      scheduleReconnect()
    }
  }, [currentUserId])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    
    const delay = Math.min(1000 * Math.pow(2, connectionState.retryCount), 30000)
    retryTimeoutRef.current = setTimeout(() => {
      if (connectionState.retryCount < 5) {
        connectToChat()
      }
    }, delay)
  }, [connectionState.retryCount, connectToChat])

  // Health check for connection
  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) clearTimeout(healthCheckRef.current)
    
    healthCheckRef.current = setInterval(() => {
      const socket = socketManager.getSocket()
      if (socket?.connected) {
        socket.emit('ping')
      } else {
        setConnectionState(prev => ({ ...prev, status: 'disconnected' }))
      }
    }, 30000)
  }, [])

  // Load chat rooms and count unread
  const loadChatRooms = useCallback(async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure data is always an array with proper validation
        let rooms: ChatRoom[] = []
        if (Array.isArray(data)) {
          rooms = data.filter((room: any) => room && room._id)
        } else if (data && typeof data === 'object' && Array.isArray(data.rooms)) {
          rooms = data.rooms.filter((room: any) => room && room._id)
        } else {
          console.warn('Invalid chat rooms data format:', data)
          rooms = []
        }
        
        setHasChats(rooms.length > 0)
        
        const unreadCount = rooms.reduce((total, room) => 
          total + (room.unreadCount || 0), 0
        )
        setTotalUnread(unreadCount)
      } else {
        console.warn('Failed to fetch chat rooms:', response.status)
        setHasChats(false)
        setTotalUnread(0)
      }
    } catch (err) {
      console.error('Failed to load chat rooms:', err)
      setHasChats(false)
      setTotalUnread(0)
    }
  }, [])

  // Show browser notification with better error handling
  const showNotification = useCallback((message: any) => {
    if (!notificationsEnabled || !('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification('New Message', {
          body: message.content.substring(0, 100), // Limit length
          icon: '/favicon.ico',
          tag: 'chat-message',
          requireInteraction: false,
          silent: false
        })
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000)
        
        // Handle click to focus chat
        notification.onclick = () => {
          window.focus()
          setIsOpen(true)
          notification.close()
        }
      } catch (error) {
        console.error('Failed to show notification:', error)
      }
    }
  }, [notificationsEnabled])

  // Request notification permission with better UX
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return
    }
    
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true)
      return
    }
    
    if (Notification.permission === 'denied') {
      setNotificationsEnabled(false)
      return
    }
    
    try {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
      if (permission === 'denied') {
        console.log('Notification permission denied')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      setNotificationsEnabled(false)
    }
  }, [])

  // Handle room selection
  const handleSelectRoom = useCallback((room: ChatRoom) => {
    setSelectedRoom(room)
    // Mark room as read
    setTotalUnread(prev => Math.max(0, prev - (room.unreadCount || 0)))
  }, [])

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  // Handle new chat with user
  const handleStartNewChat = useCallback(async (user: { _id: string; name: string; email: string }) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otherUserId: user._id })
      })
      
      if (response.ok) {
        const room: ChatRoom = await response.json()
        setSelectedRoom(room)
        loadChatRooms() // Refresh chat list
      } else {
        setError('Failed to start chat')
      }
    } catch (err) {
      setError('Failed to start chat')
      console.error('Start chat error:', err)
    }
  }, [])

  // Handle chat start for guests
  const handleGuestChat = useCallback(() => {
    setError('Please login to start chatting')
    setTimeout(() => setError(null), 3000)
  }, [])

  // Responsive sizing with mobile-first approach
  const getChatDimensions = () => {
    if (isMaximized) {
      return 'w-full h-full sm:w-96 sm:h-[600px] md:w-[500px] md:h-[700px] fixed sm:relative inset-0 sm:inset-auto'
    }
    if (isMinimized) {
      return 'w-72 sm:w-80 h-12'
    }
    return 'w-full h-[400px] sm:w-80 sm:h-96 md:w-96 md:h-[500px] max-w-sm sm:max-w-none'
  }

  // Don't render if no chats and not authenticated (unless error)
  if (!authenticated && !isGuest && !hasChats && !error) {
    return null
  }

  return (
    <TooltipProvider>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => {
                if (isGuest) {
                  handleGuestChat()
                } else {
                  setIsOpen(true)
                  requestNotificationPermission()
                }
              }}
              className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl z-50 p-0 transition-all duration-300 border-2 border-white touch-manipulation text-white`}
              style={{ 
                backgroundColor: connectionState.status === 'connected' ? '#2563eb' : '#4b5563',
                opacity: 1
              }}
              aria-label="Open chat"
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                {totalUnread > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                    aria-label={`${totalUnread} unread messages`}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
                {connectionState.status === 'disconnected' && (
                  <WifiOff className="absolute -bottom-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" />
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>
              {isGuest ? 'Login to chat' : 
               connectionState.status === 'connected' ? 'Open messages' : 
               'Chat offline'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${getChatDimensions()}`}>
          <Card className="h-full shadow-xl border-2 flex flex-col" style={{ backgroundColor: '#ffffff', opacity: 1 }}>
            {/* Header */}
            <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">
                    {selectedRoom ? (selectedRoom.itemId?.title || 'Direct Chat') : 'Messages'}
                  </CardTitle>
                  
                  {/* New Chat Button */}
                  {!selectedRoom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUserSearch(true)}
                      className="text-white hover:bg-blue-700 p-1 h-5 w-5"
                      aria-label="Start new chat"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {/* Connection Status */}
                  <div className="flex items-center gap-1">
                    {connectionState.status === 'connected' ? (
                      <Wifi className="w-3 h-3 text-green-300" />
                    ) : connectionState.status === 'reconnecting' ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-300" />
                    )}
                  </div>

                  {/* Notification Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className="text-white hover:bg-blue-700 p-1 h-5 w-5"
                    aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                  >
                    {notificationsEnabled ? 
                      <Bell className="w-3 h-3" /> : 
                      <BellOff className="w-3 h-3" />
                    }
                  </Button>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                    aria-label={isMaximized ? 'Restore' : 'Maximize'}
                  >
                    {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                    aria-label={isMinimized ? 'Restore' : 'Minimize'}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false)
                      setSelectedRoom(null)
                      setIsMinimized(false)
                      setIsMaximized(false)
                    }}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                    aria-label="Close chat"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {/* Error Display */}
            {error && (
              <div className="p-2 bg-red-50 border-b border-red-200 flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto p-1 h-5 w-5 text-red-500 hover:bg-red-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Content */}
            {!isMinimized && (
              <CardContent className="p-0 flex-1 overflow-hidden">
                {isGuest ? (
                  <div className="p-4 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Login Required</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Please login to start chatting with other users
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/login'}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Login
                    </Button>
                  </div>
                ) : selectedRoom ? (
                  <ChatWindow
                    room={selectedRoom}
                    currentUserId={currentUserId}
                    onBack={handleBackToList}
                  />
                ) : (
                  <ChatList
                    onSelectRoom={handleSelectRoom}
                    currentUserId={currentUserId}
                  />
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
      
      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleStartNewChat}
        currentUserId={currentUserId}
      />
    </TooltipProvider>
  )
}