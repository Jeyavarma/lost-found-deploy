'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Package, 
  Settings, 
  BarChart3,
  Shield,
  UserPlus,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Key,
  RefreshCw,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileCheck,
  XCircle,
  Search,
  Server
} from 'lucide-react'
import Link from 'next/link'
import Navigation from '@/components/layout/navigation'
import { isAuthenticated, getUserData, getAuthToken, type User } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'

interface AdminStats {
  totalUsers: number
  totalItems: number
  lostItems: number
  foundItems: number
  pendingClaims: number
  verifiedClaims: number
}

interface Item {
  _id: string
  title: string
  description: string
  category: string
  status: 'lost' | 'found' | 'claimed' | 'verified'
  location: string
  createdAt: string
  itemImageUrl?: string
  imageUrl?: string
  reportedBy?: {
    _id: string
    name: string
    email: string
  }
  claimedBy?: {
    _id: string
    name: string
    email: string
  }
  claimDate?: string
  verificationStatus?: 'pending' | 'approved' | 'rejected'
  adminNotes?: string
}

interface Claim {
  _id: string
  itemId: string
  claimantId: string
  ownershipProof: string
  additionalInfo: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  item: Item
  claimant: {
    name: string
    email: string
  }
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalItems: 0,
    lostItems: 0,
    foundItems: 0,
    pendingClaims: 0,
    verifiedClaims: 0
  })
  const [recentItems, setRecentItems] = useState<Item[]>([])
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showClaimDetails, setShowClaimDetails] = useState<Claim | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    studentId: '',
    department: ''
  })
  const [resetEmail, setResetEmail] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [showEditUser, setShowEditUser] = useState(false)
  const [editUserData, setEditUserData] = useState({
    _id: '',
    name: '',
    email: '',
    role: 'student',
    phone: '',
    studentId: '',
    department: '',
    year: '',
    shift: ''
  })
  const [showEditItem, setShowEditItem] = useState(false)
  const [editItemData, setEditItemData] = useState({
    _id: '',
    title: '',
    description: '',
    category: '',
    status: '',
    location: '',
    contactInfo: ''
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
      
      setUser(userData)
      fetchAdminData()
    }
    
    checkAuth()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    setError('')
    try {
      const token = getAuthToken()
      console.log('🔗 Backend URL:', BACKEND_URL)
      console.log('🔑 Token:', token ? 'Present' : 'Missing')
      
      console.log('📊 Fetching admin data...')
      
      // Fetch live data from backend
      console.log('📊 Fetching admin stats...')
      const statsResponse = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('📊 Stats response:', statsResponse.status)
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('✅ Stats data received:', statsData)
        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalItems: statsData.totalItems || 0,
          lostItems: statsData.lostItems || 0,
          foundItems: statsData.foundItems || 0,
          pendingClaims: statsData.pendingItems || 0,
          verifiedClaims: statsData.resolvedItems || 0
        })
      } else {
        const errorText = await statsResponse.text()
        console.error('❌ Stats API error:', errorText)
        setError(`Stats API failed: ${statsResponse.status} - ${errorText}`)
        return
      }
      
      // Fetch recent items
      console.log('📦 Fetching recent items...')
      const itemsResponse = await fetch(`${BACKEND_URL}/api/admin/recent-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('📦 Items response:', itemsResponse.status)
      
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        console.log('✅ Items data received:', itemsData?.length || 0, 'items')
        setRecentItems(itemsData || [])
      } else {
        const errorText = await itemsResponse.text()
        console.error('⚠️ Items API error (non-critical):', errorText)
      }
      
      // Fetch pending claims
      console.log('⏳ Fetching pending claims...')
      const claimsResponse = await fetch(`${BACKEND_URL}/api/admin/claims/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('⏳ Claims response:', claimsResponse.status)
      
      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json()
        console.log('✅ Claims data received:', claimsData?.length || 0, 'claims')
        // Convert claims to display format
        const formattedClaims = (claimsData || []).map((item: any) => ({
          _id: item._id,
          itemId: item._id,
          claimantId: item.claimedBy?._id || 'unknown',
          ownershipProof: item.ownershipProof || 'No proof provided',
          additionalInfo: item.additionalClaimInfo || item.description,
          status: 'pending',
          createdAt: item.claimDate || item.createdAt,
          item: item,
          claimant: {
            name: item.claimedBy?.name || 'Anonymous',
            email: item.claimedBy?.email || 'unknown@mcc.edu'
          }
        }))
        setPendingClaims(formattedClaims)
      } else {
        console.error('⚠️ Claims API error (non-critical):', claimsResponse.status)
      }
      
      console.log('🎉 Admin data loaded successfully!')
    } catch (error) {
      console.error('💥 Critical error fetching admin data:', error)
      setError(`Network error: ${error}. Check if backend is running at ${BACKEND_URL}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setFormData({ name: '', email: '', password: '', role: 'student', phone: '', studentId: '', department: '' })
        setShowCreateUser(false)
        fetchAdminData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create user')
      }
    } catch (error) {
      setError('Failed to create user')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: resetEmail, newPassword: Math.random().toString(36).slice(-12) + 'MCC@' + new Date().getFullYear() })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setResetEmail('')
        setShowResetPassword(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Failed to reset password')
    }
  }

  const handleClaimAction = async (claimId: string, action: 'approve' | 'reject') => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/claims/${claimId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setPendingClaims(prev => prev.filter(claim => claim._id !== claimId))
        setShowClaimDetails(null)
        setAdminNotes('')
        fetchAdminData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${action} claim`)
      }
    } catch (error) {
      setError(`Failed to ${action} claim`)
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
        setRecentItems(prev => prev.filter(item => item._id !== itemId))
        fetchAdminData()
      } else {
        setError('Failed to delete item')
      }
    } catch (error) {
      setError('Failed to delete item')
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${editUserData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editUserData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setShowEditUser(false)
        setEditUserData({ _id: '', name: '', email: '', role: 'student', phone: '', studentId: '', department: '', year: '', shift: '' })
        fetchAdminData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update user')
      }
    } catch (error) {
      setError('Failed to update user')
    }
  }

  const openEditUser = async (userId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setEditUserData({
          _id: userData._id,
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || 'student',
          phone: userData.phone || '',
          studentId: userData.studentId || '',
          department: userData.department || '',
          year: userData.year || '',
          shift: userData.shift || ''
        })
        setShowEditUser(true)
      } else {
        setError('Failed to fetch user details')
      }
    } catch (error) {
      setError('Failed to fetch user details')
    }
  }

  const handleEditItem = (item: Item) => {
    setEditItemData({
      _id: item._id,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      location: item.location,
      contactInfo: item.reportedBy?.email || ''
    })
    setShowEditItem(true)
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/items/${editItemData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editItemData)
      })
      
      if (response.ok) {
        setMessage('Item updated successfully')
        setShowEditItem(false)
        setEditItemData({ _id: '', title: '', description: '', category: '', status: '', location: '', contactInfo: '' })
        fetchAdminData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update item')
      }
    } catch (error) {
      setError('Failed to update item')
    }
  }

  if (loading && stats.totalUsers === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mcc-text-primary font-serif mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage the MCC Lost & Found system
          </p>
        </div>

        {message && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              <p className="text-sm text-gray-600">Users</p>
            </CardContent>
          </Card>
          
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{stats.totalItems}</p>
              <p className="text-sm text-gray-600">Items</p>
            </CardContent>
          </Card>
          
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <Search className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{stats.lostItems}</p>
              <p className="text-sm text-gray-600">Lost</p>
            </CardContent>
          </Card>
          
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{stats.foundItems}</p>
              <p className="text-sm text-gray-600">Found</p>
            </CardContent>
          </Card>
          
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{stats.pendingClaims}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card className="mcc-card">
            <CardContent className="p-4 text-center">
              <FileCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{stats.verifiedClaims}</p>
              <p className="text-sm text-gray-600">Verified</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
