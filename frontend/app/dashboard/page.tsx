"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Package, 
  Search, 
  MessageCircle, 
  Calendar,
  MapPin,
  Eye,
  Trash2
} from "lucide-react"
import Navigation from "@/components/layout/navigation"
import AIMatches from "@/components/features/ai-matches"
import AISearchButton from "@/components/features/ai-search-button"
import ItemDetailModal from "@/components/features/item-detail-modal"
import FloatingChat from "@/components/floating-chat"
import ChatWindow from "@/components/chat/ChatWindow"
import { isAuthenticated, getUserData, getAuthToken, type User as AuthUser } from "@/lib/auth"
import { socketManager } from "@/lib/socket"
import { SOCKET_CONFIG } from "@/lib/socket-config"
import Link from "next/link"
import { BACKEND_URL } from "@/lib/config"
import { api } from "@/lib/api"
import { LoadingSpinner, LoadingCard } from "@/components/loading-states"
import ErrorBoundary from "@/components/error-boundary"

interface Item {
  _id: string
  title: string
  description: string
  category: string
  status: 'lost' | 'found'
  location: string
  date: string
  createdAt: string
  itemImageUrl?: string
  imageUrl?: string
  matchScore?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [myItems, setMyItems] = useState<Item[]>([])
  const [potentialMatches, setPotentialMatches] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteModal, setDeleteModal] = useState<{show: boolean, item: Item | null}>({show: false, item: null})
  const [viewModal, setViewModal] = useState<{show: boolean, item: Item | null}>({show: false, item: null})
  
  // Debug logging
  useEffect(() => {
    console.log('ViewModal state changed:', viewModal)
    if (viewModal.show && !viewModal.item) {
      console.error('Modal opened without item data')
      setViewModal({show: false, item: null})
    }
  }, [viewModal])
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const loadUserItems = async () => {
    try {
      const items = await api.get('/api/items/my-items')
      setMyItems(Array.isArray(items) ? items : [])
      setError('')
    } catch (err: any) {
      console.error('Failed to load user items:', err)
      setError(err.message || 'Failed to load your items')
    }
  }

  const loadPotentialMatches = async () => {
    try {
      const matches = await api.get('/api/items/potential-matches')
      setPotentialMatches(Array.isArray(matches) ? matches : [])
    } catch (err) {
      console.error('Error loading potential matches:', err)
      setPotentialMatches([])
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/items/${deleteModal.item._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setMyItems(prev => prev.filter(item => item._id !== deleteModal.item!._id))
        setDeleteModal({show: false, item: null})
      } else {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        alert(`Failed to delete item: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Error deleting item')
    }
  }

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      console.log('🔍 Dashboard: Checking authentication...')
      
      if (!isAuthenticated()) {
        console.log('❌ Dashboard: Not authenticated, redirecting to login')
        window.location.href = '/login'
        return
      }
      
      console.log('✅ Dashboard: User is authenticated')
      const userData = getUserData()
      console.log('👤 Dashboard: User data:', userData)
      setUser(userData)
      
      // Redirect staff users to staff portal
      if (userData?.role === 'staff') {
        console.log('🏢 Dashboard: Staff user, redirecting to staff portal')
        window.location.href = '/staff'
        return
      }
      
      // Redirect admin users to admin portal
      if (userData?.role === 'admin') {
        console.log('👑 Dashboard: Admin user, redirecting to admin portal')
        window.location.href = '/admin'
        return
      }
      
      console.log('📚 Dashboard: Student user, loading dashboard data...')
      await loadUserItems()
      await loadPotentialMatches()
      
      // Initialize socket connection for chat
      socketManager.connect()
      
      setLoading(false)
      console.log('✅ Dashboard: Fully loaded')
    }

    const handleItemSubmitted = () => {
      console.log('Item submitted event received, reloading items...')
      loadUserItems()
      loadPotentialMatches()
    }
    
    window.addEventListener('itemSubmitted', handleItemSubmitted)
    checkAuthAndLoadData()
    
    // Also listen for storage events in case of multiple tabs
    const handleStorageChange = () => {
      loadUserItems()
      loadPotentialMatches()
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('itemSubmitted', handleItemSubmitted)
      window.removeEventListener('storage', handleStorageChange)
      socketManager.disconnect()
    }
  }, [])

  const lostItems = myItems.filter(item => item.status === 'lost')
  const foundItems = myItems.filter(item => item.status === 'found')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mcc-text-primary font-serif mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Manage your lost and found reports from your dashboard
          </p>
          

        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={() => {
                setError('')
                loadUserItems()
                loadPotentialMatches()
              }}
              className="mt-2 text-red-600 underline text-sm hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="mcc-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Lost Items</p>
                    <p className="text-xl font-bold text-red-600">{lostItems.length}</p>
                  </div>
                  <Search className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Found Items</p>
                    <p className="text-xl font-bold text-green-600">{foundItems.length}</p>
                  </div>
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Reports</p>
                    <p className="text-xl font-bold mcc-text-primary">{myItems.length}</p>
                  </div>
                  <MessageCircle className="w-6 h-6 mcc-text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="mcc-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/report-lost">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Report Lost</p>
                      <p className="text-xl font-bold text-red-600">+</p>
                    </div>
                    <Search className="w-6 h-6 text-red-600" />
                  </div>
                </Link>
                <Link href="/report-found">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Report Found</p>
                      <p className="text-xl font-bold text-green-600">+</p>
                    </div>
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                </Link>
                <Link href="/browse">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Browse Items</p>
                      <p className="text-xl font-bold mcc-text-primary">→</p>
                    </div>
                    <Eye className="w-6 h-6 mcc-text-primary" />
                  </div>
                </Link>
                <Link href="/browse?ai=true">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-600">AI Search</p>
                      <p className="text-xl font-bold text-purple-600">✨</p>
                    </div>
                    <Search className="w-6 h-6 text-purple-600" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <AIMatches />
            
            <Card className="mcc-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Text-Based Matches
                </CardTitle>
                <CardDescription>
                  Items that might match based on description keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                {potentialMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No potential matches found yet</p>
                    <p className="text-sm text-gray-500">We'll notify you when similar items are reported</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {potentialMatches.map((item) => (
                      <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            {(item.itemImageUrl || item.imageUrl) && (
                              <img 
                                src={item.itemImageUrl || item.imageUrl} 
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{item.title}</h3>
                                <Badge className={item.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                                  {item.status === 'lost' ? 'Lost' : 'Found'}
                                </Badge>
                                {item.matchScore && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.matchScore >= 60 ? '🔥 High Match' : 
                                     item.matchScore >= 40 ? '⭐ Good Match' : 
                                     '💡 Possible Match'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.date || item.createdAt).toLocaleDateString()}
                                </div>
                                {item.matchScore && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <span className="text-xs font-medium">Match: {item.matchScore}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                console.log('View clicked for:', item.title)
                                setViewModal({show: true, item})
                              }}
                              className="min-w-[80px]"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mcc-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-red-600" />
                  My Lost Items
                </CardTitle>
                <CardDescription>
                  Items you've reported as lost
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lostItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No lost items reported</p>
                    <Link href="/report-lost">
                      <Button className="bg-red-500 hover:bg-red-600 text-white">
                        Report Lost Item
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lostItems.map((item) => (
                      <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            {(item.itemImageUrl || item.imageUrl) && (
                              <img 
                                src={item.itemImageUrl || item.imageUrl} 
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{item.title}</h3>
                                <Badge className="bg-red-500 text-white">Lost</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setViewModal({show: true, item})}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteModal({show: true, item})}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mcc-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  My Found Items
                </CardTitle>
                <CardDescription>
                  Items you've reported as found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {foundItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No found items reported</p>
                    <Link href="/report-found">
                      <Button className="bg-green-500 hover:bg-green-600 text-white">
                        Report Found Item
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {foundItems.map((item) => (
                      <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            {(item.itemImageUrl || item.imageUrl) && (
                              <img 
                                src={item.itemImageUrl || item.imageUrl} 
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{item.title}</h3>
                                <Badge className="bg-green-500 text-white">Found</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {item.date && new Date(item.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setViewModal({show: true, item})}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteModal({show: true, item})}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ItemDetailModal 
        item={viewModal.item}
        isOpen={viewModal.show}
        onClose={() => setViewModal({show: false, item: null})}
        onStartChat={(item) => {
          console.log('Starting chat for item:', item.title)
          try {
            // Initialize socket connection if not already connected
            if (!socketManager.isConnected()) {
              console.log('Connecting to chat server...')
              socketManager.connect()
            }
            
            // Create or find chat room for this item
            const chatRoom = { 
              item, 
              participants: [user?.id, item.reportedBy?._id],
              roomId: `item_${item._id}`,
              title: `Chat about: ${item.title}`
            }
            
            setSelectedChatRoom(chatRoom)
            setShowChat(true)
            setViewModal({show: false, item: null})
          } catch (error) {
            console.error('Failed to start chat:', error)
            alert('Chat system is currently unavailable. Please try email contact.')
          }
        }}
      />
      
      {/* Chat Window */}
      {showChat && selectedChatRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Chat about: {selectedChatRoom.item?.title}</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowChat(false)
                  setSelectedChatRoom(null)
                }}
              >
                Close
              </Button>
            </div>
            <ChatWindow 
              room={selectedChatRoom}
              onClose={() => {
                setShowChat(false)
                setSelectedChatRoom(null)
              }}
              currentUserId={user?.id || ''}
            />
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Delete Item</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete the item. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModal({show: false, item: null})}
              >
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <FloatingChat />
      </div>
    </ErrorBoundary>
  )
}