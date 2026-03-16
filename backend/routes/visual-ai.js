const express = require('express')
const router = express.Router()
const Item = require('../models/Item')
const authMiddleware = require('../middleware/auth/authMiddleware')
const visualAIService = require('../services/visualAI')
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload')
router.post('/store-features', authMiddleware, async (req, res) => {
  try {
    const { itemId, features, detectedObjects, aiCategory } = req.body

    const item = await Item.findById(itemId)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    // Update item with AI features
    item.imageFeatures = features
    item.detectedObjects = detectedObjects
    item.aiCategory = aiCategory
    await item.save()

    res.json({ message: 'AI features stored successfully' })
  } catch (error) {
    console.error('Store features error:', error)
    res.status(500).json({ error: 'Failed to store AI features' })
  }
})

// Process image from Cloudinary URL (placeholder for future server-side processing)
router.post('/process-image', async (req, res) => {
  try {
    const { imageUrl } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' })
    }

    // Currently processing happens on frontend with TensorFlow.js
    // This endpoint exists for future server-side processing if needed
    res.json({
      message: 'Image processing initiated',
      imageUrl,
      note: 'Processing happens client-side with TensorFlow.js'
    })
  } catch (error) {
    console.error('Process image error:', error)
    res.status(500).json({ error: 'Failed to process image' })
  }
})

// Find visually similar items by uploading a new image
router.post('/search', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }]), uploadToCloudinary, async (req, res) => {
  try {
    const threshold = parseFloat(req.body.threshold) || 0.6
    const categoryQuery = req.body.category
    const locationQuery = req.body.location

    // uploadToCloudinary populated req.files
    if (!req.files || !req.files.image || !req.files.image[0]) {
      return res.status(400).json({ error: 'Image is required' })
    }

    const imageUrl = req.files.image[0].path
    console.log('🔍 Visual Search received image:', imageUrl)

    // Extract features using CLIP
    const features = await visualAIService.extractFeatures(imageUrl)

    if (!features) {
      return res.status(500).json({ error: 'Failed to extract AI features from image' })
    }

    // Build filter query based on category and location
    const query = { imageFeatures: { $exists: true, $not: { $size: 0 } } }
    if (categoryQuery) {
      query.category = { $regex: new RegExp(categoryQuery, 'i') }
    }
    if (locationQuery) {
      query.location = { $regex: new RegExp(locationQuery, 'i') }
    }

    // Get items with features
    const items = await Item.find(query).populate('reportedBy', 'name email').lean()

    const similarities = []

    for (const item of items) {
      if (item.imageFeatures && item.imageFeatures.length > 0) {
        const similarity = visualAIService.cosineSimilarity(features, item.imageFeatures)

        if (similarity >= threshold) {
          similarities.push({
            item: {
              id: item._id,
              title: item.title,
              description: item.description,
              category: item.category,
              location: item.location,
              imagePath: item.imageUrl,
              type: item.status,
              reportedBy: item.reportedBy,
              createdAt: item.createdAt
            },
            similarity,
            matchPercentage: Math.round(similarity * 100),
            analysis: {
              recommendation: similarity > 0.85 ? 'High confidence match' : 'Possible match - verify details',
              differences: []
            }
          })
        }
      }
    }

    // Sort descending by similarity
    similarities.sort((a, b) => b.similarity - a.similarity)

    res.json({ results: similarities.slice(0, 10) })
  } catch (error) {
    console.error('Find similar error:', error)
    res.status(500).json({ error: 'Failed to find similar items' })
  }
})

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) return 0

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  if (norm1 === 0 || norm2 === 0) return 0

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

module.exports = router