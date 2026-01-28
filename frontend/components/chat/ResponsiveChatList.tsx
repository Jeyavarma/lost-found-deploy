'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, 
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Archive
} from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { enhancedSocketManager } from '@/lib/enhanced-socket-manager'

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
  isArchived?: boolean
}

interface ResponsiveChatListProps {
  onSelectRoom: (room: ChatRoom) => void
  currentUserId: string
  selectedRoomId?: string
}

export default function ResponsiveChatList({ onSelectRoom, currentUserId, selectedRoomId }: ResponsiveChatListProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChatRooms()
    
    // Listen for real-time updates
    enhancedSocketManager.on('new_message', handleNewMessage)
    enhancedSocketManager.on('room_updated', handleRoomUpdated)
    
    return () => {
      enhancedSocketManager.off('new_message', handleNewMessage)
      enhancedSocketManager.off('room_updated', handleRoomUpdated)
    }
  }, [])

  useEffect(() => {
    filterRooms()
  }, [rooms, searchQuery, filter])

  const loadChatRooms = async () => {
    try {
      setError(null)
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      } else {
        throw new Error('Failed to load chat rooms')
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = useCallback((message: any) => {
    setRooms(prev => prev.map(room => {
      if (room._id === message.roomId) {
        return {
          ...room,
          lastMessage: {
            content: message.content,
            timestamp: message.createdAt,
            senderId: message.senderId._id
          },
          unreadCount: message.senderId._id !== currentUserId 
            ? (room.unreadCount || 0) + 1 
            : room.unreadCount,
          updatedAt: message.createdAt
        }
      }
      return room
    }))
  }, [currentUserId])

  const handleRoomUpdated = useCallback((updatedRoom: ChatRoom) => {
    setRooms(prev => prev.map(room => 
      room._id === updatedRoom._id ? updatedRoom : room
    ))
  }, [])

  const filterRooms = () => {
    let filtered = rooms

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(room => 
        room.itemId.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.participants.some(p => 
          p.userId.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        room.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(room => (room.unreadCount || 0) > 0)
        break
      case 'archived':
        filtered = filtered.filter(room => room.isArchived)
        break
      default:
        filtered = filtered.filter(room => !room.isArchived)
    }

    // Sort by last message time
    filtered.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.timestamp || a.updatedAt).getTime()
      const bTime = new Date(b.lastMessage?.timestamp || b.updatedAt).getTime()
      return bTime - aTime
    })

    setFilteredRooms(filtered)
  }

  const archiveRoom = async (roomId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${roomId}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setRooms(prev => prev.map(room => 
          room._id === roomId ? { ...room, isArchived: true } : room
        ))
      }
    } catch (error) {
      console.error('Failed to archive room:', error)
    }
  }

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${roomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setRooms(prev => prev.filter(room => room._id !== roomId))
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
    }
  }

  const markAsRead = async (roomId: string) => {
    try {
      const token = getAuthToken()
      await fetch(`${BACKEND_URL}/api/chat/room/${roomId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      setRooms(prev => prev.map(room => 
        room._id === roomId ? { ...room, unreadCount: 0 } : room
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return diffInDays === 1 ? '1d' : `${diffInDays}d`
    }
  }

  const getOtherParticipant = (room: ChatRoom) => {
    return room.participants.find(p => p.userId._id !== currentUserId)
  }

  const getTotalUnread = () => {
    return rooms.reduce((total, room) => total + (room.unreadCount || 0), 0)
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTotalUnread() > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {getTotalUnread()}
              </Badge>
            )}
            <Badge variant="outline">{filteredRooms.length}</Badge>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button
              variant={filter === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('archived')}
            >
              Archived
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        {error ? (
          <div className="p-4 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadChatRooms} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching conversations' : 
               filter === 'unread' ? 'No unread messages' :
               filter === 'archived' ? 'No archived conversations' :
               'No conversations yet'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' :
               filter !== 'all' ? 'Try changing the filter' :
               'Start a conversation by viewing an item and clicking "Contact"'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {filteredRooms.map((room) => {
                const otherParticipant = getOtherParticipant(room)
                const isSelected = selectedRoomId === room._id
                const hasUnread = (room.unreadCount || 0) > 0
                
                return (
                  <div
                    key={room._id}
                    className={`group relative rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-3 justify-start text-left"
                      onClick={() => {
                        onSelectRoom(room)
                        if (hasUnread) markAsRead(room._id)
                      }}
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        {/* Item Image or Avatar */}
                        <div className="relative flex-shrink-0">
                          {room.itemId.imageUrl ? (
                            <img 
                              src={room.itemId.imageUrl} 
                              alt={room.itemId.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="text-sm">
                                {room.itemId.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {hasUnread && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                          )}
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
                              {room.itemId.title}
                            </h4>
                            {room.lastMessage && (
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatLastMessageTime(room.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {room.itemId.category}
                            </Badge>
                            <span className="text-xs text-gray-500 truncate">
                              {otherParticipant?.userId.name}
                            </span>
                            {hasUnread && (
                              <Badge className="bg-red-500 text-white text-xs px-1 py-0 min-w-[20px] h-5">
                                {room.unreadCount! > 99 ? '99+' : room.unreadCount}
                              </Badge>
                            )}
                          </div>

                          {room.lastMessage && (
                            <p className={`text-xs truncate ${
                              hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'
                            }`}>
                              {room.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                              {room.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </Button>

                    {/* Room Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasUnread && (
                            <DropdownMenuItem onClick={() => markAsRead(room._id)}>
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => archiveRoom(room._id)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteRoom(room._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}