/**
 * utils/uploadService.js
 *
 * Cloudinary image upload service for chat images.
 * Returns: { url: string, provider: "cloudinary" }
 */

const cloudinary = require('../config/cloudinary');

async function uploadToCloudinary(buffer, roomId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                folder: `chat_images/${roomId}`,
                resource_type: 'image',
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

async function uploadChatImage(file, roomId) {
    try {
        const url = await uploadToCloudinary(file.buffer, roomId);
        return { url, provider: 'cloudinary' };
    } catch (error) {
        console.error('⚠️  Cloudinary upload failed:', error.message);
        throw error;
    }
}

module.exports = { uploadChatImage, uploadToCloudinary };
