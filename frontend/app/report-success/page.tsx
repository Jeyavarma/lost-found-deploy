"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home, Search, GraduationCap } from "lucide-react"

export default function ReportSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
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
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mcc-card border-2 border-green-200">
          <CardHeader className="bg-green-50 border-b border-green-200 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800 font-serif">Submission Successful!</CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <p className="text-lg text-brand-text-dark">
                Your lost item report has been successfully submitted to the MCC Lost & Found system.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Your report is now visible to the MCC community</li>
                  <li>• We'll send you email notifications if someone finds your item</li>
                  <li>• Check your dashboard regularly for potential matches</li>
                  <li>• Stay connected with the MCC Lost & Found protocol</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Pro Tip:</strong> Share your report with friends and classmates to increase the chances of finding your item!
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Browse Items
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}