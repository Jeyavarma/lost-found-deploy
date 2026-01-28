'use client'

import { useEffect } from 'react'

export default function AdminDashboardRedirect() {
  useEffect(() => {
    // Redirect to the new functional admin dashboard
    window.location.href = '/admin'
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  )
}