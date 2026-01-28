'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar,
  BarChart3,
  Users,
  Package
} from 'lucide-react'
import Link from 'next/link'
import Navigation from '@/components/layout/navigation'

export default function AdminReports() {
  const [generating, setGenerating] = useState(false)

  const generateReport = async (type: string) => {
    setGenerating(true)
    setTimeout(() => {
      alert(`${type} report generated and downloaded!`)
      setGenerating(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mcc-text-primary font-serif">Reports</h1>
            <p className="text-gray-600">Generate and download system reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Generate reports about user activity and registrations</p>
              <Button 
                onClick={() => generateReport('User Activity')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                User Activity Report
              </Button>
              <Button 
                onClick={() => generateReport('New Registrations')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                Registration Report
              </Button>
            </CardContent>
          </Card>

          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Item Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Generate reports about lost and found items</p>
              <Button 
                onClick={() => generateReport('Items Summary')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                Items Summary
              </Button>
              <Button 
                onClick={() => generateReport('Success Rate')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                Success Rate Report
              </Button>
            </CardContent>
          </Card>

          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Analytics Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Generate detailed analytics and statistics</p>
              <Button 
                onClick={() => generateReport('Monthly Analytics')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                Monthly Report
              </Button>
              <Button 
                onClick={() => generateReport('Custom Analytics')}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <Download className="w-4 h-4 mr-2" />
                Custom Report
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mcc-card mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Scheduled Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Weekly Summary Report</h3>
                    <p className="text-sm text-gray-600">Automatically generated every Monday</p>
                  </div>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Monthly Analytics Report</h3>
                    <p className="text-sm text-gray-600">Automatically generated on 1st of each month</p>
                  </div>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}