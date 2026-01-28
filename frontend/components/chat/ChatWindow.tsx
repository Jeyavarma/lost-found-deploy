'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  X, 
  ArrowLeft,
  MoreVertical,
  UserX
} from 'lucide-react'
import { socketManager, type QueuedMessage } from '@/lib/socket'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { notificationManager } from '@/lib/notifications'
// import MessageReactions from './MessageReactions'
// import MessageSearch from './MessageSearch'
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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
  type: 'text' | 'system'
  reactions?: Array<{
    userId: string
    emoji: string
    createdAt: string
  }>
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

interface ChatWindowProps {
  room: ChatRoom
  onClose?: () => void
  onBack?: () => void
  currentUserId: string
}

export default function ChatWindow({ room, onClose, onBack, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const socket = socketManager.getSocket()
  const otherParticipant = room.participants.find(p => p.userId._id !== currentUserId)

  useEffect(() => {
    loadMessages()
    loadPendingMessages()
    
    if (socket) {
      socket.emit('join_room', room._id)

      socket.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message])
        // Remove from pending if it's our message
        if (message.clientMessageId) {
          setPendingMessages(prev => prev.filter(p => p.id !== message.clientMessageId))
        }
        
        // Show notification if message is from another user
        if (message.senderId._id !== currentUserId && document.hidden) {
          notificationManager.showChatNotification(
            message.senderId.name,
            message.content,
            room._id,
            room.itemId.title
          )
        }
        
        scrollToBottom()
      })

      // Listen for reactions
      socket.on('reaction_added', (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
      })

      socket.on('reaction_removed', (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
      })

      // Listen for read receipts
      socket.on('messages_read', (data: any) => {
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
      })
    }

    // Online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (socket) {
        socket.emit('leave_room', room._id)
        socket.off('new_message')
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [room._id, socket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize notifications
  useEffect(() => {
    notificationManager.initialize()
  }, [])

  // Mark messages as read when they become visible
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => 
        msg.senderId._id !== currentUserId && 
        !msg.readBy?.some(r => r.userId === currentUserId)
      )
      .map(msg => msg._id)

    if (unreadMessages.length > 0 && socket) {
      socket.emit('mark_read', { messageIds: unreadMessages })
    }
  }, [messages, currentUserId, socket])

  const loadMessages = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${room._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Handle both array and object responses with proper validation
        let messagesArray = []
        if (data && Array.isArray(data.messages)) {
          messagesArray = data.messages.filter((msg: any) => msg && msg._id)
        } else if (Array.isArray(data)) {
          messagesArray = data.filter((msg: any) => msg && msg._id)
        } else {
          console.warn('Invalid messages data format:', data)
          messagesArray = []
        }
        setMessages(messagesArray)
      } else {
        console.warn('Failed to load messages, starting with empty chat')
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const loadPendingMessages = () => {
    const pending = socketManager.getPendingMessages(room._id)
    setPendingMessages(pending)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately
    
    try {
      if (socket && socket.connected) {
        // Send via socket
        const messageId = socketManager.sendMessage(
          room._id,
          messageContent,
          'text',
          (status) => {
            if (status === 'failed') {
              loadPendingMessages()
            }
          }
        )

        // Add to pending messages for immediate UI feedback
        const pendingMsg: QueuedMessage = {
          id: messageId,
          roomId: room._id,
          content: messageContent,
          type: 'text',
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0
        }
        
        setPendingMessages(prev => [...prev, pendingMsg])
      } else {
        // Fallback to HTTP if socket not connected
        const token = getAuthToken()
        const response = await fetch(`${BACKEND_URL}/api/chat/room/${room._id}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: messageContent, type: 'text' })
        })

        if (response.ok) {
          const message = await response.json()
          setMessages(prev => [...prev, message])
        } else {
          throw new Error('Failed to send message via HTTP')
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Restore message to input on error
      setNewMessage(messageContent)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (socket) {
      socket.emit('add_reaction', { messageId, emoji })
    }
  }

  const handleRemoveReaction = (messageId: string) => {
    if (socket) {
      socket.emit('remove_reaction', { messageId })
    }
  }

  const handleBlockUser = async () => {
    if (!otherParticipant) return
    
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
        alert('User blocked successfully')
        onClose?.()
      }
    } catch (error) {
      console.error('Block user error:', error)
    }
  }

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack || onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {room.itemId.imageUrl && (
              <img 
                src={room.itemId.imageUrl} 
                alt={room.itemId.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            
            <div>
              <CardTitle className="text-lg">{room.itemId.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">{room.itemId.category}</Badge>
                <span>•</span>
                <span>with {otherParticipant?.userId.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBlockUser} title="Block User">
              <UserX className="w-4 h-4" />
            </Button>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-96 p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Regular messages */}
              {messages.map((message) => {
                const isOwn = message.senderId._id === currentUserId

                return (
                  <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {message.senderId.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div>
                        <div className={`rounded-lg px-3 py-2 ${
                          isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
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
                        
                        {/* Message reactions - temporarily disabled */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {message.reactions.map((reaction, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-1 rounded">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pending messages */}
              {pendingMessages.map((message) => (
                <div key={message.id} className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[70%] flex-row-reverse">
                    <div className="bg-blue-400 text-white rounded-lg px-3 py-2 opacity-70">
                      <p className="text-sm">{message.content}</p>
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

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          {/* Connection status */}
          {!isOnline && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              📡 You're offline. Messages will be sent when connection is restored.
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder={isOnline ? "Type a message..." : "Type a message (will send when online)..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="sm"
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