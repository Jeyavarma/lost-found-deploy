"use client"

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Camera, 
  Upload, 
  Search, 
  Eye, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'
import { getAuthToken } from '@/lib/auth'

interface VisualSearchResult {
  item: {
    id: string
    title: string
    description: string
    category: string
    location: string
    imagePath: string
    type: 'lost' | 'found'
    reportedBy: {
      name: string
      email: string
    }
    createdAt: string
  }
  similarity: number
  matchPercentage: number
  analysis?: {
    overallSimilarity: number
    differences: Array<{
      type: string
      severity: string
      description: string
    }>
    recommendation: string
  }
}

export default function VisualSearchComponent() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<VisualSearchResult[]>([])
  const [threshold, setThreshold] = useState(0.6)
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVisualSearch = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('threshold', threshold.toString())
      if (category) formData.append('category', category)
      if (location) formData.append('location', location)

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
        setResults(data.results || [])
        if (data.results.length === 0) {
          setError('No similar items found. Try adjusting the similarity threshold.')
        }
      } else {
        setError(data.error || 'Visual search failed')
      }
    } catch (err) {
      setError('Failed to perform visual search. Please try again.')
      console.error('Visual search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Visual Search</h1>
        <p className="text-gray-600">Find similar items using AI-powered image recognition</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Upload Image
          </CardTitle>
          <CardDescription>
            Upload an image to find visually similar lost or found items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
            {imagePreview ? (
              <div className="text-center">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-w-xs max-h-48 object-contain rounded-lg mb-4"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Change Image
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Image
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Supports JPG, PNG, WebP (max 10MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Search Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="threshold">Similarity Threshold</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="threshold"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">
                  {Math.round(threshold * 100)}%
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                placeholder="e.g., electronics, jewelry"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                placeholder="e.g., library, cafeteria"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleVisualSearch}
            disabled={!selectedImage || isSearching}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Similar Items
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Search Results ({results.length} found)
            </CardTitle>
            <CardDescription>
              Items ranked by visual similarity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <Card key={result.item.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={`${BACKEND_URL}${result.item.imagePath}`}
                      alt={result.item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={result.item.type === 'lost' ? 'destructive' : 'default'}
                      >
                        {result.item.type}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge className={getMatchColor(result.matchPercentage)}>
                        {result.matchPercentage}% match
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{result.item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {result.item.description}
                    </p>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      <div>📍 {result.item.location}</div>
                      <div>🏷️ {result.item.category}</div>
                      <div>👤 {result.item.reportedBy.name}</div>
                      <div>📅 {new Date(result.item.createdAt).toLocaleDateString()}</div>
                    </div>

                    {/* Similarity Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Similarity</span>
                        <span>{Math.round(result.similarity * 100)}%</span>
                      </div>
                      <Progress value={result.similarity * 100} className="h-2" />
                    </div>

                    {/* Analysis Results */}
                    {result.analysis && (
                      <div className="mt-3 p-2 bg-gray-50 rounded">
                        <div className="text-xs font-medium mb-1">
                          AI Analysis: {result.analysis.recommendation}
                        </div>
                        {result.analysis.differences.length > 0 && (
                          <div className="space-y-1">
                            {result.analysis.differences.map((diff, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className={`text-xs ${getSeverityColor(diff.severity)}`}
                              >
                                {diff.type}: {diff.severity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="w-full mt-3">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <Search className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Visual Similarity</h3>
              <p className="text-sm text-gray-600">Find items that look similar</p>
            </div>
            <div className="text-center p-4">
              <Eye className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Difference Detection</h3>
              <p className="text-sm text-gray-600">Identify key differences</p>
            </div>
            <div className="text-center p-4">
              <Zap className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold">Smart Filtering</h3>
              <p className="text-sm text-gray-600">Filter by category & location</p>
            </div>
            <div className="text-center p-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <h3 className="font-semibold">Match Confidence</h3>
              <p className="text-sm text-gray-600">AI confidence scoring</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}