// Enhanced image upload with fallbacks and validation
export class ImageUploadManager {
  private maxSize = 5 * 1024 * 1024 // 5MB
  private allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  // Validate image file
  validateImage(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' }
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
    }

    if (file.size > this.maxSize) {
      return { valid: false, error: 'Image must be less than 5MB' }
    }

    return { valid: true }
  }

  // Compress image before upload
  async compressImage(file: File, maxWidth = 800): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }))
          } else {
            resolve(file)
          }
        }, file.type, 0.8)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Upload with retry logic
  async uploadImage(file: File, endpoint: string): Promise<string> {
    const validation = this.validateImage(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Compress image
    const compressedFile = await this.compressImage(file)

    const formData = new FormData()
    formData.append('image', compressedFile)

    let lastError: Error
    
    // Retry up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const data = await response.json()
        return data.imageUrl || data.url
      } catch (error) {
        lastError = error as Error
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw lastError!
  }

  // Create preview URL
  createPreview(file: File): string {
    return URL.createObjectURL(file)
  }

  // Cleanup preview URL
  cleanupPreview(url: string) {
    URL.revokeObjectURL(url)
  }
}

export const imageUpload = new ImageUploadManager()