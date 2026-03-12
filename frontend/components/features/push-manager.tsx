"use client"

import { useEffect, useState } from 'react'
import { getAuthToken, isAuthenticated } from '@/lib/auth'
import { BACKEND_URL } from '@/lib/config'
import { toast } from 'sonner'

function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export default function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [])

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js')
            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)

            // If we're authenticated and have a subscription but it's not saved to backend yet,
            // or if we just want to ensure it's synced on load
            if (sub && isAuthenticated()) {
                await sendSubscriptionToBackEnd(sub)
            }
        } catch (error) {
            console.error('Service Worker registration failed:', error)
        }
    }

    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready

            // Note: You must provide NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
            if (!vapidPublicKey) {
                console.error('VAPID public key not found')
                return
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
            })

            setSubscription(sub)
            if (isAuthenticated()) {
                await sendSubscriptionToBackEnd(sub)
                toast.success("Successfully enabled push notifications!")
            } else {
                toast.info("Notifications enabled. Please log in to receive item alerts.")
            }

        } catch (error) {
            console.error('Failed to subscribe from Push service:', error)
            toast.error('Failed to enable push notifications')
        }
    }

    async function sendSubscriptionToBackEnd(subscription: PushSubscription) {
        const token = getAuthToken()
        if (!token) return

        try {
            await fetch(`${BACKEND_URL}/api/auth/push-subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subscription })
            })
        } catch (error) {
            console.error('Failed to send push subscription to backend:', error)
        }
    }

    // We expose a global method to trigger subscription manually, 
    // or we could render a button somewhere if we exported it as a regular component
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).subscribeToPushNotifications = subscribeToPush;
        }
    }, [isSupported]);

    return null // This is a logic-only component
}
