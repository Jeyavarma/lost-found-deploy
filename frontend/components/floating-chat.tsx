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
        <div className={`fixed z-50 transition-all duration-300 ${isMinimized
            ? 'bottom-6 right-6 w-80 h-12'
            : 'inset-0 w-full h-[100dvh] md:inset-auto md:bottom-6 md:right-6 md:w-80 md:h-[32rem]'
          }`}>
          <div className="h-full bg-background shadow-xl md:border md:border-border md:rounded-xl overflow-hidden flex flex-col">

            {!isMinimized && (
              <div className="flex-1 overflow-hidden">
                {selectedRoom ? (
                  <ChatWindow
                    room={selectedRoom}
                    currentUserId={currentUserId}
                    onBack={handleBackToList}
                    onClose={() => {
                      setIsOpen(false)
                      setSelectedRoom(null)
                      setIsMinimized(false)
                    }}
                    onMinimize={() => setIsMinimized(true)}
                  />
                ) : (
                  <ChatList
                    onSelectRoom={handleSelectRoom}
                    currentUserId={currentUserId}
                    onClose={() => {
                      setIsOpen(false)
                      setSelectedRoom(null)
                      setIsMinimized(false)
                    }}
                    onMinimize={() => setIsMinimized(true)}
                  />
                )}
              </div>
            )}

            {/* Minimized Header View */}
            {isMinimized && (
              <div
                className="w-full h-full bg-blue-600 text-white px-3 py-2 flex items-center justify-between cursor-pointer rounded-lg"
                onClick={() => setIsMinimized(false)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {selectedRoom ? selectedRoom.itemId.title : 'Messages'}
                  </span>
                  <ConnectionStatus />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    setSelectedRoom(null)
                    setIsMinimized(false)
                  }}
                  className="text-white hover:bg-blue-700 p-1 h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}