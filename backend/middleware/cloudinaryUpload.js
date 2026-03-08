const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Use Memory Storage and Manually Stream to Cloudinary
// This safely supports Next.js FormData APIs without legacy wrapper crashing
const storage = multer.memoryStorage();

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

// Create a middleware to manually upload the multer buffers to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  if (!req.files) return next();

  try {
    const uploadPromises = [];

    // req.files is an object containing arrays: { itemImage: [...], locationImage: [...] }
    for (const fieldname of Object.keys(req.files)) {
      for (let i = 0; i < req.files[fieldname].length; i++) {
        const file = req.files[fieldname][i];

        const promise = new Promise((resolve, reject) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1E9);

          const uploadStream = cloudinary.v2.uploader.upload_stream({
            folder: 'mcc-lost-found',
            public_id: `${file.fieldname}-${timestamp}-${random}`,
            transformation: [{ width: 800, height: 600, crop: 'limit' }]
          }, (err, result) => {
            if (err) return reject(err);
            // MUTATE the original file object so `items.js` can simply read `req.files.itemImage[0].path`!
            file.path = result.secure_url;
            file.filename = result.public_id;
            resolve();
          });

          // Stream the memory buffer into Cloudinary
          uploadStream.end(file.buffer);
        });

        uploadPromises.push(promise);
      }
    }

    await Promise.all(uploadPromises);
    next();
  } catch (error) {
    console.error("Cloudinary Stream Upload Error:", error);
    return res.status(500).json({ message: "Image compilation failed", error: error.message });
  }
};

module.exports = { upload, uploadToCloudinary };