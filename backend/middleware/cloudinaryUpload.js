const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Fix CloudinaryStorage import issue
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'mcc-lost-found',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [{ width: 800, height: 600, crop: 'limit' }],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        return `${file.fieldname}-${timestamp}-${random}`;
      }
    },
  });
} catch (error) {
  console.log('CloudinaryStorage error, using memory storage:', error.message);
  // Fallback to memory storage if CloudinaryStorage fails
  storage = multer.memoryStorage();
}

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2, // Max 2 files per request
    fieldSize: 1024 * 1024 // 1MB field size limit
  },
  fileFilter: (req, file, cb) => {
    // Strict MIME type checking
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images allowed'), false);
    }
    
    // Check file extension matches MIME type
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Invalid file extension'), false);
    }
    
    // Prevent malicious filenames
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    cb(null, true);
  }
});

module.exports = upload;