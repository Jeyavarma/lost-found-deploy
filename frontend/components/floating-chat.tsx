'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAuthenticated, getUserData } from '@/lib/auth'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import ConnectionStatus from '@/components/connection-status'

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
  }
  updatedAt: string
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const auth = isAuthenticated()
    setAuthenticated(auth)
    if (auth) {
      const userData = getUserData()
      setCurrentUserId(userData?.id || '')
    }
  }, [])

  if (!authenticated) {
    return null
  }

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room)
  }

  const handleBackToList = () => {
    setSelectedRoom(null)
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-50 p-0"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isMinimized ? 'w-80 h-12' : 'w-80 h-96'
        }`}>
          <Card className="h-full shadow-xl border-2">
            <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedRoom ? selectedRoom.itemId.title : 'Messages'}
                  </CardTitle>
                  <ConnectionStatus />
                </div>
                <div className="flex items-center gap-1">
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
                    }}
                    className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {!isMinimized && (
              <CardContent className="p-0 h-full overflow-hidden">
                {selectedRoom ? (
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
    </>
  )
}