"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, AlertCircle } from "lucide-react"
import { socketManager } from "@/lib/socket"

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  useEffect(() => {
    const checkConnection = () => {
      if (socketManager.isConnected()) {
        setStatus('connected')
        setLastSeen(new Date())
      } else {
        setStatus('disconnected')
      }
    }

    // Check immediately
    checkConnection()

    // Check every 5 seconds
    const interval = setInterval(checkConnection, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3" />,
          text: 'Online',
          className: 'bg-green-100 text-green-700 border-green-200'
        }
      case 'connecting':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: 'Connecting...',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
      default:
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: lastSeen ? `Last seen ${lastSeen.toLocaleTimeString()}` : 'Offline',
          className: 'bg-red-100 text-red-700 border-red-200'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </Badge>
  )
}