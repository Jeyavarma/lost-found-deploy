'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send, 
  ArrowLeft,
  MoreVertical,
  UserX,
  Search,
  Image as ImageIcon,
  Paperclip,
  Smile,
  AlertTriangle
} from 'lucide-react'
import { enhancedSocketManager, type QueuedMessage } from '@/lib/enhanced-socket-manager'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Message {
  _id: string
  content: string
  senderId: {
    _id: string
    name: string
    email: string
    role: string
  }
  createdAt: string
  type: 'text' | 'system' | 'image'
  imageUrl?: string
  readBy?: Array<{
    userId: string
    readAt: string
  }>
  clientMessageId?: string
}

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
}

interface EnhancedChatWindowProps {
  room: ChatRoom
  onClose?: () => void
  onBack?: () => void
  currentUserId: string
}

export default function EnhancedChatWindow({ room, onClose, onBack, currentUserId }: EnhancedChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const socket = enhancedSocketManager.getSocket()
  const otherParticipant = room.participants.find(p => p.userId._id !== currentUserId)
  const isBlocked = otherParticipant && blockedUsers.includes(otherParticipant.userId._id)

  useEffect(() => {
    loadMessages()
    loadPendingMessages()
    loadBlockedUsers()
    
    if (socket) {
      enhancedSocketManager.joinRoom(room._id)

      // Message events
      enhancedSocketManager.on('new_message', handleNewMessage)
      enhancedSocketManager.on('message_deleted', handleMessageDeleted)
      enhancedSocketManager.on('messages_read', handleMessagesRead)
      
      // Typing events
      enhancedSocketManager.on('user_typing', handleUserTyping)
      enhancedSocketManager.on('user_stopped_typing', handleUserStoppedTyping)
      
      // User events
      enhancedSocketManager.on('user_blocked', handleUserBlocked)
    }

    // Online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (socket) {
        enhancedSocketManager.leaveRoom(room._id)
        enhancedSocketManager.off('new_message', handleNewMessage)
        enhancedSocketManager.off('message_deleted', handleMessageDeleted)
        enhancedSocketManager.off('messages_read', handleMessagesRead)
        enhancedSocketManager.off('user_typing', handleUserTyping)
        enhancedSocketManager.off('user_stopped_typing', handleUserStoppedTyping)
        enhancedSocketManager.off('user_blocked', handleUserBlocked)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [room._id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Event handlers
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m._id === message._id)) return prev
      return [...prev, message]
    })
    
    // Remove from pending if it's our message
    if (message.clientMessageId) {
      setPendingMessages(prev => prev.filter(p => p.id !== message.clientMessageId))
    }
    
    scrollToBottom()
  }, [])

  const handleMessageDeleted = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.filter(m => m._id !== data.messageId))
  }, [])

  const handleMessagesRead = useCallback((data: { messageIds: string[], userId: string }) => {
    setMessages(prev => prev.map(msg => 
      data.messageIds.includes(msg._id)
        ? { 
            ...msg, 
            readBy: [...(msg.readBy || []), { 
              userId: data.userId, 
              readAt: new Date().toISOString() 
            }]
          }
        : msg
    ))
  }, [])

  const handleUserTyping = useCallback((data: { userId: string, userName: string }) => {
    if (data.userId !== currentUserId) {
      setTypingUsers(prev => [...prev.filter(u => u !== data.userName), data.userName])
    }
  }, [currentUserId])

  const handleUserStoppedTyping = useCallback((data: { userId: string, userName: string }) => {
    setTypingUsers(prev => prev.filter(u => u !== data.userName))
  }, [])

  const handleUserBlocked = useCallback((data: { blockedUserId: string }) => {
    setBlockedUsers(prev => [...prev, data.blockedUserId])
  }, [])

  // Data loading
  const loadMessages = async (pageNum = 1) => {
    try {
      const token = getAuthToken()
      const response = await fetch(
        `${BACKEND_URL}/api/chat/room/${room._id}/messages?page=${pageNum}&limit=50`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (pageNum === 1) {
          setMessages(data.messages || [])
        } else {
          setMessages(prev => [...data.messages, ...prev])
        }
        setHasMoreMessages(data.hasMore || false)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingMessages = () => {
    const pending = enhancedSocketManager.getPendingMessages(room._id)
    setPendingMessages(pending)
  }

  const loadBlockedUsers = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/blocked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBlockedUsers(data.map((b: any) => b.blockedUserId))
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error)
    }
  }

  // Message actions
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || isBlocked) return

    setSending(true)
    setError(null)
    
    try {
      const messageId = enhancedSocketManager.sendMessage(
        room._id,
        newMessage.trim(),
        'text'
      )

      // Add to pending messages for immediate UI feedback
      const pendingMsg: QueuedMessage = {
        id: messageId,
        roomId: room._id,
        content: newMessage.trim(),
        type: 'text',
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0
      }
      
      setPendingMessages(prev => [...prev, pendingMsg])
      setNewMessage('')
      stopTyping()
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!isTyping && socket) {
      setIsTyping(true)
      socket.emit('typing', { roomId: room._id })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }

  const stopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false)
      socket.emit('stop_typing', { roomId: room._id })
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleBlockUser = async () => {
    if (!otherParticipant || isBlocked) return
    
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/block/${otherParticipant.userId._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Blocked from chat' })
      })

      if (response.ok) {
        setBlockedUsers(prev => [...prev, otherParticipant.userId._id])
        setError('User blocked successfully')
        setTimeout(() => setError(null), 3000)
      }
    } catch (error) {
      console.error('Block user error:', error)
      setError('Failed to block user')
    }
  }

  const handleUnblockUser = async () => {
    if (!otherParticipant || !isBlocked) return
    
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/unblock/${otherParticipant.userId._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setBlockedUsers(prev => prev.filter(id => id !== otherParticipant.userId._id))
        setError('User unblocked successfully')
        setTimeout(() => setError(null), 3000)
      }
    } catch (error) {
      console.error('Unblock user error:', error)
      setError('Failed to unblock user')
    }
  }

  const loadMoreMessages = () => {
    if (hasMoreMessages && !loading) {
      setPage(prev => prev + 1)
      loadMessages(page + 1)
    }
  }

  // Utility functions
  const isMessageRead = (message: Message) => {
    return message.readBy?.some(r => r.userId !== currentUserId) || false
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  // Mark messages as read when they become visible
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => 
        msg.senderId._id !== currentUserId && 
        !msg.readBy?.some(r => r.userId === currentUserId)
      )
      .map(msg => msg._id)

    if (unreadMessages.length > 0) {
      enhancedSocketManager.markMessagesRead(unreadMessages)
    }
  }, [messages, currentUserId])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack || onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {room.itemId.imageUrl && (
              <img 
                src={room.itemId.imageUrl} 
                alt={room.itemId.title}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            )}
            
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{room.itemId.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">{room.itemId.category}</Badge>
                <span>•</span>
                <span className="truncate">
                  with {otherParticipant?.userId.name}
                  {isBlocked && <span className="text-red-500 ml-1">(Blocked)</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSearch(!showSearch)}
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isBlocked ? (
                  <DropdownMenuItem onClick={handleUnblockUser}>
                    Unblock User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleBlockUser} className="text-red-600">
                    <UserX className="w-4 h-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
      </CardHeader>

      {/* Error Alert */}
      {error && (
        <Alert className="m-2 border-red-200 bg-red-50 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={messagesContainerRef}>
          <div className="p-4">
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="text-center mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadMoreMessages}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load older messages'}
                </Button>
              </div>
            )}

            {loading && page === 1 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Regular messages */}
                {filteredMessages.map((message) => {
                  const isOwn = message.senderId._id === currentUserId

                  return (
                    <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isOwn && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {message.senderId.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="min-w-0">
                          <div className={`rounded-lg px-3 py-2 break-words ${
                            isOwn 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.type === 'image' && message.imageUrl ? (
                              <img 
                                src={message.imageUrl} 
                                alt="Shared image"
                                className="max-w-full h-auto rounded mb-2"
                              />
                            ) : null}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${
                                isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatTime(message.createdAt)}
                              </p>
                              {isOwn && (
                                <span className={`text-xs ${
                                  isMessageRead(message) ? 'text-blue-200' : 'text-blue-300'
                                }`}>
                                  {isMessageRead(message) ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Pending messages */}
                {pendingMessages.map((message) => (
                  <div key={message.id} className="flex justify-end">
                    <div className="flex items-start gap-2 max-w-[80%] flex-row-reverse">
                      <div className="bg-blue-400 text-white rounded-lg px-3 py-2 opacity-70">
                        <p className="text-sm break-words">{message.content}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-blue-100">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-xs text-blue-200">
                            {message.status === 'pending' && '⏳'}
                            {message.status === 'sending' && '📤'}
                            {message.status === 'failed' && '❌'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-600">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4 flex-shrink-0">
          {/* Connection status */}
          {!isOnline && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              📡 You're offline. Messages will be sent when connection is restored.
            </div>
          )}

          {isBlocked && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              🚫 You have blocked this user. Unblock to send messages.
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder={
                  isBlocked ? "Unblock user to send messages..." :
                  !isOnline ? "Type a message (will send when online)..." :
                  "Type a message..."
                }
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  if (!isBlocked) handleTyping()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={sending || isBlocked}
                className="min-h-[40px] max-h-[120px] resize-none"
                rows={1}
              />
            </div>
            
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending || isBlocked}
              size="sm"
              className="self-end"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}