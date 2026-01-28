'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, X } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'

interface SearchResult {
  _id: string
  content: string
  senderId: {
    _id: string
    name: string
  }
  createdAt: string
}

interface MessageSearchProps {
  roomId: string
  onMessageSelect?: (messageId: string) => void
}

export default function MessageSearch({ roomId, onMessageSelect }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const searchMessages = async () => {
    if (!query.trim() || query.length < 2) return

    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(
        `${BACKEND_URL}/api/chat/room/${roomId}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchMessages()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={searchMessages} disabled={loading || query.length < 2}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result._id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      onMessageSelect?.(result._id)
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{result.senderId.name}</span>
                      <span className="text-xs text-gray-500">{formatTime(result.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {highlightText(result.content, query)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No messages found for "{query}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}