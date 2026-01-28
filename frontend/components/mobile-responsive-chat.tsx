"use client"

import { useState, useEffect } from 'react'
import { MessageCircle, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MobileResponsiveChatProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function MobileResponsiveChat({ isOpen, onClose, children }: MobileResponsiveChatProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isOpen) return null

  if (isMobile) {
    // Full-screen mobile chat
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="flex flex-col h-full">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <h2 className="font-semibold">Messages</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Desktop chat (existing floating design)
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-96">
      <Card className="h-full shadow-xl border-2">
        <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700 p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}