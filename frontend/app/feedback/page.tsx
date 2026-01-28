"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MessageCircle, Star, GraduationCap } from "lucide-react"

const feedbackTypes = ["Bug Report", "Feature Request", "General Feedback", "Complaint", "Suggestion", "Other"]
const ratings = [1, 2, 3, 4, 5]

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedbackType: "",
    rating: "",
    subject: "",
    message: "",
    department: "",
    year: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('https://lost-found-79xn.onrender.com/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        alert('Thank you for your feedback! We appreciate your input.')
        setFormData({
          name: "",
          email: "",
          feedbackType: "",
          rating: "",
          subject: "",
          message: "",
          department: "",
          year: ""
        })
      } else {
        alert('Error submitting feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error connecting to server. Please try again.')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
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
                  <span className="text-xs text-gray-300 font-medium">Madras Christian College</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" className="flex items-center gap-2 text-brand-text-light hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mcc-card border-2 border-brand-primary/20">
          <CardHeader className="bg-blue-50/50">
            <CardTitle className="text-2xl sm:text-3xl text-blue-700 font-serif flex items-center gap-3">
              <MessageCircle className="w-8 h-8" />
              Share Your Feedback
            </CardTitle>
            <CardDescription className="text-brand-text-dark">
              Help us improve the MCC Lost & Found platform. Your feedback is valuable to us!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80">
                <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">Your Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="font-medium">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.email@mcc.edu.in"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <Label htmlFor="department" className="font-medium">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="e.g., Computer Science, Mathematics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year" className="font-medium">Year of Study</Label>
                    <Select value={formData.year} onValueChange={(value) => handleInputChange("year", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I Year">I Year</SelectItem>
                        <SelectItem value="II Year">II Year</SelectItem>
                        <SelectItem value="III Year">III Year</SelectItem>
                        <SelectItem value="IV Year">IV Year</SelectItem>
                        <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200/80">
                <h3 className="text-xl font-semibold mb-6 mcc-text-primary font-serif">Feedback Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="feedbackType" className="font-medium">Feedback Type *</Label>
                    <Select value={formData.feedbackType} onValueChange={(value) => handleInputChange("feedbackType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedbackTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rating" className="font-medium">Overall Rating *</Label>
                    <Select value={formData.rating} onValueChange={(value) => handleInputChange("rating", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate our platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {ratings.map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(rating)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                                {[...Array(5 - rating)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 text-gray-300" />
                                ))}
                              </div>
                              <span>{rating} Star{rating !== 1 ? 's' : ''}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6">
                  <Label htmlFor="subject" className="font-medium">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="Brief subject of your feedback"
                    required
                  />
                </div>

                <div className="mt-6">
                  <Label htmlFor="message" className="font-medium">Your Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Please provide detailed feedback about your experience with the MCC Lost & Found platform..."
                    rows={6}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg"
                >
                  Submit Feedback
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Your feedback helps us improve the platform for the entire MCC community.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}