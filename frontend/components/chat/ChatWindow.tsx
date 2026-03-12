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
  UserX,
  MapPin,
  Minimize2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { locations } from '@/lib/constants'
import { socketManager, type QueuedMessage } from '@/lib/socket'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { notificationManager } from '@/lib/notifications'
import { toast } from 'sonner'
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
  type: 'text' | 'system' | 'meeting_proposal'
  meetingData?: {
    location: string
    date: string
    time: string
    status: 'proposed' | 'accepted' | 'rejected' | 'canceled'
  }
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
  onMinimize?: () => void
  currentUserId: string
}

export default function ChatWindow({ room, onClose, onBack, onMinimize, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showMeetDialog, setShowMeetDialog] = useState(false)
  const [meetLocation, setMeetLocation] = useState('')
  const [meetTime, setMeetTime] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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

      // Listen for typing indicator
      socket.on('user_typing', (data: { userId: string, isTyping: boolean }) => {
        if (data.userId !== currentUserId) {
          setIsOtherUserTyping(data.isTyping)
        }
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
        socket.off('reaction_added')
        socket.off('reaction_removed')
        socket.off('messages_read')
        socket.off('user_typing')
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
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

    // Clear typing status on send
    if (socket) {
      socket.emit('typing', { roomId: room._id, isTyping: false })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }

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
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const submitMeetingProposal = async () => {
    if (!meetLocation || !meetTime || !meetDate) {
      toast.error('Please fill in all meeting details')
      return
    }

    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${room._id}/meeting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: meetLocation, date: meetDate, time: meetTime })
      })

      if (response.ok) {
        const message = await response.json()
        setMessages(prev => [...prev, message])
        toast.success("Meeting proposed successfully")
      } else {
        throw new Error('Failed to submit meeting proposal')
      }
    } catch (error) {
      console.error('Failed to submit meeting proposal:', error)
      toast.error('Failed to propose meeting. Please try again.')
    } finally {
      setShowMeetDialog(false)
      setMeetLocation('')
      setMeetTime('')
      setMeetDate('')
    }
  }

  const handleMeetingAction = async (messageId: string, action: 'accept' | 'reject' | 'cancel') => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${room._id}/meeting/${messageId}/${action}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // Update the specific message in state
        setMessages(prev => prev.map(msg => msg._id === messageId ? data.message : msg))
        if (data.systemMessage) {
          setMessages(prev => [...prev, data.systemMessage])
        }
        toast.success(`Meeting ${action}ed`)
      } else {
        throw new Error(`Failed to ${action} meeting`)
      }
    } catch (err) {
      toast.error(`Failed to ${action} meeting`)
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
        toast.success('User blocked successfully')
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (socket && socket.connected) {
      socket.emit('typing', { roomId: room._id, isTyping: true })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId: room._id, isTyping: false })
      }, 3000)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b flex-shrink-0 bg-blue-600 md:bg-background text-white md:text-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack || onClose} className="text-white md:text-foreground hover:bg-white/20 md:hover:bg-accent h-8 w-8 p-0">
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
              <h3 className="font-semibold text-sm md:text-base leading-none mb-1">{room.itemId.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-blue-100 md:text-muted-foreground">
                <span className="truncate max-w-[100px] md:max-w-none">{room.itemId.category}</span>
                <span>•</span>
                <span className="truncate max-w-[100px] md:max-w-none">with {otherParticipant?.userId.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleBlockUser} title="Block User" className="text-white md:text-foreground hover:bg-white/20 md:hover:bg-accent h-8 w-8 p-0">
              <UserX className="w-4 h-4" />
            </Button>

            {onMinimize && (
              <Button variant="ghost" size="sm" onClick={onMinimize} className="text-white md:text-foreground hover:bg-white/20 md:hover:bg-accent h-8 w-8 p-0 md:hidden">
                <Minimize2 className="w-4 h-4" />
              </Button>
            )}

            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white md:text-foreground hover:bg-white/20 md:hover:bg-accent h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-gray-50/50">
        <ScrollArea className="flex-1 p-4">
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
                        <div className={`rounded-lg px-3 py-2 ${isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                          }`}>
                          {message.type === 'meeting_proposal' && message.meetingData ? (
                            <div className={`p-3 rounded-lg border flex flex-col items-start ${isOwn ? 'bg-blue-700/30 border-blue-400' : 'bg-white border-gray-200'} mb-1`}>
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span className="font-semibold text-sm">Safe Handover Meeting</span>
                              </div>
                              <div className="text-sm space-y-1 mb-3 opacity-90 pl-1 border-l-2 border-current">
                                <p><strong>📍 Where:</strong> {message.meetingData.location}</p>
                                <p><strong>📅 When:</strong> {new Date(message.meetingData.date).toLocaleDateString()} at {message.meetingData.time}</p>
                              </div>

                              <Badge className="mb-3" variant={
                                message.meetingData.status === 'accepted' ? 'default' :
                                  message.meetingData.status === 'rejected' || message.meetingData.status === 'canceled' ? 'destructive' : 'secondary'
                              }>
                                Status: {message.meetingData.status.toUpperCase()}
                              </Badge>

                              {message.meetingData.status === 'proposed' && (
                                <div className="flex gap-2 w-full">
                                  {isOwn ? (
                                    <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => handleMeetingAction(message._id, 'cancel')}>
                                      Cancel Proposal
                                    </Button>
                                  ) : (
                                    <>
                                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => handleMeetingAction(message._id, 'accept')}>
                                        Accept
                                      </Button>
                                      <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => handleMeetingAction(message._id, 'reject')}>
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : message.content.startsWith('🤝 Proposing a safe handover meeting:') ? (
                            <div className={`p-2 rounded border ${isOwn ? 'bg-blue-700/50 border-blue-500' : 'bg-white border-gray-200'} mb-1`}>
                              <p className="font-semibold text-sm mb-2">🤝 Meeting Proposal</p>
                              <p className="text-sm border-l-2 border-current pl-2 py-1 whitespace-pre-wrap opacity-90">
                                {message.content.replace('🤝 Proposing a safe handover meeting:\\n', '')}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                              {formatTime(message.createdAt)}
                            </p>
                            {isOwn && (
                              <span className={`text-xs ${isMessageRead(message) ? 'text-blue-200' : 'text-blue-300'
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

              {/* Typing indicator */}
              {isOtherUserTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {otherParticipant?.userId.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-3 bg-background border-t mt-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Connection status */}
          {!isOnline && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              📡 You're offline. Messages will be sent when connection is restored.
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Propose Meeting"
              onClick={() => setShowMeetDialog(true)}
              className="shrink-0"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
            </Button>
            <Input
              placeholder={isOnline ? "Type a message..." : "Type a message (will send when online)..."}
              value={newMessage}
              onChange={handleInputChange}
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
      </div>

      <Dialog open={showMeetDialog} onOpenChange={setShowMeetDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Propose Safe Handover Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Campus Location</Label>
              <Select value={meetLocation} onValueChange={setMeetLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a safe campus location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={meetDate}
                  onChange={(e) => setMeetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={meetTime}
                  onChange={(e) => setMeetTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetDialog(false)}>Cancel</Button>
            <Button onClick={submitMeetingProposal} className="bg-blue-600 hover:bg-blue-700 text-white">
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}