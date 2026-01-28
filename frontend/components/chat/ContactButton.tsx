'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'

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
      alert('Please login to start a conversation')
      window.location.href = '/login'
      return
    }

    setLoading(true)
    try {
      console.log('Starting chat for item:', itemId)
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const room = await response.json()
        console.log('Chat room created:', room)
        onChatCreated?.(room._id)
        
        // Dispatch event to open floating chat
        window.dispatchEvent(new CustomEvent('openChat', { 
          detail: { roomId: room._id, room } 
        }))
        
        // Show success message
        alert('Chat started! Check the chat window.')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Chat creation failed:', errorData)
        alert(errorData.error || 'Failed to start conversation')
      }
    } catch (error) {
      console.error('Contact error:', error)
      alert('Network error. Please check your connection and try again.')
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