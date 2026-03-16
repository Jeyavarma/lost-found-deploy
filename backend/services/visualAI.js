const { pipeline, env } = require('@xenova/transformers');

// Configure environment for server usage
env.allowLocalModels = false;

class VisualAIService {
  constructor() {
    this.extractor = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('🤖 Initializing CLIP Vision Vector Extractor...');
        // Use Xenova's CLIP model for feature extraction
        // Quantized = true is CRITICAL for keeping RAM usage under 512MB on Render
        this.extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', {
          quantized: true,
        });
        this.isInitialized = true;
        console.log('✅ CLIP Vision Vector model loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load CLIP Vision Vector model:', error);
        this.isInitialized = false;
      }
    })();
    return this.initPromise;
  }

  async extractFeatures(imageUrl) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.extractor) return null;

    try {
      console.log(`🖼️ Extracting CLIP features for: ${imageUrl}`);
      // Output is a Tensor containing the 512-dim embedding
      const output = await this.extractor(imageUrl);

      const embeddingArray = Array.from(output.data);
      console.log('✅ Successfully extracted features (Vector Length: ' + embeddingArray.length + ')');
      return embeddingArray;

    } catch (error) {
      console.error('❌ CLIP Feature extraction error:', error.message);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

    // Safety check just in case vector lengths don't match (e.g. legacy data)
    const minLength = Math.min(vecA.length, vecB.length);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = new VisualAIService();