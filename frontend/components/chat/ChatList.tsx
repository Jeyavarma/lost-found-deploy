'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageCircle, 
  Search,
  Plus
} from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'

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
  updatedAt: string
}

interface ChatListProps {
  onSelectRoom: (room: ChatRoom) => void
  currentUserId: string
}

export default function ChatList({ onSelectRoom, currentUserId }: ChatListProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChatRooms()
  }, [])

  const loadChatRooms = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure data is always an array with proper validation
        if (Array.isArray(data)) {
          setRooms(data.filter((room: any) => room && room._id))
        } else if (data && typeof data === 'object' && Array.isArray(data.rooms)) {
          setRooms(data.rooms.filter((room: any) => room && room._id))
        } else {
          console.warn('Invalid chat rooms data format:', data)
          setRooms([])
        }
      } else {
        console.warn('Failed to fetch chat rooms:', response.status)
        setRooms([])
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const getOtherParticipant = (room: ChatRoom) => {
    return room.participants.find(p => p.userId._id !== currentUserId)
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </div>
          <Badge variant="secondary">{rooms.length}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {rooms.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start a conversation by viewing an item and clicking "Contact"
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1 p-2">
              {rooms.filter(room => room && room._id).map((room) => {
                const otherParticipant = getOtherParticipant(room)
                
                return (
                  <Button
                    key={room._id}
                    variant="ghost"
                    className="w-full h-auto p-3 justify-start hover:bg-gray-50"
                    onClick={() => onSelectRoom(room)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Item Image or Avatar */}
                      {room.itemId?.imageUrl ? (
                        <img 
                          src={room.itemId.imageUrl} 
                          alt={room.itemId?.title || 'Item'}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarFallback>
                            {room.itemId?.title?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {room.itemId?.title || 'Direct Chat'}
                          </h4>
                          {room.lastMessage && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatLastMessageTime(room.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                          {room.itemId?.category && (
                            <Badge variant="outline" className="text-xs">
                              {room.itemId.category}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            with {otherParticipant?.userId?.name || 'User'}
                          </span>
                        </div>

                        {room.lastMessage && (
                          <p className="text-xs text-gray-600 truncate">
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}