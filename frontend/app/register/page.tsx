"use client"

import React, { useState } from "react"
import { ArrowLeft, GraduationCap, User, Mail, Phone, BookOpen, Shield, CheckCircle } from "lucide-react"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/config";
// Type definitions
interface RegisterData {
  name: string
  email: string
  phone: string
  studentId: string
  shift: string
  department: string
  year: string
  rollNumber: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  verifyStudent: boolean
}

interface ValidationErrors {
  [key: string]: string
}

interface Option {
  value: string
  label: string
}

const shifts: Option[] = [
  { value: 'aided', label: 'Day Shift (Aided)' },
  { value: 'sfs', label: 'Self-Financed Stream' }
]

// Aided Stream - Undergraduate
const aidedUGDepartments: Option[] = [
  { value: "ba-english", label: "B.A. English Language and Literature" },
  { value: "ba-tamil", label: "B.A. Tamil Literature" },
  { value: "ba-history", label: "B.A. History" },
  { value: "ba-political-science", label: "B.A. Political Science" },
  { value: "ba-economics", label: "B.A. Economics" },
  { value: "ba-philosophy", label: "B.A. Philosophy" },
  { value: "bcom", label: "B.Com (Commerce)" },
  { value: "bsc-mathematics", label: "B.Sc. Mathematics" },
  { value: "bsc-statistics", label: "B.Sc. Statistics" },
  { value: "bsc-physics", label: "B.Sc. Physics" },
  { value: "bsc-chemistry", label: "B.Sc. Chemistry" },
  { value: "bsc-plant-biology", label: "B.Sc. Plant Biology & Plant Biotechnology" },
  { value: "bsc-zoology", label: "B.Sc. Zoology" }
]

// Aided Stream - Postgraduate
const aidedPGDepartments: Option[] = [
  { value: "ma-english", label: "M.A. English Language & Literature" },
  { value: "ma-tamil", label: "M.A. Tamil Literature" },
  { value: "ma-history", label: "M.A. History" },
  { value: "ma-political-science", label: "M.A. Political Science" },
  { value: "ma-public-admin", label: "M.A. Public Administration" },
  { value: "ma-economics", label: "M.A. Economics" },
  { value: "ma-philosophy", label: "M.A. Philosophy" },
  { value: "mcom", label: "M.Com (Commerce)" },
  { value: "msw", label: "M.S.W (Community Development & Medical Psychiatry)" },
  { value: "msc-mathematics", label: "M.Sc. Mathematics" },
  { value: "msc-statistics", label: "M.Sc. Statistics" },
  { value: "msc-physics", label: "M.Sc. Physics" },
  { value: "msc-chemistry", label: "M.Sc. Chemistry" },
  { value: "msc-plant-biology", label: "M.Sc. Plant Biology & Plant Biotechnology" },
  { value: "msc-zoology", label: "M.Sc. Zoology" },
  { value: "msc-data-science", label: "M.Sc. Data Science" }
]

// Self-Financed Stream - Undergraduate
const sfsUGDepartments: Option[] = [
    { value: "ba-english", label: "B.A. English Language and Literature" },
     { value: "bsc-physics", label: "B.Sc. Physics" },
  { value: "ba-journalism", label: "B.A. Journalism" },
    { value: "bsc-mathematics", label: "B.Sc. Mathematics" },
  { value: "bsw", label: "B.S.W. (Social Work)" },
  { value: "bcom-accounting", label: "B.Com. Accounting and Finance" },
  { value: "bcom-professional", label: "B.Com. Professional Accounting" },
  { value: "bba", label: "B.B.A. Business Administration" },
  { value: "bca", label: "B.C.A. Computer Applications" },
  { value: "bsc-cs", label: "B.Sc. Computer Science" },
  { value: "bsc-microbiology", label: "B.Sc. Microbiology" },
  { value: "bsc-viscom", label: "B.Sc. Visual Communication" },
  { value: "bsc-psychology", label: "B.Sc. Psychology" },
  { value: "bsc-geography", label: "B.Sc. Geography, Tourism & Travel Management" }
]

