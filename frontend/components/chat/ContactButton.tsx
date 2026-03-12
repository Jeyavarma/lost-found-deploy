'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface ContactButtonProps {
  itemId: string
  itemTitle: string
  onChatCreated?: (roomId: string) => void
}

export default function ContactButton({ itemId, itemTitle, onChatCreated }: ContactButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleContact = async () => {
    const token = getAuthToken()
    if (!token) {
      toast.error('Please login to start a conversation')
      window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }

    setLoading(true)
    try {
      console.log('Starting chat for item:', itemId)
      const room = await api.post(`/api/chat/room/${itemId}`)

      console.log('Chat room created:', room)
      onChatCreated?.(room._id)

      // Dispatch event to open floating chat
      window.dispatchEvent(new CustomEvent('openChat', {
        detail: { roomId: room._id, room }
      }))

      // Show success message
      toast.success('Chat started! Check the chat window.')
    } catch (error) {
      console.error('Contact error:', error)
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
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      ) : (
        <MessageCircle className="w-4 h-4 mr-2" />
      )}
      Contact
    </Button>
  )
}