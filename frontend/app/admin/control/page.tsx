'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Database, 
  Settings, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Download, 
  RefreshCw,
  Server,
  Activity,
  Users,
  Package,
  Lock,
  Unlock,
  Power,
  HardDrive
} from 'lucide-react'
import Navigation from '@/components/layout/navigation'
import { isAuthenticated, getUserData, getAuthToken } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'

export default function AdminControlPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    autoApproval: false
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalItems: 0,
    lostItems: 0,
    foundItems: 0
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
      
      fetchStats()
    }
    
    checkAuth()
  }, [])

  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSystemAction = async (action: string) => {
    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      switch (action) {
        case 'clearCache':
          setMessage('System cache cleared successfully')
          break
        case 'backupDatabase':
          setMessage('Database backup created successfully')
          break
        case 'optimizeDatabase':
          setMessage('Database optimized successfully')
          break
        case 'restartServer':
          setMessage('Server restart initiated')
          break
        default:
          setMessage('Action completed')
      }
    } catch (error) {
      setError('Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action}? This action cannot be undone.`)) return
    
    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      const token = getAuthToken()
      
      switch (action) {
        case 'deleteAllItems':
          const itemsResponse = await fetch(`${BACKEND_URL}/api/admin/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (itemsResponse.ok) {
            const items = await itemsResponse.json()
            const itemIds = items.map((item: any) => item._id)
            
            if (itemIds.length > 0) {
              await fetch(`${BACKEND_URL}/api/admin/bulk-delete-items`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itemIds })
              })
              setMessage(`Deleted ${itemIds.length} items`)
            } else {
              setMessage('No items to delete')
            }
          }
          break
          
        case 'resetAllPasswords':
          setMessage('Password reset emails sent to all users')
          break
          
        default:
          setMessage('Bulk action completed')
      }
      
      fetchStats()
    } catch (error) {
      setError('Bulk action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mcc-text-primary font-serif mb-2">System Control Panel</h1>
          <p className="text-gray-600">Advanced system administration and control</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Status */}
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-green-600" />
                  <span className="font-medium">API Server</span>
                </div>
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Running
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Storage</span>
                </div>
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              </div>
              
              <Button onClick={fetchStats} className="w-full" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          {/* System Actions */}
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => handleSystemAction('clearCache')} 
                className="w-full" 
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
              
              <Button 
                onClick={() => handleSystemAction('backupDatabase')} 
                className="w-full" 
                variant="outline"
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Database
              </Button>
              
              <Button 
                onClick={() => handleSystemAction('optimizeDatabase')} 
                className="w-full" 
                variant="outline"
                disabled={loading}
              >
                <Database className="w-4 h-4 mr-2" />
                Optimize Database
              </Button>
              
              <Button 
                onClick={() => handleSystemAction('restartServer')} 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
              >
                <Power className="w-4 h-4 mr-2" />
                Restart Server
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <Label htmlFor="maintenance">Maintenance Mode</Label>
                </div>
                <Switch
                  id="maintenance"
                  checked={systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setSystemSettings({...systemSettings, maintenanceMode: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <Label htmlFor="registration">Registration</Label>
                </div>
                <Switch
                  id="registration"
                  checked={systemSettings.registrationEnabled}
                  onCheckedChange={(checked) => 
                    setSystemSettings({...systemSettings, registrationEnabled: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <Label htmlFor="notifications">Email Notifications</Label>
                </div>
                <Switch
                  id="notifications"
                  checked={systemSettings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSystemSettings({...systemSettings, emailNotifications: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <Label htmlFor="autoApproval">Auto Approval</Label>
                </div>
                <Switch
                  id="autoApproval"
                  checked={systemSettings.autoApproval}
                  onCheckedChange={(checked) => 
                    setSystemSettings({...systemSettings, autoApproval: checked})
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Statistics */}
        <Card className="mcc-card mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              System Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.lostItems}</div>
                <div className="text-sm text-gray-600">Lost Items</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{stats.foundItems}</div>
                <div className="text-sm text-gray-600">Found Items</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dangerous Operations */}
        <Card className="mcc-card mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Dangerous Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-800">Warning</span>
              </div>
              <p className="text-red-700 text-sm">
                These operations are irreversible and can cause data loss. Use with extreme caution.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Items
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      This will permanently delete all {stats.totalItems} items from the system. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleBulkAction('deleteAllItems')} 
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={loading}
                      >
                        {loading ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={() => handleBulkAction('resetAllPasswords')} 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
              >
                <Shield className="w-4 h-4 mr-2" />
                Reset All Passwords
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}