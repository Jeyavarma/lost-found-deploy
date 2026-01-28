"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, User, GraduationCap, CheckCircle, Home } from "lucide-react"
import Image from "next/image"
import Navigation from "@/components/layout/navigation"

const categories = ["ID Card", "Mobile Phone", "Laptop", "Wallet", "Keys", "Books", "Clothing", "Jewelry", "Other"]

const culturalEvents = [
  "Deepwoods",
  "Moonshadow",
  "Octavia",
  "Barnes Hall Day",
  "Martin Hall Day",
  "Games Fury",
  "Founders Day",
  "Other"
];

export default function ReportLostPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [itemImage, setItemImage] = useState<File | null>(null)
  const [locationImage, setLocationImage] = useState<File | null>(null)
  const [itemImagePreview, setItemImagePreview] = useState<string>("") 
  const [locationImagePreview, setLocationImagePreview] = useState<string>("") 
  const [hasCulturalEvent, setHasCulturalEvent] = useState(false)

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { isAuthenticated: checkIsAuth, getAuthToken, validateToken } = await import('@/lib/auth')
      const authenticated = checkIsAuth()
      const token = getAuthToken()
      
      if (authenticated && token) {
        // Validate token with backend
        const isValid = await validateToken(token)
        if (isValid) {
          setIsAuthenticated(true)
        } else {
          // Token is invalid, clear it
          const { logout } = await import('@/lib/auth')
          logout()
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    }
    
    checkAuth()
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Don't redirect immediately, let user see the login prompt
      return
    }
  }, [isAuthenticated])

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    categoryOther: "",
    description: "",
    location: "",
    date: "",
    time: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    culturalEvent: "",
    culturalEventOther: "",
    event: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) return
    
    // Check authentication requirement for lost items
    if (!isAuthenticated) {
      alert('Please login to report a lost item. This helps us track your reports and notify you when items are found.')
      window.location.href = '/login'
      return
    }
    
    // Validate required fields
    if (!formData.title || !formData.category || !formData.description || !formData.location || !formData.date || !formData.contactName || !formData.contactEmail) {
      alert('Please fill in all required fields marked with *')
      return
    }
    
    setIsSubmitting(true)
    
    const submitData = new FormData()
    submitData.append('status', 'lost')
    Object.entries(formData).forEach(([key, value]) => {
      if (value) submitData.append(key, value)
    })
    
    if (itemImage) {
      submitData.append('itemImage', itemImage)
    }
    if (locationImage) {
      submitData.append('locationImage', locationImage)
    }
    
    console.log('🔴 LOST ITEM REQUEST:')
    console.log('📦 Form Data:', Object.fromEntries(submitData.entries()))
    console.log('🔐 Auth state check - isAuthenticated:', isAuthenticated)
    
    try {
      const { getAuthToken } = await import('@/lib/auth')
      const token = getAuthToken()
      const headers: Record<string, string> = {}
      
      console.log('🔑 Token for submission:', token ? `EXISTS (${token.substring(0, 20)}...)` : 'MISSING')
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        console.log('📡 Authorization header set with Bearer token')
      } else {
        console.log('⚠️ WARNING: No token available for submission!')
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/items` : '/api/items'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: submitData
      })
      
      console.log('📡 Response:', response.status, response.statusText)
      const responseText = await response.text()
      console.log('📄 Response body:', responseText)
      
      if (response.ok) {
        setShowSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 3000)
      } else {
        console.error('❌ Backend error:', responseText)
        alert(`Error submitting report: ${responseText}`)
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      alert('Error connecting to server. Please check your internet connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Validate time if it's a time field and date is today
    if (field === 'time' && formData.date) {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)
      
      if (formData.date === today && value > currentTime) {
        alert('Cannot select a future time for today. Please select a time that has already passed.')
        return
      }
    }
    
    // Validate date and reset time if date changes to today with future time
    if (field === 'date') {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)
      
      if (value === today && formData.time > currentTime) {
        setFormData(prev => ({ ...prev, [field]: value, time: '' }))
        return
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCulturalEventChange = (checked: boolean) => {
    setHasCulturalEvent(checked)
    if (!checked) {
      setFormData(prev => ({ ...prev, culturalEvent: "", culturalEventOther: "", event: "" }))
    }
  }

  const handleCulturalEventSelect = (value: string) => {
    handleInputChange("culturalEvent", value)
    // Map cultural event to event field for backend
    if (value !== "Other") {
      handleInputChange("event", value)
    }
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new window.Image()
      
      img.onload = () => {
        const maxWidth = 600
        const maxHeight = 400
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        }, 'image/jpeg', 0.7)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'location') => {
    const file = e.target.files?.[0]
    if (file) {
      const compressedFile = await compressImage(file)
      const reader = new FileReader()
      reader.onload = () => {
        if (type === 'item') {
          setItemImage(compressedFile)
          setItemImagePreview(reader.result as string)
        } else {
          setLocationImage(compressedFile)
          setLocationImagePreview(reader.result as string)
        }
      }
      reader.readAsDataURL(compressedFile)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {!isLoading && !isAuthenticated && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="mcc-card border-2 border-red-500">
            <CardHeader className="bg-red-100 border-b border-red-300">
              <CardTitle className="text-red-800 font-serif flex items-center gap-2">
                <User className="w-5 h-5" />
                Login Required
              </CardTitle>
              <CardDescription className="text-red-700 font-medium">
                You must be logged in to report a lost item. This helps us track your reports and notify you when items are found.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Link href="/login">
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                    <User className="w-4 h-4 mr-2" />
                    Login to Continue
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {isLoading && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="mcc-card">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking authentication...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mcc-card border-2 border-brand-primary/20">
          <CardHeader className="bg-red-50/50">
            <CardTitle className="text-2xl sm:text-3xl text-red-700 font-serif">Report a Lost Item</CardTitle>
            <CardDescription className="text-brand-text-dark">Lost something? Fill out this form and we'll help you find it.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {!isAuthenticated && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 font-medium text-center">
                    Please login first to report a lost item. The form below will be enabled after login.
                  </p>
                </div>
              )}
              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80">
                <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">1. Item Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="title" className="font-medium">Item Name <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mt-1">A short, clear title.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="e.g., iPhone 14, Blue Backpack, Car Keys"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="category" className="font-medium">Category <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mt-1">Helps in classifying the item.</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="space-y-3">
                      <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {formData.category === "Other" && (
                        <Input
                          value={formData.categoryOther}
                          onChange={(e) => handleInputChange("categoryOther", e.target.value)}
                          placeholder="Please specify the category"
                          required
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="description" className="font-medium">Description <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mt-1">Be as detailed as possible.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Provide a detailed description including color, brand, size, distinctive, etc."
                      rows={4}
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200/80 pt-6 mt-6">
                  <Label className="font-medium mb-4 block">Upload Images</Label>
                  <p className="text-xs text-gray-500 mb-4">Photos help identify the item and location.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Photo */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Item Photo <span className="text-red-500">*</span></Label>
                      <label htmlFor="itemImage" className="cursor-pointer block">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-primary transition-colors">
                          {itemImagePreview ? (
                            <>
                              <Image src={itemImagePreview} alt="Item Preview" className="h-32 w-full object-cover rounded-lg mb-2" width={200} height={128} />
                              <p className="text-xs text-gray-500">Click to change</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-600">Click to upload</p>
                              <p className="text-xs text-gray-500">Auto-compressed &lt; 1MB</p>
                            </>
                          )}
                        </div>
                        <Input 
                          id="itemImage" 
                          type="file" 
                          className="hidden" 
                          accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp" 
                          onChange={(e) => handleImageChange(e, 'item')}
                        />
                      </label>
                    </div>
                    
                    {/* Location Photo */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Location Photo (Optional)</Label>
                      <label htmlFor="locationImage" className="cursor-pointer block">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-primary transition-colors">
                          {locationImagePreview ? (
                            <>
                              <Image src={locationImagePreview} alt="Location Preview" className="h-32 w-full object-cover rounded-lg mb-2" width={200} height={128} />
                              <p className="text-xs text-gray-500">Click to change</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-600">Click to upload</p>
                              <p className="text-xs text-gray-500">Auto-compressed &lt; 1MB</p>
                            </>
                          )}
                        </div>
                        <Input 
                          id="locationImage" 
                          type="file" 
                          className="hidden" 
                          accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp" 
                          onChange={(e) => handleImageChange(e, 'location')}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80">
                <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">2. Where & When It Was Lost</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="location" className="font-medium">Lost Location <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mt-1">Where was the item lost?</p>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="e.g., Near Library Entrance, Cafeteria Table 5, Physics Lab"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label className="font-medium">Date & Time Lost <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mt-1">When was it lost?</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="date" className="text-sm">Date <span className="text-red-500">*</span></Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleInputChange("date", e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="text-sm">Time (Around)</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleInputChange("time", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label className="font-medium">Related Cultural Event</Label>
                    <p className="text-xs text-gray-500 mt-1">Was this lost during an event?</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="hasCulturalEvent"
                          checked={hasCulturalEvent}
                          onChange={(e) => handleCulturalEventChange(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="hasCulturalEvent" className="text-sm">Yes, lost during a cultural event</Label>
                      </div>
                      
                      {hasCulturalEvent && (
                        <div className="space-y-3">
                          <Select value={formData.culturalEvent} onValueChange={handleCulturalEventSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                              {culturalEvents.map((event) => (
                                <SelectItem key={event} value={event}>
                                  {event}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {formData.culturalEvent === "Other" && (
                            <Input
                              value={formData.culturalEventOther}
                              onChange={(e) => handleInputChange("culturalEventOther", e.target.value)}
                              placeholder="Please specify the event"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80">
                <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">3. Your Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="contactName" className="font-medium">Your Name <span className="text-red-500">*</span></Label>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange("contactName", e.target.value)}
                      placeholder="Full Name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="contactEmail" className="font-medium">Email Address <span className="text-red-500">*</span></Label>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                      placeholder="your.email@college.edu"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                  <div className="md:col-span-1">
                    <Label htmlFor="contactPhone" className="font-medium">Phone Number</Label>
                    <p className="text-xs text-gray-500 mt-1">Optional, for faster contact.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={!isAuthenticated || isSubmitting}
                  className={`px-8 py-3 font-medium rounded-lg shadow-lg ${
                    isAuthenticated && !isSubmitting
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : isAuthenticated ? 'Report Lost Item' : 'Login Required'}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                By submitting, you agree to be contacted by the person who finds your item.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2 font-serif">Success!</h3>
            <p className="text-gray-600 mb-6">Lost item reported successfully! We will notify you if someone finds it.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">Redirecting automatically in 3 seconds...</p>
          </div>
        </div>
      )}
    </div>
  )
}