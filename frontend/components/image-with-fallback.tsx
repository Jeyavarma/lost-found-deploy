"use client"

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'

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
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true)
          setLoading(false)
        }}
      />
    </div>
  )
}