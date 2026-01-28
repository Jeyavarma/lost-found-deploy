const express = require('express')
const router = express.Router()
const Item = require('../models/Item')
const authMiddleware = require('../middleware/auth/authMiddleware')

// Store image features when item is created
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

// Find visually similar items
router.post('/find-similar', authMiddleware, async (req, res) => {
  try {
    const { features, category, location } = req.body
    
    if (!features || features.length === 0) {
      return res.status(400).json({ error: 'Image features required' })
    }
    
    // Get all items with image features
    const items = await Item.find({ 
      imageFeatures: { $exists: true, $ne: [] }
    }).populate('reportedBy', 'name email')
    
    const similarities = []
    
    items.forEach(item => {
      if (item.imageFeatures && item.imageFeatures.length > 0) {
        const similarity = calculateCosineSimilarity(features, item.imageFeatures)
        
        if (similarity > 0.6) { // Threshold for similarity
          similarities.push({
            item: item.toObject(),
            similarity,
            confidence: similarity > 0.8 ? 'High' : similarity > 0.7 ? 'Medium' : 'Low',
            matchType: 'visual'
          })
        }
      }
    })
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity)
    
    res.json({ matches: similarities.slice(0, 10) })
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