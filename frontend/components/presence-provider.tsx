'use client'

import { useEffect } from 'react'
import { presenceManager } from '@/lib/presence'
import { isAuthenticated } from '@/lib/auth'

export default function PresenceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (isAuthenticated()) {
      presenceManager.initialize()
    }

    return () => {
      presenceManager.destroy()
    }
  }, [])

  return <>{children}</>
}