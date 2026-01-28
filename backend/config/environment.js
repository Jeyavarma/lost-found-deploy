// Environment configuration with fallbacks
const config = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  
  // CORS Origins
  CORS_ORIGINS: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:3002'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // Email (if needed)
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
}

// Enhanced validation
const validateConfig = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET']
  const production = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  
  const missing = required.filter(key => !config[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    console.error('❌ Please set these in your .env file or environment')
    process.exit(1)
  }
  
  // JWT Secret validation
  if (!config.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required for security')
    process.exit(1)
  }
  
  if (config.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters for security')
    process.exit(1)
  }
  
  // Production-specific validation
  if (config.NODE_ENV === 'production') {
    const missingProd = production.filter(key => !config[key])
    if (missingProd.length > 0) {
      console.warn('⚠️  Missing production environment variables:', missingProd)
    }
  }
  
  console.log('✅ Environment configuration validated')
}

// Validate on load
validateConfig()

module.exports = config