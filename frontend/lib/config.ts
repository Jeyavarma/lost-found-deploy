// Validate required environment variables
const validateEnv = () => {
  const required = [
    'NEXT_PUBLIC_BACKEND_URL',
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'NEXT_PUBLIC_EMAILJS_SERVICE_ID'
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(`Missing environment variables: ${missing.join(', ')}`)
  }
}

validateEnv()

// Determine backend URL: use process env for SSR, NEXT_PUBLIC for client, fallback to localhost
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'