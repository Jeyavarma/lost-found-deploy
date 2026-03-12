'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { isAuthenticated, getAuthToken } from '@/lib/auth'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface SimpleContactButtonProps {
  itemId: string
  itemTitle: string
}

export default function SimpleContactButton({ itemId, itemTitle }: SimpleContactButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleContact = async () => {
    // Check authentication
    if (!isAuthenticated()) {
      toast.error('Please login to start a conversation')
      window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }

    setLoading(true)

    try {
      console.log('Item ID:', itemId)
      const room = await api.post(`/api/chat/room/${itemId}`)
      console.log('Room created:', room)

      // Open floating chat
      window.dispatchEvent(new CustomEvent('openChat', {
        detail: { roomId: room._id, room }
      }))

      toast.success('Chat started successfully!')
    } catch (error) {
      console.error('Chat creation error:', error)
      toast.error('Failed to start conversation. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleContact}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Starting...
        </>
      ) : (
        <>
          <MessageCircle className="w-4 h-4 mr-2" />
          Start Chat
        </>
      )}
    </Button>
  )
}