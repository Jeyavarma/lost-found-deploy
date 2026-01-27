import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'

export default function ChatTest({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const testChat = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      console.log('Token:', token ? 'Present' : 'Missing')
      console.log('Item ID:', itemId)
      console.log('Backend URL:', BACKEND_URL)
      
      const response = await fetch(`${BACKEND_URL}/api/chat/room/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (response.ok) {
        setResult(`✅ Chat created: ${data._id}`)
      } else {
        setResult(`❌ Error: ${data.error || data.message}`)
      }
    } catch (error) {
      console.error('Chat test error:', error)
      setResult(`❌ Network error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded">
      <Button onClick={testChat} disabled={loading}>
        {loading ? 'Testing...' : 'Test Chat'}
      </Button>
      {result && <p className="mt-2 text-sm">{result}</p>}
    </div>
  )
}