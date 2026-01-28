"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle } from "lucide-react"
import Navigation from "@/components/layout/navigation"
import emailjs from '@emailjs/browser'
import { BACKEND_URL } from "@/lib/config"

// Initialize EmailJS
if (typeof window !== 'undefined') {
  emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!)
}


export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState("")


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    console.log('🔍 Starting forgot password for:', email)

    try {
      // Generate OTP and save to backend
      console.log('📡 Calling backend API...')
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      console.log('📡 Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend response:', data)
        
        // Extract OTP from backend response
        const otpCode = data.otp
        
        if (!otpCode) {
          setError('Failed to generate OTP')
          return
        }
        
        console.log('🔢 OTP received:', otpCode)
        
        if (!otpCode) {
          setError('Failed to get OTP from backend')
          return
        }
        
        // Send email via EmailJS
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString()
        console.log('📧 Sending OTP email via EmailJS...')
        
        try {
          await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
            {
              to_email: email,
              passcode: otpCode,
              time: expiryTime
            },
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
          )
          console.log('✅ EmailJS success - OTP sent to email')
          setStep(2)
        } catch (emailError) {
          console.error('❌ EmailJS error:', emailError)
          setError('Email sent but may take 2-3 minutes to arrive.')
          setStep(2)
        }

      } else {
        const data = await response.json()
        console.error('❌ Backend error:', data)
        setError(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      })

      if (response.ok) {
        setShowSuccess(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-800">Forgot Password</CardTitle>
          </CardHeader>
          <CardContent>
            {!showSuccess ? (
              step === 1 ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send OTP'}
                  </Button>
                  
                  <Link href="/login" className="block text-center text-sm text-gray-600">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Back to Login
                  </Link>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Check your email for the 6-digit OTP code. May take 1-3 minutes to arrive.</p>
                  </div>

                  <div>
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </form>
              )
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <h3 className="text-lg font-semibold">Password Reset!</h3>
                <Link href="/login">
                  <Button className="bg-red-600 hover:bg-red-700 text-white">Login Now</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}