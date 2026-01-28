"use client"

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

interface ImageWithFallbackProps {
  src?: string
  alt: string
  className?: string
  fallbackText?: string
}

export default function ImageWithFallback({ 
  src, 
  alt, 
  className = "", 
  fallbackText = "No Image" 
}: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || imageError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          <span className="text-sm">{fallbackText}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true)
          setLoading(false)
        }}
      />
    </div>
  )
}