"use client"

import React, { useState } from "react"
import { ArrowLeft, GraduationCap, Camera, MapPin, Clock, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const locations = [
  { value: "main-building", label: "Main Building" },
  { value: "library", label: "Library" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "hostel", label: "Hostel" },
  { value: "sports-complex", label: "Sports Complex" },
  { value: "auditorium", label: "Auditorium" },
  { value: "parking", label: "Parking Area" },
  { value: "garden", label: "Garden/Campus Grounds" }
]

const categories = [
  { value: "electronics", label: "Electronics" },
  { value: "books", label: "Books & Stationery" },
  { value: "clothing", label: "Clothing & Accessories" },
  { value: "personal", label: "Personal Items" },
  { value: "documents", label: "Documents & Cards" },
  { value: "sports", label: "Sports Equipment" },
  { value: "other", label: "Other" }
]

export default function ReportPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    building: "",
    floor: "",
    room: "",
    status: "lost",
    contactInfo: "",
    dateLostFound: "",
    timeLostFound: ""
  })
  const [itemImage, setItemImage] = useState<File | null>(null)
  const [locationImage, setLocationImage] = useState<File | null>(null)
  const [itemImagePreview, setItemImagePreview] = useState<string>("") 
  const [locationImagePreview, setLocationImagePreview] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [currentTime] = useState(new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short'
  }))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError("")
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'location') => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setError("Image size should be less than 1MB")
        return
      }
      
      const reader = new FileReader()
      reader.onload = () => {
        if (type === 'item') {
          setItemImage(file)
          setItemImagePreview(reader.result as string)
        } else {
          setLocationImage(file)
          setLocationImagePreview(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const submitData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value)
      })
      
      if (itemImage) {
        submitData.append('itemImage', itemImage)
      }
      if (locationImage) {
        submitData.append('locationImage', locationImage)
      }

      const token = localStorage.getItem('token')
      const response = await fetch("https://lost-found-79xn.onrender.com/api/items", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: submitData
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/dashboard")
      } else {
        setError(data.message || "Failed to submit report")
      }
    } catch (err) {
      setError("Failed to connect to server")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="mcc-primary border-b-4 border-brand-accent shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-4">
                <div className="w-12 h-12 mcc-accent rounded-lg flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-brand-text-light" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-brand-text-light font-serif">MCC Lost & Found</span>
                  <span className="text-xs text-gray-300 font-medium">Report Item</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" className="flex items-center gap-2 text-brand-text-light hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mcc-card border-2 border-brand-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold mcc-text-primary font-serif">Report Lost/Found Item</CardTitle>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-2">
              <Clock className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium mcc-text-primary">Item Status *</Label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  >
                    <option value="lost">Lost Item</option>
                    <option value="found">Found Item</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium mcc-text-primary">Category *</Label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium mcc-text-primary">Item Title *</Label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Black iPhone 13 with blue case"
                  className="h-12 focus:ring-brand-primary"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium mcc-text-primary">Description *</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide detailed description including color, brand, distinctive features..."
                  className="min-h-24 focus:ring-brand-primary"
                  required
                />
              </div>

              {/* When was it lost/found */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateLostFound" className="text-sm font-medium mcc-text-primary">
                    Date {formData.status === 'lost' ? 'Lost' : 'Found'} *
                  </Label>
                  <Input
                    name="dateLostFound"
                    type="date"
                    value={formData.dateLostFound}
                    onChange={handleInputChange}
                    className="h-12 focus:ring-brand-primary"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="timeLostFound" className="text-sm font-medium mcc-text-primary">
                    Time {formData.status === 'lost' ? 'Lost' : 'Found'}
                  </Label>
                  <Input
                    name="timeLostFound"
                    type="time"
                    value={formData.timeLostFound}
                    onChange={handleInputChange}
                    className="h-12 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium mcc-text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Details *
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location" className="text-xs text-gray-600">Main Location</Label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    >
                      <option value="">Select location</option>
                      {locations.map(loc => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="building" className="text-xs text-gray-600">Building/Block</Label>
                    <Input
                      name="building"
                      value={formData.building}
                      onChange={handleInputChange}
                      placeholder="e.g., Block A, Science Block"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="floor" className="text-xs text-gray-600">Floor</Label>
                    <Input
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      placeholder="e.g., Ground Floor, 2nd Floor"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="room" className="text-xs text-gray-600">Room/Area</Label>
                    <Input
                      name="room"
                      value={formData.room}
                      onChange={handleInputChange}
                      placeholder="e.g., Room 201, Near stairs"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Item Image Upload */}
              <div>
                <Label className="text-sm font-medium mcc-text-primary flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Item Photo (Optional)
                </Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'item')}
                    className="hidden"
                    id="item-image-upload"
                  />
                  <label
                    htmlFor="item-image-upload"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-primary transition-colors"
                  >
                    {itemImagePreview ? (
                      <img src={itemImagePreview} alt="Item Preview" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload item photo</p>
                        <p className="text-xs text-gray-400">Max 1MB, auto-compressed</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Location Image Upload */}
              <div>
                <Label className="text-sm font-medium mcc-text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Photo (Optional)
                </Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'location')}
                    className="hidden"
                    id="location-image-upload"
                  />
                  <label
                    htmlFor="location-image-upload"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-primary transition-colors"
                  >
                    {locationImagePreview ? (
                      <img src={locationImagePreview} alt="Location Preview" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload location photo</p>
                        <p className="text-xs text-gray-400">Max 1MB, shows where item was lost/found</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="contactInfo" className="text-sm font-medium mcc-text-primary">Contact Information *</Label>
                <Input
                  name="contactInfo"
                  value={formData.contactInfo}
                  onChange={handleInputChange}
                  placeholder="Your email or phone number"
                  className="h-12 focus:ring-brand-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mcc-primary hover:opacity-90 text-brand-text-light font-medium text-lg shadow-lg"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}