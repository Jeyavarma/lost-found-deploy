const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class VisualAIService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Load MobileNet for feature extraction (lightweight alternative to ResNet50)
      this.model = await tf.loadLayersModel('https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1');
      this.isInitialized = true;
      console.log('✅ Visual AI model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Visual AI model:', error);
      // Fallback to simple image comparison
      this.isInitialized = false;
    }
  }

  async preprocessImage(imagePath) {
    try {
      // Resize and normalize image
      const imageBuffer = await sharp(imagePath)
        .resize(224, 224)
        .removeAlpha()
        .raw()
        .toBuffer();

      // Convert to tensor
      const tensor = tf.tensor3d(new Uint8Array(imageBuffer), [224, 224, 3])
        .div(255.0)
        .expandDims(0);

      return tensor;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return null;
    }
  }

  async extractFeatures(imagePath) {
    if (!this.isInitialized) {
      return this.extractSimpleFeatures(imagePath);
    }

    try {
      const preprocessed = await this.preprocessImage(imagePath);
      if (!preprocessed) return null;

      // Extract features using the model
      const features = await this.model.predict(preprocessed);
      const embedding = await features.data();
      
      // Cleanup tensors
      preprocessed.dispose();
      features.dispose();

      return Array.from(embedding);
    } catch (error) {
      console.error('Feature extraction error:', error);
      return this.extractSimpleFeatures(imagePath);
    }
  }

  async extractSimpleFeatures(imagePath) {
    try {
      // Fallback: Extract basic image statistics
      const { data, info } = await sharp(imagePath)
        .resize(64, 64)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate color histogram and basic features
      const features = [];
      const pixels = new Uint8Array(data);
      
      // Color averages (RGB)
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < pixels.length; i += 3) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
      }
      
      const pixelCount = pixels.length / 3;
      features.push(r / pixelCount / 255);
      features.push(g / pixelCount / 255);
      features.push(b / pixelCount / 255);

      // Add more basic features (brightness, contrast approximation)
      const brightness = (r + g + b) / (3 * pixelCount * 255);
      features.push(brightness);

      // Pad to make it a reasonable size vector
      while (features.length < 128) {
        features.push(Math.random() * 0.1); // Small random values
      }

      return features;
    } catch (error) {
      console.error('Simple feature extraction error:', error);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findSimilarItems(queryImagePath, itemsDatabase, threshold = 0.7) {
    try {
      const queryFeatures = await this.extractFeatures(queryImagePath);
      if (!queryFeatures) return [];

      const similarities = [];

      for (const item of itemsDatabase) {
        if (!item.imageEmbedding) continue;

        const similarity = this.cosineSimilarity(queryFeatures, item.imageEmbedding);
        
        if (similarity >= threshold) {
          similarities.push({
            item,
            similarity: Math.round(similarity * 100) / 100,
            matchPercentage: Math.round(similarity * 100)
          });
        }
      }

      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities.slice(0, 10); // Return top 10 matches
    } catch (error) {
      console.error('Similar items search error:', error);
      return [];
    }
  }

  async detectDifferences(imagePath1, imagePath2) {
    try {
      // Simple difference detection using image statistics
      const features1 = await this.extractSimpleFeatures(imagePath1);
      const features2 = await this.extractSimpleFeatures(imagePath2);

      if (!features1 || !features2) return null;

      const differences = [];
      
      // Compare color differences
      const colorDiff = Math.abs(features1[0] - features2[0]) + 
                       Math.abs(features1[1] - features2[1]) + 
                       Math.abs(features1[2] - features2[2]);

      if (colorDiff > 0.1) {
        differences.push({
          type: 'color',
          severity: colorDiff > 0.3 ? 'high' : 'medium',
          description: 'Color differences detected'
        });
      }

      // Compare brightness
      const brightnessDiff = Math.abs(features1[3] - features2[3]);
      if (brightnessDiff > 0.1) {
        differences.push({
          type: 'brightness',
          severity: brightnessDiff > 0.3 ? 'high' : 'medium',
          description: 'Brightness differences detected'
        });
      }

      return {
        overallSimilarity: this.cosineSimilarity(features1, features2),
        differences,
        recommendation: differences.length === 0 ? 'Very similar items' : 
                       differences.length <= 2 ? 'Similar with minor differences' : 
                       'Significant differences detected'
      };
    } catch (error) {
      console.error('Difference detection error:', error);
      return null;
    }
  }

  async processItemImage(imagePath) {
    try {
      const embedding = await this.extractFeatures(imagePath);
      return {
        success: true,
        embedding,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Process item image error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Advanced search with multiple criteria
  async advancedSearch(queryImagePath, itemsDatabase, options = {}) {
    const {
      threshold = 0.6,
      category = null,
      location = null,
      dateRange = null,
      includeAnalysis = true
    } = options;

    try {
      let filteredItems = itemsDatabase;

      // Apply filters
      if (category) {
        filteredItems = filteredItems.filter(item => 
          item.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      if (location) {
        filteredItems = filteredItems.filter(item => 
          item.location?.toLowerCase().includes(location.toLowerCase())
        );
      }

      if (dateRange) {
        const { start, end } = dateRange;
        filteredItems = filteredItems.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate >= start && itemDate <= end;
        });
      }

      // Find similar items
      const similarItems = await this.findSimilarItems(queryImagePath, filteredItems, threshold);

      // Add analysis if requested
      if (includeAnalysis && similarItems.length > 0) {
        for (const result of similarItems.slice(0, 3)) { // Analyze top 3
          if (result.item.imagePath) {
            const analysis = await this.detectDifferences(queryImagePath, result.item.imagePath);
            result.analysis = analysis;
          }
        }
      }

      return {
        success: true,
        results: similarItems,
        totalFound: similarItems.length,
        searchCriteria: {
          threshold,
          category,
          location,
          dateRange: dateRange ? `${dateRange.start} to ${dateRange.end}` : null
        }
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }
}

module.exports = new VisualAIService();