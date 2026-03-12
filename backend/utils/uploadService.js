/**
 * utils/uploadService.js
 *
 * Dual-provider image upload service for chat images.
 *
 * Strategy:
 *   1. Try Cloudinary first (primary provider).
 *   2. If Cloudinary throws (credits exhausted, network error, etc.),
 *      automatically attempt Firebase Storage as the fallback.
 *   3. If Firebase is also unavailable, the error propagates to the caller.
 *
 * Returns:
 *   { url: string, provider: "cloudinary" | "firebase" }
 */

const cloudinary = require('../config/cloudinary');
const { storageBucket } = require('../config/firebase');

// ─── Cloudinary upload (primary) ──────────────────────────────────────────────
/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {string} roomId   - Used to organise into a sub-folder
 * @returns {Promise<string>} Secure Cloudinary URL
 */
async function uploadToCloudinary(buffer, roomId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                folder: `chat_images/${roomId}`,
                resource_type: 'image',
                // Automatically optimise delivery format and quality
                fetch_format: 'auto',
                quality: 'auto'
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

// ─── Firebase Storage upload (fallback) ───────────────────────────────────────
/**
 * Upload a buffer to Firebase Storage.
 * @param {Buffer}  buffer      - File buffer
 * @param {string}  roomId      - Used for folder organisation
 * @param {string}  mimetype    - e.g. 'image/jpeg'
 * @returns {Promise<string>}   Public download URL
 */
async function uploadToFirebase(buffer, roomId, mimetype = 'image/jpeg') {
    if (!storageBucket) {
        throw new Error('Firebase Storage is not configured. Set FIREBASE_* env vars.');
    }

    const timestamp = Date.now();
    const extension = mimetype.split('/')[1] || 'jpg';
    const filePath = `chat_images/${roomId}/${timestamp}.${extension}`;

    const file = storageBucket.file(filePath);

    // Write buffer and set metadata in one operation
    await file.save(buffer, {
        metadata: { contentType: mimetype },
        // Public read access so the URL works without authentication
        public: true,
        resumable: false // For small files (< 5 MB) non-resumable is faster
    });

    // Make the file publicly readable and get its download URL
    await file.makePublic();
    const url = `https://storage.googleapis.com/${storageBucket.name}/${filePath}`;
    return url;
}

// ─── Primary exported function ────────────────────────────────────────────────
/**
 * uploadChatImage — try Cloudinary, fall back to Firebase on failure.
 *
 * @param {{ buffer: Buffer, mimetype: string }} file  multer file object
 * @param {string} roomId
 * @returns {Promise<{ url: string, provider: 'cloudinary' | 'firebase' }>}
 */
async function uploadChatImage(file, roomId) {
    // ── Step 1: Try Cloudinary ──
    try {
        const url = await uploadToCloudinary(file.buffer, roomId);
        return { url, provider: 'cloudinary' };
    } catch (cloudinaryErr) {
        // Log so DevOps / engineers can track Cloudinary health
        console.warn(
            '⚠️  Cloudinary upload failed — switching to Firebase fallback.',
            cloudinaryErr.message
        );
    }

    // ── Step 2: Cloudinary failed — try Firebase ──
    const url = await uploadToFirebase(file.buffer, roomId, file.mimetype);
    return { url, provider: 'firebase' };
}

module.exports = { uploadChatImage, uploadToCloudinary, uploadToFirebase };
