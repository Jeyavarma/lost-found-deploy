// Simple image matching using external API
class SimpleImageMatchingService {
  constructor() {
    this.enabled = true;
  }

  async extractFeatures(imageUrl) {
    try {
      // Use Google Vision API for object detection
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }]
          }]
        })
      });

      const data = await response.json();
      return data.responses[0]?.localizedObjectAnnotations || [];
    } catch (error) {
      console.error('Vision API error:', error);
      return null;
    }
  }

  calculateSimilarity(features1, features2) {
    if (!features1 || !features2) return 0;
    
    let matches = 0;
    features1.forEach(f1 => {
      features2.forEach(f2 => {
        if (f1.name === f2.name && f1.score > 0.5 && f2.score > 0.5) {
          matches++;
        }
      });
    });
    
    return matches / Math.max(features1.length, features2.length, 1);
  }

  getConfidenceLevel(similarity) {
    if (similarity >= 0.7) return 'High';
    if (similarity >= 0.5) return 'Medium';
    if (similarity >= 0.3) return 'Low';
    return null;
  }

  async findMatches(newItem, existingItems) {
    const matches = [];
    
    if (!newItem.imageFeatures) return matches;

    for (const item of existingItems) {
      if (!item.imageFeatures) continue;
      
      const similarity = this.calculateSimilarity(newItem.imageFeatures, item.imageFeatures);
      const confidence = this.getConfidenceLevel(similarity);
      
      if (confidence) {
        matches.push({ item, similarity, confidence });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }
}

module.exports = new SimpleImageMatchingService();