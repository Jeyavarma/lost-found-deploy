import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import ImprovedFloatingChat from '@/components/improved-floating-chat'
import PresenceProvider from '@/components/presence-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'MCC Lost & Found',
  description: 'Lost and Found system for MCC Campus',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <PresenceProvider>
          {children}
          <ImprovedFloatingChat />
        </PresenceProvider>
      </body>
    </html>
  )
}
