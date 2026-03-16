'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Brain,
  Upload,
  Search,
  Eye,
  Zap,
  Camera,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'
import { toast } from 'sonner'

interface VisualMatch {
  item: any
  similarity: number
  confidence: 'High' | 'Medium' | 'Low'
  matchType: 'visual' | 'text' | 'combined'
}

export default function VisualAISearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [matches, setMatches] = useState<VisualMatch[]>([])
  const [detectedObjects, setDetectedObjects] = useState<any[]>([])
  const [suggestedCategory, setSuggestedCategory] = useState<string>('')
  const [modelsReady, setModelsReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }

  const performVisualSearch = async () => {
    if (!selectedImage && !searchQuery.trim()) {
      toast.error('Please upload an image or enter a search query')
      return
    }

    setLoading(true)
    try {
      if (selectedImage) {
        const formData = new FormData()
        formData.append('image', selectedImage)
        formData.append('threshold', '0.6')
        if (searchQuery.trim()) {
          // Send text as a loose category filter constraint for the visual query
          formData.append('category', searchQuery.trim())
        }

        const token = getAuthToken()
        const response = await fetch(`${BACKEND_URL}/api/visual-ai/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        const data = await response.json()
        if (response.ok) {
          setMatches(data.results || [])
        } else {
          throw new Error(data.error || 'Visual search failed')
        }
      } else if (searchQuery.trim()) {
        // Fallback for purely text-based search querying all items
        const response = await fetch(`${BACKEND_URL}/api/items`)
        if (!response.ok) throw new Error('Failed to fetch items')

        const allItems = await response.json()
        const textMatches = allItems.filter((item: any) => {
          const text = `${item.title} ${item.description} ${item.category}`.toLowerCase()
          return text.includes(searchQuery.toLowerCase())
        })

        const formattedMatches = textMatches.map((item: any) => ({
          item,
          similarity: 0.6,
          confidence: 'Medium',
          matchType: 'text'
        }))

        setMatches(formattedMatches.slice(0, 10))
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setSearchQuery('')
    setMatches([])
    setDetectedObjects([])
    setSuggestedCategory('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
          onClick={() => {
            // Ensure any previous client-side models are ignored
          }}
        >
          <Brain className="w-4 h-4 mr-2" />
          AI Visual Search
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI-Powered Visual Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Loading Status */}
          {modelLoading && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700">Loading AI models... (This may take a moment)</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Upload Image for Visual Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={modelLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {selectedImage && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Image selected
                  </Badge>
                )}
              </div>

              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-48 object-contain rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Detected Objects */}
              {detectedObjects.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">AI Detected Objects:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detectedObjects.map((obj, index) => (
                      <Badge key={index} variant="outline">
                        {obj.class} ({Math.round(obj.confidence * 100)}%)
                      </Badge>
                    ))}
                  </div>
                  {suggestedCategory && (
                    <div className="mt-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        Suggested Category: {suggestedCategory}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Text Search (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Describe the item (e.g., black iPhone, red backpack)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Search Actions */}
          <div className="flex gap-3">
            <Button
              onClick={performVisualSearch}
              disabled={loading || modelLoading || (!selectedImage && !searchQuery.trim())}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  AI Search
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          </div>

          {/* Search Results */}
          {matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  AI Search Results ({matches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matches.map((match, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start gap-4">
                        {match.item.imageUrl && (
                          <img
                            src={match.item.imageUrl}
                            alt={match.item.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{match.item.title}</h4>
                            <Badge className={`${match.confidence === 'High' ? 'bg-green-500' :
                              match.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-gray-500'
                              } text-white`}>
                              {match.confidence} Match
                            </Badge>
                            <Badge variant="outline">
                              {match.matchType === 'visual' ? '👁️ Visual' :
                                match.matchType === 'combined' ? '🧠 AI+Text' : '📝 Text'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{match.item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📍 {match.item.location}</span>
                            <span>📂 {match.item.category}</span>
                            <span>🎯 {Math.round(match.similarity * 100)}% similar</span>
                            <span>📅 {new Date(match.item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {matches.length === 0 && (selectedImage || searchQuery.trim()) && !loading && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-yellow-700">No matches found. Try adjusting your search or uploading a different image.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}