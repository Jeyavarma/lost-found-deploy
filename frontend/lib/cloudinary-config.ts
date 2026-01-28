// Cloudinary configuration
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'difjxpgh1',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'mcc_items',
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // Upload settings
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  
  // Transformation settings
  transformations: {
    thumbnail: 'w_150,h_150,c_fill,q_auto',
    medium: 'w_400,h_300,c_fill,q_auto',
    large: 'w_800,h_600,c_fill,q_auto'
  }
}

// Upload function
export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
  formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName)
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to upload image')
  }
  
  const data = await response.json()
  return data.secure_url
}

// Generate optimized URL
export function getOptimizedImageUrl(url: string, transformation: keyof typeof CLOUDINARY_CONFIG.transformations): string {
  if (!url.includes('cloudinary.com')) return url
  
  const transform = CLOUDINARY_CONFIG.transformations[transformation]
  return url.replace('/upload/', `/upload/${transform}/`)
}