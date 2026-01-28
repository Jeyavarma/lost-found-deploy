'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { isAuthenticated, getAuthToken } from '@/lib/auth'

interface SimpleContactButtonProps {
  itemId: string
  itemTitle: string
}

export default function SimpleContactButton({ itemId, itemTitle }: SimpleContactButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleContact = async () => {
    // Check authentication
    if (!isAuthenticated()) {
      alert('Please login to start a conversation')
      window.location.href = '/login'
      return
    }

    setLoading(true)
    
    try {
      const token = getAuthToken()
      console.log('Token:', token ? 'Present' : 'Missing')
      console.log('Backend URL:', BACKEND_URL)
      console.log('Item ID:', itemId)

      const response = await fetch(`${BACKEND_URL}/api/chat/room/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const room = await response.json()
        console.log('Room created:', room)
        
        // Open floating chat
        window.dispatchEvent(new CustomEvent('openChat', { 
          detail: { roomId: room._id, room } 
        }))
        
        alert('Chat started successfully!')
      } else {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          alert(`Error: ${errorData.error || 'Failed to start conversation'}`)
        } catch {
          alert(`Error: ${response.status} - ${errorText}`)
        }
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('Network error. Please check your connection.')
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