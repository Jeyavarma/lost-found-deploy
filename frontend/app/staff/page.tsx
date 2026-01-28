"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Search,
  Plus,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  GraduationCap,
  Settings,
  LogOut,
  Bell,
  Filter,
  BarChart3,
} from "lucide-react"

export default function StaffDashboard() {
  const [staffStats] = useState({
    itemsHelped: 45,
    studentsAssisted: 128,
    itemsVerified: 23,
    pendingReviews: 8,
  })
  
  const [recentActivity] = useState([
    {
      id: 1,
      type: "verification",
      item: "iPhone 13 Pro",
      student: "Priya S.",
      time: "2 hours ago",
      status: "verified"
    },
    {
      id: 2,
      type: "assistance", 
      item: "Chemistry Textbook",
      student: "Rahul M.",
      time: "4 hours ago",
      status: "helped"
    }
  ])

  const [pendingItems] = useState([
    {
      id: 1,
      title: "MacBook Air",
      category: "Electronics",
      location: "Library Study Hall",
      reportedBy: "Ananya K.",
      timeAgo: "1 hour ago",
      needsVerification: true
    },
    {
      id: 2,
      title: "Gold Chain",
      category: "Personal Items", 
      location: "Cafeteria",
      reportedBy: "Staff Member",
      timeAgo: "3 hours ago",
      needsVerification: false
    }
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-green-600 border-b-4 border-green-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-700 rounded-lg flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white font-serif">MCC Lost & Found</span>
                  <span className="text-xs text-green-100 font-medium">Staff Portal</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:bg-green-600">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" className="text-white hover:bg-green-600">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" className="text-white hover:bg-green-600">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Staff Dashboard</h1>
          <p className="text-gray-600 mt-2">Help students find their lost items and manage campus lost & found</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Helped</p>
                  <p className="text-3xl font-bold text-green-600">{staffStats.itemsHelped}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Students Assisted</p>
                  <p className="text-3xl font-bold text-blue-600">{staffStats.studentsAssisted}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Verified</p>
                  <p className="text-3xl font-bold text-purple-600">{staffStats.itemsVerified}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-3xl font-bold text-orange-600">{staffStats.pendingReviews}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Quick Actions</CardTitle>
                <CardDescription>Common staff tasks and functions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/report-found">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Report Found Item
                  </Button>
                </Link>
                
                <Link href="/browse">
                  <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50">
                    <Search className="w-4 h-4 mr-2" />
                    Search All Items
                  </Button>
                </Link>
                
                <Link href="/staff/verify">
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Eye className="w-4 h-4 mr-2" />
                    Verify Items
                  </Button>
                </Link>
                
                <Button variant="outline" className="w-full border-purple-600 text-purple-600 hover:bg-purple-50">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-2 border-gray-200 mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Recent Activity</CardTitle>
                <CardDescription>Your recent actions and contributions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.item}</p>
                      <p className="text-sm text-gray-600">{activity.student} • {activity.time}</p>
                    </div>
                    <Badge 
                      variant={activity.status === 'verified' ? 'default' : 'secondary'}
                      className={
                        activity.status === 'verified' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pending Items */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Items Needing Attention</CardTitle>
                    <CardDescription>Items that require staff verification or assistance</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingItems.map((item) => (
                    <Card key={item.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{item.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                              {item.needsVerification && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  Needs Verification
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{item.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>Reported by {item.reportedBy}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{item.timeAgo}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {item.needsVerification && (
                              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}