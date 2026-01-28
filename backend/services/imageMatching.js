// Disabled TensorFlow.js to prevent backend crashes
class ImageMatchingService {
  constructor() {
    this.enabled = false;
  }

  async initialize() {
    return false;
  }

  async extractFeatures(imageUrl) {
    return null;
  }

  calculateSimilarity(features1, features2) {
    return 0;
  }

  getConfidenceLevel(similarity) {
    return null;
  }

  async findMatches(newItem, existingItems) {
    return [];
  }
}

module.exports = new ImageMatchingService();