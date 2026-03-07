const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const visualAI = require('../services/visualAI');
const Item = require('../models/Item');
const authMiddleware = require('../middleware/auth/authMiddleware');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/visual-search/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'search-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize Visual AI service
visualAI.initialize().catch(console.error);

/**
 * @swagger
 * /api/visual-ai/search:
 *   post:
 *     summary: Search for similar items using image
 *     tags: [Visual AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               category:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Similar items found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/search', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { threshold = 0.6, category, location } = req.body;
    const imagePath = req.file.path;

    // Get all items with embeddings from database
    const items = await Item.find({ 
      imageEmbedding: { $exists: true, $ne: null },
      status: 'active'
    }).populate('reportedBy', 'name email');

    // Convert to format expected by visual AI service
    const itemsDatabase = items.map(item => ({
      _id: item._id,
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location,
      imagePath: item.imagePath,
      imageEmbedding: item.imageEmbedding,
      reportedBy: item.reportedBy,
      createdAt: item.createdAt,
      type: item.type
    }));

    // Perform visual search
    const searchResults = await visualAI.advancedSearch(imagePath, itemsDatabase, {
      threshold: parseFloat(threshold),
      category,
      location,
      includeAnalysis: true
    });

    // Clean up uploaded search image
    try {
      await fs.unlink(imagePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup search image:', cleanupError);
    }

    if (!searchResults.success) {
      return res.status(500).json({ 
        error: 'Visual search failed', 
        details: searchResults.error 
      });
    }

    res.json({
      success: true,
      results: searchResults.results.map(result => ({
        item: {
          id: result.item._id,
          title: result.item.title,
          description: result.item.description,
          category: result.item.category,
          location: result.item.location,
          imagePath: result.item.imagePath,
          type: result.item.type,
          reportedBy: result.item.reportedBy,
          createdAt: result.item.createdAt
        },
        similarity: result.similarity,
        matchPercentage: result.matchPercentage,
        analysis: result.analysis
      })),
      totalFound: searchResults.totalFound,
      searchCriteria: searchResults.searchCriteria
    });

  } catch (error) {
    console.error('Visual search error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup search image on error:', cleanupError);
      }
    }

    res.status(500).json({ 
      error: 'Visual search failed', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/visual-ai/compare:
 *   post:
 *     summary: Compare two images for differences
 *     tags: [Visual AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image1:
 *                 type: string
 *                 format: binary
 *               image2:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Comparison completed
 *       400:
 *         description: Invalid input
 */
router.post('/compare', authMiddleware, upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.image1 || !req.files.image2) {
      return res.status(400).json({ error: 'Two images are required for comparison' });
    }

    const image1Path = req.files.image1[0].path;
    const image2Path = req.files.image2[0].path;

    // Perform difference detection
    const comparison = await visualAI.detectDifferences(image1Path, image2Path);

    // Clean up uploaded images
    try {
      await Promise.all([
        fs.unlink(image1Path),
        fs.unlink(image2Path)
      ]);
    } catch (cleanupError) {
      console.warn('Failed to cleanup comparison images:', cleanupError);
    }

    if (!comparison) {
      return res.status(500).json({ error: 'Image comparison failed' });
    }

    res.json({
      success: true,
      similarity: Math.round(comparison.overallSimilarity * 100),
      differences: comparison.differences,
      recommendation: comparison.recommendation,
      analysis: {
        areSimilar: comparison.overallSimilarity > 0.8,
        confidenceLevel: comparison.overallSimilarity > 0.9 ? 'high' : 
                        comparison.overallSimilarity > 0.7 ? 'medium' : 'low'
      }
    });

  } catch (error) {
    console.error('Image comparison error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const cleanupPromises = [];
      if (req.files.image1) cleanupPromises.push(fs.unlink(req.files.image1[0].path));
      if (req.files.image2) cleanupPromises.push(fs.unlink(req.files.image2[0].path));
      
      try {
        await Promise.all(cleanupPromises);
      } catch (cleanupError) {
        console.warn('Failed to cleanup comparison images on error:', cleanupError);
      }
    }

    res.status(500).json({ 
      error: 'Image comparison failed', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/visual-ai/process-item:
 *   post:
 *     summary: Process item image to generate embedding
 *     tags: [Visual AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item processed successfully
 *       404:
 *         description: Item not found
 */
router.post('/process-item', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!item.imagePath) {
      return res.status(400).json({ error: 'Item has no image to process' });
    }

    // Process the item's image
    const result = await visualAI.processItemImage(item.imagePath);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to process item image', 
        details: result.error 
      });
    }

    // Update item with embedding
    item.imageEmbedding = result.embedding;
    item.embeddingGeneratedAt = new Date();
    await item.save();

    res.json({
      success: true,
      message: 'Item image processed successfully',
      itemId: item._id,
      embeddingSize: result.embedding ? result.embedding.length : 0,
      processedAt: result.timestamp
    });

  } catch (error) {
    console.error('Process item error:', error);
    res.status(500).json({ 
      error: 'Failed to process item', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/visual-ai/batch-process:
 *   post:
 *     summary: Process multiple items to generate embeddings
 *     tags: [Visual AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch processing completed
 */
router.post('/batch-process', authMiddleware, async (req, res) => {
  try {
    // Find items without embeddings
    const items = await Item.find({
      imagePath: { $exists: true, $ne: null },
      imageEmbedding: { $exists: false }
    }).limit(50); // Process 50 items at a time

    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const item of items) {
      try {
        const result = await visualAI.processItemImage(item.imagePath);
        
        if (result.success) {
          item.imageEmbedding = result.embedding;
          item.embeddingGeneratedAt = new Date();
          await item.save();
          results.processed++;
        } else {
          results.failed++;
          results.errors.push({
            itemId: item._id,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: item._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Batch processing completed',
      results,
      totalItems: items.length
    });

  } catch (error) {
    console.error('Batch process error:', error);
    res.status(500).json({ 
      error: 'Batch processing failed', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/visual-ai/status:
 *   get:
 *     summary: Get Visual AI service status
 *     tags: [Visual AI]
 *     responses:
 *       200:
 *         description: Service status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: visualAI.isInitialized ? 'ready' : 'initializing',
    modelLoaded: visualAI.isInitialized,
    features: [
      'Image similarity search',
      'Difference detection',
      'Batch processing',
      'Advanced filtering'
    ]
  });
});

module.exports = router;