// Research Programs
const researchDepartments: Option[] = [
  { value: "phd-english", label: "Ph.D. English" },
  { value: "phd-tamil", label: "Ph.D. Tamil" },
  { value: "phd-history", label: "Ph.D. History" },
  { value: "phd-political-science", label: "Ph.D. Political Science" },
  { value: "phd-public-admin", label: "Ph.D. Public Administration" },
  { value: "phd-economics", label: "Ph.D. Economics" },
  { value: "phd-philosophy", label: "Ph.D. Philosophy" },
  { value: "phd-commerce", label: "Ph.D. Commerce" },
  { value: "phd-mathematics", label: "Ph.D. Mathematics" },
  { value: "phd-statistics", label: "Ph.D. Statistics" },
  { value: "phd-physics", label: "Ph.D. Physics" },
  { value: "phd-chemistry", label: "Ph.D. Chemistry" },
  { value: "phd-botany", label: "Ph.D. Botany" },
  { value: "phd-zoology", label: "Ph.D. Zoology" }
]

const ugYears: Option[] = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" }
]

const pgYears: Option[] = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" }
]

const phdYears: Option[] = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year" }
]

export default function RegisterPage(): JSX.Element {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [registerData, setRegisterData] = useState<RegisterData>({
    // Personal Information
    name: "",
    email: "",
    phone: "",

    // Academic Information
    studentId: "",
    shift: "",
    department: "",
    year: "",
    rollNumber: "",

    // Account Security
    password: "",
    confirmPassword: "",

    // Verification
    agreeToTerms: false,
    verifyStudent: false,
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")

  const getDepartments = (): Option[] => {
    if (registerData.shift === 'aided') {
      return [...aidedUGDepartments, ...aidedPGDepartments, ...researchDepartments]
    }
    if (registerData.shift === 'sfs') {
      return sfsUGDepartments
    }
    return []
  }

  const getYears = (): Option[] => {
    const dept = registerData.department
    if (dept.startsWith('phd-')) return phdYears
    if (dept.startsWith('m') || dept.includes('msc-') || dept.includes('ma-') || dept.includes('mcom') || dept.includes('msw')) return pgYears
    return ugYears
  }

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {}

    if (step === 1) {
      if (!registerData.name.trim()) newErrors.name = "Full name is required"
      if (!registerData.email.trim()) newErrors.email = "Email is required"
      else if (!registerData.email.endsWith("@mcc.edu.in")) {
        newErrors.email = "Please use your official MCC email address (@mcc.edu.in)"
      }
      if (registerData.phone && !/^\+?[\d\s-()]{10,}$/.test(registerData.phone)) {
        newErrors.phone = "Please enter a valid phone number"
      }
    }

    if (step === 2) {
      if (!registerData.studentId.trim()) newErrors.studentId = "Student ID is required"
      if (!registerData.shift) newErrors.shift = "Shift is required"
      if (!registerData.department) newErrors.department = "Department is required"
            if (!registerData.year) newErrors.year = "Year of study is required"
      
    }

    if (step === 3) {
      if (!registerData.password) newErrors.password = "Password is required"
      else if (registerData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long"
      }
      if (registerData.password !== registerData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match"
      }
      if (!registerData.agreeToTerms) newErrors.agreeToTerms = "You must agree to the terms"
      if (!registerData.verifyStudent) newErrors.verifyStudent = "Please verify your student status"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = (): void => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = (): void => {
    setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return

    if (successMessage) return;

    setIsSubmitting(true)

    try {
      const apiUrl = `${BACKEND_URL}/api/auth/register`
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          phone: registerData.phone,
          studentId: registerData.studentId,
          shift: registerData.shift,
          department: registerData.department,
          year: registerData.year,
          rollNumber: registerData.rollNumber, // Ensure rollNumber is included
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Your account has been successfully created! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        // Use a generic error key 'api' to display form-level errors
        setErrors({ api: data.message || "An unknown error occurred." });
      }
    } catch (err) {
      setErrors({ api: "Failed to connect to the server. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleInputChange = (field: keyof RegisterData, value: string | boolean): void => {
    setRegisterData((prev) => {
      const newData = { ...prev, [field]: value }
      
      if (field === 'shift') {
        newData.department = ""
        newData.year = ""
      }
      
      if (field === 'department') {
        newData.year = ""
      }

      // Sync studentId and rollNumber
      if (field === 'studentId') {
        newData.rollNumber = value as string;
      }
      
      return newData
    })
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const getStepProgress = (): number => (currentStep / 3) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="mcc-primary border-b-4 border-brand-accent shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white font-serif">MCC Lost & Found</span>
                  <span className="text-xs text-gray-300 font-medium">Student Registration</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-brand-text-light hover:bg-white/10">
                  Already have an account?
                </Button>
              </Link>
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Header */}
        {successMessage ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-white border-2 shadow-xl rounded-lg" style={{borderColor: '#1C13B3'}}>
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold font-serif mb-2" style={{color: '#1C13B3'}}>Registration Successful!</h2>
            <p className="text-gray-700">{successMessage}</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-[#1C13B3] font-serif mb-2">Create Your Student Account</h1>
                <p className="text-gray-700">Join the MCC Lost & Found community</p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-700 mb-2">
                  <span>Step {currentStep} of 3</span>
                  <span>{Math.round(getStepProgress())}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{width: `${getStepProgress()}%`, backgroundColor: '#1C13B3'}}
                  />
                </div>
              </div>

              <div className="flex justify-center space-x-8 mb-8">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-[#1C13B3]" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 1 ? "text-white" : "bg-gray-200"
                    }`}
                    style={currentStep >= 1 ? {backgroundColor: '#1C13B3'} : {}}
                  >
                    {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : <User className="w-4 h-4" />}
                  </div>
                  <span className="font-medium">Personal</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-[#1C13B3]" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 2 ? "text-white" : "bg-gray-200"
                    }`}
                    style={currentStep >= 2 ? {backgroundColor: '#1C13B3'} : {}}
                  >
                    {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <span className="font-medium">Academic</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? "text-[#1C13B3]" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 3 ? "text-white" : "bg-gray-200"
                    }`}
                    style={currentStep >= 3 ? {backgroundColor: '#1C13B3'} : {}}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Security</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border-2 shadow-xl rounded-lg" style={{borderColor: '#1C13B3'}}>
          <div className="p-8">
            {errors.api && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
                <p className="font-bold">Registration Failed</p>
                <p>{errors.api}</p>
              </div>
            )}
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#1C13B3'}}>
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold font-serif" style={{color: '#1C13B3'}}>Personal Information</h2>
                  <p className="text-gray-700">Let's start with your basic details</p>
                </div>

                <div>
                  <label htmlFor="name" className="text-sm font-semibold mb-2 block" style={{color: '#1C13B3'}}>
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="name"
                      type="text"
                      value={registerData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter your full name as per college records"
                      className={`w-full pl-12 h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1C13B3] ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="text-sm font-semibold mb-2 block" style={{color: '#1C13B3'}}>
                    MCC Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.name@mcc.edu.in"
                      className={`w-full pl-12 h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1C13B3] ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  <p className="text-xs text-gray-500 mt-1">Use your official MCC email address</p>
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-semibold mb-2 block" style={{color: '#1C13B3'}}>
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="phone"
                      type="tel"
                      value={registerData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full pl-12 h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1C13B3] ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  <p className="text-xs text-gray-500 mt-1">For important notifications (optional)</p>
                </div>
              </div>
            )}

            {/* Step 2: Academic Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-green-800 font-serif">Academic Information</h2>
                  <p className="text-gray-700">Tell us about your studies at MCC</p>
                </div>

                                <div>
                  <label htmlFor="studentId" className="text-sm font-semibold text-green-800 mb-2 block">
                    Student ID / Roll Number *
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    value={registerData.studentId}
                    onChange={(e) => handleInputChange("studentId", e.target.value)}
                    placeholder="e.g., MCC2024001"
                    className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.studentId ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>}
                </div>

                <div>
                  <label htmlFor="shift" className="text-sm font-semibold text-green-800 mb-2 block">
                    Shift *
                  </label>
                  <select
                    value={registerData.shift}
                    onChange={(e) => handleInputChange("shift", e.target.value)}
                    className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.shift ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select your shift</option>
                    {shifts.map((shift) => (
                      <option key={shift.value} value={shift.value}>
                        {shift.label}
                      </option>
                    ))}
                  </select>
                  {errors.shift && <p className="text-red-500 text-sm mt-1">{errors.shift}</p>}
                </div>

                <div>
                  <label htmlFor="department" className="text-sm font-semibold text-green-800 mb-2 block">
                    Department *
                  </label>
                  <select
                    value={registerData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.department ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select your department</option>
                    {getDepartments().map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                </div>

                <div>
                  <label htmlFor="year" className="text-sm font-semibold text-green-800 mb-2 block">
                    Year of Study *
                  </label>
                  <select 
                    value={registerData.year} 
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    disabled={!registerData.department}
                    className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.year ? "border-red-500" : "border-gray-300"
                    } ${!registerData.department ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">{!registerData.department ? 'Select department first' : 'Select your year of study'}</option>
                    {registerData.department && getYears().map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                  {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
                </div>

                
              </div>
            )}

            {/* Step 3: Security & Verification */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-red-800 font-serif">Account Security</h2>
                  <p className="text-gray-700">Secure your account and verify your details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="text-sm font-semibold text-red-800 mb-2 block">
                      Password *
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Create a strong password"
                      className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.password ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-red-800 mb-2 block">
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="Confirm your password"
                      className={`w-full h-12 border rounded-md px-3 text-base focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.confirmPassword ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="verifyStudent"
                      checked={registerData.verifyStudent}
                      onChange={(e) => handleInputChange("verifyStudent", e.target.checked)}
                      className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-[#1C13B3]" style={{color: '#1C13B3'}}
                    />
                    <label htmlFor="verifyStudent" className="text-sm text-gray-700 leading-relaxed">
                      I confirm that I am a currently enrolled student at Madras Christian College and all the
                      information provided above is accurate and truthful.
                    </label>
                  </div>
                  {errors.verifyStudent && <p className="text-red-500 text-sm">{errors.verifyStudent}</p>}

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      checked={registerData.agreeToTerms}
                      onChange={(e) => handleInputChange("agreeToTerms", e.target.checked)}
                      className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-[#1C13B3]" style={{color: '#1C13B3'}}
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-gray-700 leading-relaxed">
                      I agree to the{" "}
                      <span className="hover:underline font-medium cursor-pointer" style={{color: '#1C13B3'}}>
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="hover:underline font-medium cursor-pointer" style={{color: '#1C13B3'}}>
                        Privacy Policy
                      </span>
                      . I understand that providing false information may result in account suspension.
                    </label>
                  </div>
                  {errors.agreeToTerms && <p className="text-red-500 text-sm">{errors.agreeToTerms}</p>}
                </div>

                <div className="rounded-lg p-4" style={{backgroundColor: '#1C13B31A', borderColor: '#1C13B3', borderWidth: '1px'}}>
                  <h4 className="font-semibold mb-2" style={{color: '#1C13B3'}}>What happens next?</h4>
                  <ul className="text-sm space-y-1" style={{color: '#1C13B3'}}>
                    <li>• You'll receive a verification email at your MCC address</li>
                    <li>• Click the verification link to activate your account</li>
                    <li>• Your student status will be verified by our admin team</li>
                    <li>• Once approved, you can start using all features</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent px-4 py-2 rounded-md transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={`ml-auto font-semibold px-8 py-2 rounded-md text-white transition-colors ${
                    currentStep === 1 ? "hover:opacity-90" : "bg-green-600 hover:bg-green-700"
                  }`}
                  style={currentStep === 1 ? {backgroundColor: '#1C13B3'} : {}}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !registerData.agreeToTerms || !registerData.verifyStudent}
                  className="ml-auto bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              )}
            </div>
          </div>
        </form>
      </>
      )}

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-700 mb-4">Need help with registration?</p>
          <div className="flex justify-center space-x-4">
            <span className="text-sm hover:underline cursor-pointer" style={{color: '#1C13B3'}}>
              Registration Guide
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm hover:underline cursor-pointer" style={{color: '#1C13B3'}}>
              Contact Support
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm hover:underline cursor-pointer" style={{color: '#1C13B3'}}>
              Already have an account?
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}