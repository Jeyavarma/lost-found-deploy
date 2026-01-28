"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle,
  X,
  Eye,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
} from "lucide-react"

export default function StaffVerifyPage() {
  const [items, setItems] = useState([
    {
      id: 1,
      title: "iPhone 14 Pro",
      description: "Black iPhone with cracked screen, found in library",
      category: "Electronics",
      location: "Main Library - Study Hall",
      reportedBy: "Ananya Krishnan",
      studentId: "21CS001",
      timeAgo: "2 hours ago",
      imageUrl: "/placeholder.svg",
      status: "pending",
      verificationNotes: ""
    },
    {
      id: 2,
      title: "Gold Chain Necklace", 
      description: "Thin gold chain with small pendant, found near cafeteria",
      category: "Personal Items",
      location: "Cafeteria - Main Entrance",
      reportedBy: "Rahul Sharma",
      studentId: "21EC045",
      timeAgo: "4 hours ago",
      imageUrl: "/placeholder.svg",
      status: "pending",
      verificationNotes: ""
    }
  ])

  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [verificationNotes, setVerificationNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const handleVerify = (itemId: number, action: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: action, verificationNotes }
        : item
    ))
    setSelectedItem(null)
    setVerificationNotes("")
  }

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reportedBy.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingItems = filteredItems.filter(item => item.status === 'pending')
  const verifiedItems = filteredItems.filter(item => item.status === 'verified')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-green-600 border-b-4 border-green-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/staff" className="flex items-center gap-2 text-white hover:text-green-100">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Item Verification</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Item Verification</h1>
          <p className="text-gray-600 mt-2">Review and verify student-reported items</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items, descriptions, or reporters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Pending Verification ({pendingItems.length})
            </CardTitle>
            <CardDescription>Items waiting for staff verification</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No items pending verification</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingItems.map((item) => (
                  <Card key={item.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                              <Badge variant="outline" className="text-xs mb-2">
                                {item.category}
                              </Badge>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">
                              Pending
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{item.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{item.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{item.reportedBy} ({item.studentId})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{item.timeAgo}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleVerify(item.id, 'verified')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleVerify(item.id, 'rejected')}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verified Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recently Verified ({verifiedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verifiedItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No verified items yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {verifiedItems.map((item) => (
                  <Card key={item.id} className="border border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div>
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-gray-600">{item.reportedBy}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Review Item</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-2">{selectedItem.title}</h4>
                    <Badge variant="outline" className="mb-2">
                      {selectedItem.category}
                    </Badge>
                    <p className="text-gray-600">{selectedItem.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-sm text-gray-600">{selectedItem.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Reported By</p>
                    <p className="text-sm text-gray-600">{selectedItem.reportedBy}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any notes about this verification..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleVerify(selectedItem.id, 'rejected')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleVerify(selectedItem.id, 'verified')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verify Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}