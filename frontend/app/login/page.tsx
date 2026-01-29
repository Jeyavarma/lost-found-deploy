"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  GraduationCap,
  User,
  Users,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  Star,
  BookOpen,
  UserCheck,
  Settings,
} from "lucide-react"
import { BACKEND_URL } from "@/lib/config"

export default function LoginPage() {
  const router = useRouter()
  const [selectedPortal, setSelectedPortal] = useState<"student" | "staff" | "admin" | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Mock stats for admin preview
  const adminStats = {
    totalItems: 234,
    activeItems: 89,
    resolvedThisWeek: 18,
    pendingVerification: 12,
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔄 Login form submitted')
    console.log('📧 Email:', formData.email)
    console.log('🔑 Password length:', formData.password.length)
    console.log('👤 Role:', selectedPortal)
    console.log('🌐 Backend URL:', BACKEND_URL)
    
    setIsLoading(true)
    setError("")

    try {
      console.log('📡 Making login request...')
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, role: selectedPortal }),
      });

      console.log('📥 Response status:', response.status)
      const data = await response.json();
      console.log('📄 Response data:', data)

      if (response.ok) {
        console.log('✅ Login successful, storing auth data...')
        
        // Test localStorage before storing
        try {
          localStorage.setItem('test', 'working')
          const test = localStorage.getItem('test')
          console.log('💾 LocalStorage test:', test === 'working' ? 'WORKING' : 'FAILED')
          localStorage.removeItem('test')
        } catch (e) {
          console.error('💾 LocalStorage ERROR:', e)
        }
        
        // Store auth data using the auth utility
        const { setAuthToken, setUserData } = await import('@/lib/auth');
        setAuthToken(data.token);
        setUserData({
          id: data.userId || data.id,
          name: data.name,
          email: data.email || formData.email,
          role: data.role
        });
        
        // Legacy storage for backward compatibility
        localStorage.setItem("userType", data.role);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("token", data.token);
        
        // Verify storage worked
        const storedToken = localStorage.getItem('token')
        const storedUserType = localStorage.getItem('userType')
        console.log('💾 Stored token:', storedToken ? 'YES' : 'NO')
        console.log('💾 Stored userType:', storedUserType)
        
        console.log('🚀 Redirecting to dashboard...')
        
        // Add a small delay to ensure storage completes
        setTimeout(() => {
          router.push("/dashboard");
        }, 100)
        
      } else if (response.status === 429) {
        console.log('⏰ Rate limited')
        setError(data.error || "Too many login attempts. Please wait 15 minutes before trying again.");
      } else {
        console.log('❌ Login failed:', data)
        setError(data.message || data.error || "Invalid credentials. Please check your email and password.");
      }
    } catch (err) {
      console.log('🔥 Network error:', err)
      setError("Failed to connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  const getPortalInfo = (portal: "student" | "staff" | "admin") => {
    switch (portal) {
      case "student":
        return {
          title: "Student Portal",
          description: "Access for MCC students to report and search for lost items",
          icon: User,
          color: "mcc-primary",
          features: ["Report lost items", "Search found items", "Track your reports", "Contact finders"],
        }
      case "staff":
        return {
          title: "Staff Portal",
          description: "Access for MCC faculty and non-technical staff members",
          icon: Users,
          color: "bg-green-600",
          features: ["Report found items", "Help students", "View campus items", "Assist with verification"],
        }
      case "admin":
        return {
          title: "Admin Portal",
          description: "Administrative access for system management and oversight",
          icon: Shield,
          color: "mcc-accent",
          features: ["Manage all items", "User verification", "System analytics", "Content moderation"],
        }
    }
  }

  if (!selectedPortal) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
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

        {/* Portal Selection */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 mcc-text-primary font-serif">Choose Your Portal</h1>
            <p className="text-xl text-brand-text-dark">Select the appropriate login portal for your role at MCC</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(["student", "staff", "admin"] as const).map((portal) => {
              const info = getPortalInfo(portal)
              const IconComponent = info.icon
              return (
                <Card
                  key={portal}
                  className="mcc-card hover:shadow-2xl transition-all duration-300 cursor-pointer group border-2 border-gray-200 hover:border-brand-primary/50"
                  onClick={() => setSelectedPortal(portal)}
                >
                  <CardHeader className="text-center pb-4">
                    <div
                      className={`w-16 h-16 ${info.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <IconComponent className="w-8 h-8 text-brand-text-light" />
                    </div>
                    <CardTitle className="text-2xl font-bold mcc-text-primary font-serif">{info.title}</CardTitle>
                    <CardDescription className="text-brand-text-dark text-base">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {info.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-brand-text-dark font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`w-full mt-6 ${info.color} hover:opacity-90 text-brand-text-light font-medium shadow-lg`}
                    >
                      Access {info.title}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Additional Information */}
          <div className="mt-16 text-center">
            <Card className="mcc-card border-2 border-brand-primary/20 bg-blue-50">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 mcc-text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 mcc-text-primary">Need Help?</h3>
                <p className="text-brand-text-dark mb-4">
                  If you're unsure which portal to use or need assistance with your account, please contact the IT Help
                  Desk.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    variant="outline"
                    className="border-brand-primary/30 mcc-text-primary hover:bg-blue-100 bg-transparent"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    helpdesk@mcc.edu.in
                  </Button>
                  <Button
                    variant="outline"
                    className="border-brand-primary/30 mcc-text-primary hover:bg-blue-100 bg-transparent"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    User Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const portalInfo = getPortalInfo(selectedPortal)
  const IconComponent = portalInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-brand-text-light hover:bg-white/10 mr-4"
                onClick={() => setSelectedPortal(null)}
              >
                <ArrowLeft className="w-4 h-4" />
                Change Portal
              </Button>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Login Form */}
          <div className="flex flex-col justify-center">
            <Card className="mcc-card border-2 border-brand-primary/20 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div
                  className={`w-16 h-16 ${portalInfo.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                >
                  <IconComponent className="w-8 h-8 text-brand-text-light" />
                </div>
                <CardTitle className="text-3xl font-bold mcc-text-primary font-serif">{portalInfo.title}</CardTitle>
                <CardDescription className="text-brand-text-dark text-lg">{portalInfo.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium mcc-text-primary">
                      MCC Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={`${selectedPortal}@mcc.edu.in`}
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 h-12 border-gray-300 focus:border-brand-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium mcc-text-primary">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 h-12 border-gray-300 focus:border-brand-primary"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={`w-full h-12 ${portalInfo.color} hover:opacity-90 text-brand-text-light font-medium text-lg shadow-lg`}
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : `Sign In to ${portalInfo.title}`}
                  </Button>
                </form>

                <div className="text-center space-y-4">
                  <Link href="/forgot-password" className="text-sm mcc-text-primary hover:underline">
                    Forgot your password?
                  </Link>

                  {selectedPortal === "student" && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-brand-text-dark mb-3">Don't have an account?</p>
                      <Link href="/register">
                        <Button
                          variant="outline"
                          className="w-full border-brand-primary/30 mcc-text-primary hover:bg-blue-50 bg-transparent"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Create Student Account
                        </Button>
                      </Link>
                    </div>
                  )}

                  {selectedPortal === "admin" && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-brand-text-dark mb-3">Need to create an account?</p>
                      <Link href="/admin/register">
                        <Button
                          variant="outline"
                          className="w-full border-brand-accent/30 mcc-text-accent hover:bg-red-50 bg-transparent"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Create Admin Account
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Portal Information & Preview */}
          <div className="space-y-8">
            {/* Portal Features */}
            <Card className="mcc-card border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold mcc-text-primary">Portal Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {portalInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-brand-text-dark font-medium">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>



            {/* Security Notice */}
            <Card className="mcc-card border-2 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-green-800">Secure Login</h3>
                </div>
                <p className="text-sm text-green-700">
                  Your login is protected with industry-standard security measures. Always use your official MCC email
                  address.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
