'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Wifi, WifiOff, Bell, BellOff, AlertCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isAuthenticated, getUserData } from '@/lib/auth'
import { enhancedSocketManager, type ConnectionState } from '@/lib/enhanced-socket-manager'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
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

export default function ImprovedFloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [hasChats, setHasChats] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected', retryCount: 0 })
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)
  const initRef = useRef(false)

  // Check authentication and initialize
  useEffect(() => {
    const auth = isAuthenticated()
    setAuthenticated(auth)
    
    if (auth && !initRef.current) {
      initRef.current = true
      const userData = getUserData()
      setCurrentUserId(userData?.id || '')
      initializeChat()
    }
  }, [])

  // Listen to connection state changes and chat events
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state)
      
      if (state.status === 'error') {
        setError(state.error || 'Connection failed')
        setShowOfflineAlert(true)
      } else if (state.status === 'connected') {
        setError(null)
        setShowOfflineAlert(false)
        loadChatRooms()
      }
    }

    const handleOpenChat = (event: CustomEvent) => {
      const { roomId, room } = event.detail
      setIsOpen(true)
      if (room) {
        setSelectedRoom(room)
      }
    }

    enhancedSocketManager.on('connection_state_changed', handleConnectionStateChange)
    enhancedSocketManager.on('connection_restored', () => {
      setError(null)
      setShowOfflineAlert(false)
      loadChatRooms()
    })

    enhancedSocketManager.on('new_message', handleNewMessage)
    window.addEventListener('openChat', handleOpenChat as EventListener)

    return () => {
      enhancedSocketManager.off('connection_state_changed', handleConnectionStateChange)
      enhancedSocketManager.off('connection_restored')
      enhancedSocketManager.off('new_message', handleNewMessage)
      window.removeEventListener('openChat', handleOpenChat as EventListener)
    }
  }, [currentUserId])

  // Initialize chat system
  const initializeChat = useCallback(async () => {
    if (isInitializing) return
    
    setIsInitializing(true)
    setError(null)
    
    try {
      await enhancedSocketManager.connect()
      await loadChatRooms()
      await requestNotificationPermission()
    } catch (err) {
      setError('Failed to initialize chat system')
      console.error('Chat initialization error:', err)
    } finally {
      setIsInitializing(false)
    }
  }, [isInitializing])

  // Load chat rooms and count unread
  const loadChatRooms = useCallback(async () => {
    if (!authenticated) return

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })

      if (response.ok) {
        const rooms: ChatRoom[] = await response.json()
        setHasChats(rooms.length > 0)
        
        const unreadCount = rooms.reduce((total, room) => 
          total + (room.unreadCount || 0), 0
        )
        setTotalUnread(unreadCount)
      }
    } catch (err) {
      console.error('Failed to load chat rooms:', err)
    }
  }, [authenticated])

  // Handle new messages
  const handleNewMessage = useCallback((message: any) => {
    if (message.senderId !== currentUserId) {
      setTotalUnread(prev => prev + 1)
      showNotification(message)
    }
  }, [currentUserId])

  // Show browser notification
  const showNotification = useCallback((message: any) => {
    if (!notificationsEnabled || document.visibilityState === 'visible') return

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('New Message', {
        body: message.content,
        icon: '/favicon.ico',
        tag: 'chat-message',
        requireInteraction: false
      })

      notification.onclick = () => {
        window.focus()
        setIsOpen(true)
        notification.close()
      }

      setTimeout(() => notification.close(), 5000)
    }
  }, [notificationsEnabled])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
    }
  }, [])

  // Handle room selection
  const handleSelectRoom = useCallback((room: ChatRoom) => {
    setSelectedRoom(room)
    setTotalUnread(prev => Math.max(0, prev - (room.unreadCount || 0)))
  }, [])

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  // Handle retry connection
  const handleRetryConnection = useCallback(() => {
    setError(null)
    initializeChat()
  }, [initializeChat])

  // Responsive sizing
  const getChatDimensions = () => {
    if (isMaximized) {
      return 'w-96 h-[600px] md:w-[500px] md:h-[700px]'
    }
    if (isMinimized) {
      return 'w-80 h-12'
    }
    return 'w-80 h-96 md:w-96 md:h-[500px]'
  }

  // Get connection status icon
  const getConnectionIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return <Wifi className="w-3 h-3 text-green-400" />
      case 'connecting':
      case 'reconnecting':
        return <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
      default:
        return <WifiOff className="w-3 h-3 text-red-400" />
    }
  }

  // Don't render if not authenticated and no chats
  if (!authenticated && !hasChats) {
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
                if (!authenticated) {
                  window.location.href = '/login'
                  return
                }
                setIsOpen(true)
                if (!enhancedSocketManager.isConnected()) {
                  initializeChat()
                }
              }}
              className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 p-0 transition-all duration-300 ${
                connectionState.status === 'connected' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
              aria-label="Open chat"
            >
              <div className="relative">
                <MessageCircle className="w-6 h-6 text-white" />
                {totalUnread > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                    aria-label={`${totalUnread} unread messages`}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
                {connectionState.status !== 'connected' && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <WifiOff className="w-2 h-2 text-red-500" />
                  </div>
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>
              {!authenticated ? 'Login to chat' : 
               connectionState.status === 'connected' ? 'Open messages' : 
               'Chat offline - Click to retry'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${getChatDimensions()}`}>
          <Card className="h-full shadow-xl border-2 flex flex-col">
            {/* Header */}
            <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">
                    {selectedRoom ? selectedRoom.itemId.title : 'Messages'}
                  </CardTitle>
                  
                  {/* Connection Status */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {getConnectionIcon()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {connectionState.status === 'connected' ? 'Connected' :
                         connectionState.status === 'connecting' ? 'Connecting...' :
                         connectionState.status === 'reconnecting' ? 'Reconnecting...' :
                         'Disconnected'}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Notification Toggle */}
                  {authenticated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                          className="text-white hover:bg-blue-700 p-1 h-5 w-5"
                        >
                          {notificationsEnabled ? 
                            <Bell className="w-3 h-3" /> : 
                            <BellOff className="w-3 h-3" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                  >
                    {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
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
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {/* Error/Offline Alert */}
            {(error || showOfflineAlert) && !isMinimized && (
              <Alert className="m-2 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  {error || 'You are offline. Messages will be sent when connection is restored.'}
                  {connectionState.status === 'error' && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleRetryConnection}
                      className="ml-2 p-0 h-auto text-red-600 underline"
                    >
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Content */}
            {!isMinimized && (
              <CardContent className="p-0 flex-1 overflow-hidden">
                {!authenticated ? (
                  <div className="p-4 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                ) : isInitializing ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Initializing chat...</p>
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
    </TooltipProvider>
  )
}