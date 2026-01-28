'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Package, Edit, Trash2, Search, Filter, Eye, Plus, RefreshCw } from 'lucide-react'
import Navigation from '@/components/layout/navigation'
import { isAuthenticated, getUserData, getAuthToken } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'

interface Item {
  _id: string
  title: string
  description: string
  category: string
  status: string
  location: string
  createdAt: string
  reportedBy?: {
    _id: string
    name: string
    email: string
  }
  contactInfo?: string
  imageUrl?: string
  approved: boolean
  flagged: boolean
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: '',
    location: '',
    contactInfo: '',
    approved: true,
    flagged: false
  })

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        window.location.href = '/login'
        return
      }
      
      const userData = getUserData()
      if (userData?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }
      
      fetchItems()
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    let filtered = items
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }
    
    setFilteredItems(filtered)
  }, [items, searchTerm, statusFilter, categoryFilter])

  const fetchItems = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/recent-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      } else {
        setError('Failed to fetch items')
      }
    } catch (error) {
      setError('Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setEditFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      location: item.location,
      contactInfo: item.contactInfo || '',
      approved: item.approved,
      flagged: item.flagged
    })
    setShowEditModal(true)
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/items/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      })
      
      if (response.ok) {
        setMessage('Item updated successfully')
        setShowEditModal(false)
        setEditingItem(null)
        fetchItems()
      } else {
        setError('Failed to update item')
      }
    } catch (error) {
      setError('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        setMessage('Item deleted successfully')
        fetchItems()
      } else {
        setError('Failed to delete item')
      }
    } catch (error) {
      setError('Failed to delete item')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0 || !confirm(`Delete ${selectedItems.length} items?`)) return
    
    try {
      const token = getAuthToken()
      const promises = selectedItems.map(itemId => 
        fetch(`${BACKEND_URL}/api/admin/items/${itemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      )
      
      await Promise.all(promises)
      setMessage(`${selectedItems.length} items deleted successfully`)
      setSelectedItems([])
      fetchItems()
    } catch (error) {
      setError('Failed to delete items')
    }
  }

  const handleApproveItem = async (itemId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/moderate-item/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'approve' })
      })
      
      if (response.ok) {
        setMessage('Item approved successfully')
        fetchItems()
      } else {
        setError('Failed to approve item')
      }
    } catch (error) {
      setError('Failed to approve item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mcc-text-primary font-serif mb-2">Items Management</h1>
          <p className="text-gray-600">Manage all lost and found items</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Card className="mcc-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items ({filteredItems.length})
              </CardTitle>
              <div className="flex gap-2">
                {selectedItems.length > 0 && (
                  <Button onClick={handleBulkDelete} variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedItems.length})
                  </Button>
                )}
                <Button onClick={fetchItems} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="found">Found</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Documents">Documents</SelectItem>
                  <SelectItem value="Keys">Keys</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedItems.includes(item._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems([...selectedItems, item._id])
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item._id))
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <Badge className={
                            item.status === 'lost' ? 'bg-red-500 text-white' :
                            item.status === 'found' ? 'bg-green-500 text-white' :
                            item.status === 'claimed' ? 'bg-orange-500 text-white' :
                            'bg-blue-500 text-white'
                          }>
                            {item.status}
                          </Badge>
                          <Badge variant="outline">{item.category}</Badge>
                          {!item.approved && <Badge className="bg-yellow-500 text-white">Pending</Badge>}
                          {item.flagged && <Badge className="bg-red-600 text-white">Flagged</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{item.reportedBy?.name || 'Anonymous'}</span>
                          <span>{item.location}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!item.approved && (
                        <Button 
                          onClick={() => handleApproveItem(item._id)} 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          Approve
                        </Button>
                      )}
                      <Button onClick={() => handleEditItem(item)} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => handleDeleteItem(item._id)} size="sm" variant="outline" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Item Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input 
                    value={editFormData.title} 
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={editFormData.category} onValueChange={(value) => setEditFormData({...editFormData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Clothing">Clothing</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                      <SelectItem value="Documents">Documents</SelectItem>
                      <SelectItem value="Keys">Keys</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Description *</Label>
                <Textarea 
                  value={editFormData.description} 
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status *</Label>
                  <Select value={editFormData.status} onValueChange={(value) => setEditFormData({...editFormData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="found">Found</SelectItem>
                      <SelectItem value="claimed">Claimed</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input 
                    value={editFormData.location} 
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label>Contact Info</Label>
                <Input 
                  value={editFormData.contactInfo} 
                  onChange={(e) => setEditFormData({...editFormData, contactInfo: e.target.value})} 
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="approved"
                    checked={editFormData.approved}
                    onCheckedChange={(checked) => setEditFormData({...editFormData, approved: !!checked})}
                  />
                  <Label htmlFor="approved">Approved</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="flagged"
                    checked={editFormData.flagged}
                    onCheckedChange={(checked) => setEditFormData({...editFormData, flagged: !!checked})}
                  />
                  <Label htmlFor="flagged">Flagged</Label>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white">
                  Update Item
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}