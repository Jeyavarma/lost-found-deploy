'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Navigation from '@/components/layout/navigation'
import { isAuthenticated, getUserData, getAuthToken } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'

export default function AdminTestPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        window.location.href = '/login'
        return
      }
      
      const userData = getUserData()
      if (userData?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }
    }
    
    checkAuth()
  }, [])

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testAdminEndpoints = async () => {
    setLoading(true)
    setResults([])
    
    const token = getAuthToken()
    addResult(`Testing with backend URL: ${BACKEND_URL}`)
    addResult(`Token present: ${token ? 'Yes' : 'No'}`)
    
    // Test health endpoint
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`)
      addResult(`Health endpoint: ${healthResponse.status} ${healthResponse.statusText}`)
    } catch (error) {
      addResult(`Health endpoint error: ${error}`)
    }
    
    // Test admin stats
    try {
      const statsResponse = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      addResult(`Admin stats: ${statsResponse.status} ${statsResponse.statusText}`)
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        addResult(`Stats data: ${JSON.stringify(statsData)}`)
      } else {
        const errorText = await statsResponse.text()
        addResult(`Stats error: ${errorText}`)
      }
    } catch (error) {
      addResult(`Admin stats error: ${error}`)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mcc-text-primary font-serif mb-2">Admin API Test</h1>
          <p className="text-gray-600">Test admin endpoints and functionality</p>
        </div>

        <Card className="mcc-card">
          <CardHeader>
            <CardTitle>API Endpoint Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testAdminEndpoints} 
              disabled={loading}
              className="mb-4"
            >
              {loading ? 'Testing...' : 'Run Tests'}
            </Button>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <Alert key={index} className="text-sm">
                  <AlertDescription>{result}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}