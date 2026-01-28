'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Sparkles, Image as ImageIcon } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'

interface AIMatch {
  userItem: {
    _id: string
    title: string
    status: string
    imageUrl?: string
  }
  matchedItem: {
    _id: string
    title: string
    description: string
    status: string
    imageUrl?: string
    reportedBy: {
      name: string
      email: string
    }
    location: string
    createdAt: string
  }
  confidence: 'High' | 'Medium' | 'Low'
  similarity: number
  matchedAt: string
  viewed: boolean
}

export default function AIMatches() {
  const [matches, setMatches] = useState<AIMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAIMatches()
  }, [])

  const fetchAIMatches = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/items/ai-matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMatches(data)
      }
    } catch (error) {
      console.error('Error fetching AI matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsViewed = async (itemId: string, matchId: string) => {
    try {
      const token = getAuthToken()
      await fetch(`${BACKEND_URL}/api/items/matches/${itemId}/${matchId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setMatches(prev => prev.map(match => 
        match.userItem._id === itemId && match.matchedItem._id === matchId
          ? { ...match, viewed: true }
          : match
      ))
    } catch (error) {
      console.error('Error marking match as viewed:', error)
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-500 text-white'
      case 'Medium': return 'bg-yellow-500 text-white'
      case 'Low': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Finding matches...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No visual matches found yet</p>
            <p className="text-sm text-gray-500">Upload images to enable AI matching</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Matches ({matches.length})
          </div>
          {matches.some(m => !m.viewed) && (
            <Badge variant="destructive">
              {matches.filter(m => !m.viewed).length} New
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div 
              key={`${match.userItem._id}-${match.matchedItem._id}`}
              className={`border rounded-lg p-4 ${!match.viewed ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={getConfidenceColor(match.confidence)}>
                    {match.confidence} Match
                  </Badge>
                  {!match.viewed && (
                    <Badge variant="outline" className="text-purple-600 border-purple-600">
                      New
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsViewed(match.userItem._id, match.matchedItem._id)}
                  disabled={match.viewed}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {match.viewed ? 'Viewed' : 'Mark Viewed'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Your Item */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Your {match.userItem.status} item:</h4>
                  <div className="flex items-center gap-3">
                    {match.userItem.imageUrl && (
                      <img 
                        src={match.userItem.imageUrl} 
                        alt={match.userItem.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-medium">{match.userItem.title}</p>
                      <Badge className={match.userItem.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                        {match.userItem.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Matched Item */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Potential match:</h4>
                  <div className="flex items-center gap-3">
                    {match.matchedItem.imageUrl && (
                      <img 
                        src={match.matchedItem.imageUrl} 
                        alt={match.matchedItem.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-medium">{match.matchedItem.title}</p>
                      <p className="text-sm text-gray-600">{match.matchedItem.location}</p>
                      <p className="text-xs text-gray-500">
                        By {match.matchedItem.reportedBy.name}
                      </p>
                      <Badge className={match.matchedItem.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                        {match.matchedItem.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-gray-600">{match.matchedItem.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Matched on {new Date(match.matchedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}