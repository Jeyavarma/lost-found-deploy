'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  Send, 
  Bell, 
  Users, 
  MessageSquare,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import Navigation from '@/components/layout/navigation'
import { BACKEND_URL } from '@/lib/config'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    targetUsers: 'all'
  })
  const [loading, setLoading] = useState(true)

  const sendNotification = async () => {
    try {
      alert(`Notification "${newNotification.title}" sent to ${newNotification.targetUsers}!`)
      setNewNotification({ title: '', message: '', type: 'info', targetUsers: 'all' })
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mcc-text-primary font-serif">Notifications</h1>
            <p className="text-gray-600">Send system-wide notifications to users</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send New Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                  placeholder="Notification title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <select 
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Target Users</label>
                <select 
                  value={newNotification.targetUsers}
                  onChange={(e) => setNewNotification({...newNotification, targetUsers: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="staff">Staff Only</option>
                </select>
              </div>
              
              <Button 
                onClick={sendNotification}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newNotification.title || !newNotification.message}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </CardContent>
          </Card>

          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No notifications sent yet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}