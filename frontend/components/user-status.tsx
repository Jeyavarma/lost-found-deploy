'use client'

import { useState, useEffect } from 'react'
import { BACKEND_URL } from '@/lib/config'

interface UserStatusProps {
  userId: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface UserStatus {
  status: 'online' | 'away' | 'offline'
  statusText: string
  deviceType: 'mobile' | 'desktop'
  lastSeen: string
}

export default function UserStatus({ userId, showText = false, size = 'md' }: UserStatusProps) {
  const [status, setStatus] = useState<UserStatus | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/presence/status/${userId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [userId])

  if (!status) return null

  const getStatusColor = () => {
    switch (status.status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'online': return '🟢'
      case 'away': return '🟡'
      case 'offline': return '🔴'
      default: return '🔴'
    }
  }

  const getDeviceIcon = () => {
    return status.deviceType === 'mobile' ? '📱' : '💻'
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} ${getStatusColor()} rounded-full`}></div>
        {status.deviceType && size !== 'sm' && (
          <span className="absolute -bottom-1 -right-1 text-xs">
            {getDeviceIcon()}
          </span>
        )}
      </div>
      {showText && (
        <span className="text-sm text-gray-600">
          {getStatusIcon()} {status.statusText}
        </span>
      )}
    </div>
  )
}