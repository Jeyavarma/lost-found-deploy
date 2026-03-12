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
import Image from "next/image"
import { Upload, Camera, MapPin, Calendar, Clock, ImageIcon, FileText, CheckCircle, Smartphone, Home, Shield, Package, User, Hash, Loader2, ArrowLeft, GraduationCap, Search } from "lucide-react"
import Navigation from "@/components/layout/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { categories, locations, departments, hostels, culturalEvents } from "@/lib/constants"

export default function ReportFoundPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showOptionalLogin, setShowOptionalLogin] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const [countdown, setCountdown] = useState(3)
  const [isDraggingItem, setIsDraggingItem] = useState(false)
  const [isDraggingLocation, setIsDraggingLocation] = useState(false)
  const [timeError, setTimeError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  const validateStep1 = () => {
    if (!itemImage || !formData.title || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields marked with * and upload an image in Step 1')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.location || !formData.date || !formData.currentLocation) {
      toast.error('Please fill in all required fields marked with * in Step 2')
      return false
    }
    if (timeError) {
      toast.error('Please fix the time error before proceeding')
      return false
    }
    return true
  }

  const [itemImage, setItemImage] = useState<File | null>(null)
  const [locationImage, setLocationImage] = useState<File | null>(null)
  const [itemImagePreview, setItemImagePreview] = useState<string>("")
  const [locationImagePreview, setLocationImagePreview] = useState<string>("")
  const [isCompressingItem, setIsCompressingItem] = useState(false)
  const [isCompressingLocation, setIsCompressingLocation] = useState(false)
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
          setShowOptionalLogin(false)
        } else {
          // Token is invalid, clear it
          const { logout } = await import('@/lib/auth')
          logout()
          setIsAuthenticated(false)
          setShowOptionalLogin(true)
        }
      } else {
        setIsAuthenticated(false)
        setShowOptionalLogin(true)
      }
    }

    checkAuth()
  }, [])

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
    currentLocation: "",
    culturalEvent: "",
    culturalEventOther: "",
    event: "",
  })

  // Check for saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('reportFoundDraft')
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft)
        setFormData(prev => ({ ...prev, ...parsedDraft }))
      } catch (e) {
        console.error('Failed to parse saved draft')
      }
    }
  }, [])

  // Save draft whenever formData changes
  useEffect(() => {
    if (formData.title || formData.description) {
      localStorage.setItem('reportFoundDraft', JSON.stringify(formData))
    }
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) return

    // Validate required fields
    if (!itemImage) {
      toast.error('Please upload an image of the item')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Please enter the item name')
      return
    }

    if (!formData.category) {
      toast.error('Please select a category')
      return
    }

    if (formData.category === 'Other' && !formData.categoryOther.trim()) {
      toast.error('Please specify the category')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (!formData.location.trim()) {
      toast.error('Please enter where the item was found')
      return
    }

    if (!formData.date) {
      toast.error('Please select the date when the item was found')
      return
    }

    if (!formData.currentLocation.trim()) {
      toast.error('Please enter where the item is currently located')
      return
    }

    if (!formData.contactName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!formData.contactEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsSubmitting(true)

    const submitData = new FormData()
    submitData.append('status', 'found')

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value) submitData.append(key, value)
    })

    // Add images - this is required
    if (itemImage) {
      submitData.append('itemImage', itemImage)
    } else {
      toast.error('Please upload an image of the item')
      setIsSubmitting(false)
      return
    }

    if (locationImage) {
      submitData.append('locationImage', locationImage)
    }

    // Get auth token if user is authenticated
    let authHeaders = {}
    if (isAuthenticated) {
      const { getAuthToken } = await import('@/lib/auth')
      const token = getAuthToken()
      if (token) {
        authHeaders = { 'Authorization': `Bearer ${token}` }
      }
    }

    console.log('🔵 FOUND ITEM REQUEST - Sending to backend:')
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/items` : '/api/items'
    console.log('📍 URL:', apiUrl)
    console.log('📝 Method: POST')
    console.log('🔐 Auth:', isAuthenticated ? 'With Token' : 'Anonymous')
    console.log('📋 Form Data entries:', Object.fromEntries(submitData.entries()))

    try {
      // Bypass the standard Next.js JSON api proxy and use our dedicated Upload Streaming Proxy
      const response = await fetch('/api/proxy-upload', {
        method: 'POST',
        headers: authHeaders,
        body: submitData
      })

      console.log('✅ FOUND ITEM RESPONSE:', response)

      if (response.ok) {
        // Clear draft on successful submission
        localStorage.removeItem('reportFoundDraft')
        setShowSuccess(true)
        // Trigger data refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('itemSubmitted', { detail: { type: 'found' } }))
        let count = 3
        const interval = setInterval(() => {
          count -= 1
          setCountdown(count)
          if (count <= 0) {
            clearInterval(interval)
            window.location.href = isAuthenticated ? '/dashboard' : '/'
          }
        }, 1000)
      } else {
        console.error('❌ Backend logic error')
        toast.error('Error submitting report. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ Network or Server error:', error)
      console.error('Server connection error:', error);
      toast.error('Error connecting to server. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    let error = ""
    if (field === 'contactEmail' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Please enter a valid email address."
      } else if (!value.endsWith('@mcc.edu.in')) {
        error = "Please use your official MCC email (@mcc.edu.in)."
      }
    } else if (field === 'contactPhone' && value && !/^\+?[\d\s-()]{10,}$/.test(value)) {
      error = "Please enter a valid phone number."
    }

    setFieldErrors(prev => ({ ...prev, [field]: error }))

    // Validate time if it's a time field and date is today
    if (field === 'time' && formData.date) {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)

      if (formData.date === today && value > currentTime) {
        setTimeError('Select a past time for today.')
      } else {
        setTimeError('')
      }
    }

    // Validate date and reset time error if date changes
    if (field === 'date') {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)

      if (value === today && formData.time && formData.time > currentTime) {
        setTimeError('Select a past time for today.')
      } else {
        setTimeError('')
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const processImage = async (file: File, type: 'item' | 'location') => {
    if (type === 'item') setIsCompressingItem(true)
    else setIsCompressingLocation(true)

    try {
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
    } catch (error) {
      toast.error('Failed to process image')
    } finally {
      if (type === 'item') setIsCompressingItem(false)
      else setIsCompressingLocation(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'location') => {
    const file = e.target.files?.[0]
    if (file) {
      await processImage(file, type)
    }
  }

  const handleDragOver = (e: React.DragEvent, type: 'item' | 'location') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'item') setIsDraggingItem(true)
    else setIsDraggingLocation(true)
  }

  const handleDragLeave = (e: React.DragEvent, type: 'item' | 'location') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'item') setIsDraggingItem(false)
    else setIsDraggingLocation(false)
  }

  const handleDrop = async (e: React.DragEvent, type: 'item' | 'location') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'item') setIsDraggingItem(false)
    else setIsDraggingLocation(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      await processImage(file, type)
    } else if (file) {
      toast.error('Please drop a valid image file')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {showOptionalLogin && !isAuthenticated && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="mcc-card border-2 border-green-200">
            <CardHeader className="bg-green-50 border-b border-green-200">
              <CardTitle className="text-green-800 font-serif flex items-center gap-2">
                <User className="w-5 h-5" />
                Optional: Login for Better Experience
              </CardTitle>
              <CardDescription className="text-brand-text-dark">
                While not required, logging in helps track your contributions and get notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Link href="/login?returnUrl=/report-found">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                    <User className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOptionalLogin(false)}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  Continue Without Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mcc-card border-2 border-brand-primary/20">
          <CardHeader className="bg-green-50/50">
            <CardTitle className="text-2xl sm:text-3xl text-green-700 font-serif">Report a Found Item</CardTitle>
            <CardDescription className="text-brand-text-dark">Found something? Help reunite it with its owner by filling out this form.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Progress Bar */}
              <div className="mb-8 relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100">
                  <div style={{ width: `${(step / 3) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-600 transition-all duration-500"></div>
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-500 px-1">
                  <span className={step >= 1 ? "text-green-600 font-bold" : ""}>Item Details</span>
                  <span className={step >= 2 ? "text-green-600 font-bold" : ""}>Location</span>
                  <span className={step >= 3 ? "text-green-600 font-bold" : ""}>Contact</span>
                </div>
              </div>

              {step === 1 && (
                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80 animate-in fade-in slide-in-from-right-4 duration-300">
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
                            {categories.map((category: string) => (
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
                        <label
                          htmlFor="itemImage"
                          className="cursor-pointer block"
                          onDragOver={(e) => handleDragOver(e, 'item')}
                          onDragLeave={(e) => handleDragLeave(e, 'item')}
                          onDrop={(e) => handleDrop(e, 'item')}
                        >
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingItem ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-600'}`}>
                            {isCompressingItem ? (
                              <div className="flex flex-col items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                                <p className="text-sm text-gray-500">Processing image...</p>
                              </div>
                            ) : itemImagePreview ? (
                              <>
                                <img src={itemImagePreview} alt="Item Preview" className="h-32 w-full object-cover rounded-lg mb-2" />
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
                        <label
                          htmlFor="locationImage"
                          className="cursor-pointer block"
                          onDragOver={(e) => handleDragOver(e, 'location')}
                          onDragLeave={(e) => handleDragLeave(e, 'location')}
                          onDrop={(e) => handleDrop(e, 'location')}
                        >
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingLocation ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-600'}`}>
                            {isCompressingLocation ? (
                              <div className="flex flex-col items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                                <p className="text-sm text-gray-500">Processing image...</p>
                              </div>
                            ) : locationImagePreview ? (
                              <>
                                <img src={locationImagePreview} alt="Location Preview" className="h-32 w-full object-cover rounded-lg mb-2" />
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

                  <div className="flex justify-end pt-6 mt-6 border-t border-gray-200/80">
                    <Button type="button" onClick={() => { if (validateStep1()) setStep(2) }} className="bg-green-600 hover:bg-green-700 text-white px-8">Next Step: Location</Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">2. Where & When It Was Found</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <Label htmlFor="location" className="font-medium">Found Location <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-gray-500 mt-1">Where was the item found?</p>
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
                      <Label className="font-medium">Date & Time Found <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-gray-500 mt-1">When was it found?</p>
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
                            className={timeError ? "border-red-500 text-red-900 focus-visible:ring-red-500" : ""}
                          />
                          {timeError && <p className="text-xs text-red-500 mt-1">{timeError}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                    <div className="md:col-span-1">
                      <Label htmlFor="currentLocation" className="font-medium">Current Location of Item <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-gray-500 mt-1">Where is the item now?</p>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        id="currentLocation"
                        value={formData.currentLocation}
                        onChange={(e) => handleInputChange("currentLocation", e.target.value)}
                        placeholder="e.g., Security Office, My Dorm Room, etc."
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200/80 pt-6 mt-6">
                    <div className="md:col-span-1">
                      <Label className="font-medium">Related Cultural Event</Label>
                      <p className="text-xs text-gray-500 mt-1">Was this found during an event?</p>
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
                          <Label htmlFor="hasCulturalEvent" className="text-sm">Yes, found during a cultural event</Label>
                        </div>

                        {hasCulturalEvent && (
                          <div className="space-y-3">
                            <Select value={formData.culturalEvent} onValueChange={handleCulturalEventSelect}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an event" />
                              </SelectTrigger>
                              <SelectContent>
                                {culturalEvents.map((event: string) => (
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

                  <div className="flex justify-between pt-6 mt-6 border-t border-gray-200/80">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="button" onClick={() => { if (validateStep2()) setStep(3) }} className="bg-green-600 hover:bg-green-700 text-white px-8">Next Step: Contact Info</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80 animate-in fade-in slide-in-from-right-4 duration-300">
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
                        className={fieldErrors.contactEmail ? "border-red-500" : ""}
                      />
                      {fieldErrors.contactEmail && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.contactEmail}</p>
                      )}
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
                        className={fieldErrors.contactPhone ? "border-red-500" : ""}
                      />
                      {fieldErrors.contactPhone && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.contactPhone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-6 mt-6 border-t border-gray-200/80">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || isCompressingItem || isCompressingLocation}
                      className={`px-8 py-2 font-medium rounded-lg shadow-lg flex items-center justify-center gap-2 ${isSubmitting || isCompressingItem || isCompressingLocation
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Report Found Item"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                By submitting, you agree to be contacted by the item's owner.
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
            <p className="text-gray-600 mb-6">Found item reported successfully! The owner will be notified.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = isAuthenticated ? '/dashboard' : '/'}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                {isAuthenticated ? <User className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                {isAuthenticated ? 'Go to Dashboard' : 'Go Home'}
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 inline-block mt-4">
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full" />
                Redirecting automatically in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}