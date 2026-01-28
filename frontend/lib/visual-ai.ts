import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

let mobilenetModel: mobilenet.MobileNet | null = null
let cocoModel: cocoSsd.ObjectDetection | null = null

// Initialize models
export const initializeModels = async () => {
  try {
    console.log('🤖 Loading AI models...')
    
    // Load MobileNet for feature extraction
    if (!mobilenetModel) {
      mobilenetModel = await mobilenet.load()
      console.log('✅ MobileNet loaded')
    }
    
    // Load COCO-SSD for object detection
    if (!cocoModel) {
      cocoModel = await cocoSsd.load()
      console.log('✅ COCO-SSD loaded')
    }
    
    return { mobilenet: mobilenetModel, coco: cocoModel }
  } catch (error) {
    console.error('❌ Error loading AI models:', error)
    throw error
  }
}

// Extract features from image for similarity matching
export const extractImageFeatures = async (imageElement: HTMLImageElement): Promise<number[]> => {
  try {
    if (!mobilenetModel) {
      await initializeModels()
    }
    
    // Convert image to tensor
    const tensor = tf.browser.fromPixels(imageElement)
      .resizeNearestNeighbor([224, 224])
      .expandDims(0)
      .cast('float32')
    
    // Extract features using MobileNet
    const features = mobilenetModel!.infer(tensor, true) as tf.Tensor
    const featureArray = await features.data()
    
    // Cleanup tensors
    tensor.dispose()
    features.dispose()
    
    return Array.from(featureArray)
  } catch (error) {
    console.error('❌ Error extracting features:', error)
    throw error
  }
}

// Detect objects in image
export const detectObjects = async (imageElement: HTMLImageElement) => {
  try {
    if (!cocoModel) {
      await initializeModels()
    }
    
    const predictions = await cocoModel!.detect(imageElement)
    
    return predictions.map(pred => ({
      class: pred.class,
      confidence: pred.score,
      bbox: pred.bbox
    }))
  } catch (error) {
    console.error('❌ Error detecting objects:', error)
    throw error
  }
}

// Calculate cosine similarity between two feature vectors
export const calculateSimilarity = (features1: number[], features2: number[]): number => {
  if (features1.length !== features2.length) {
    return 0
  }
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i]
    norm1 += features1[i] * features1[i]
    norm2 += features2[i] * features2[i]
  }
  
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  return Math.max(0, Math.min(1, similarity)) // Clamp between 0 and 1
}

// Process image file and return features + objects
export const processImage = async (file: File) => {
  return new Promise<{
    features: number[]
    objects: any[]
    imageUrl: string
  }>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = async () => {
      try {
        const features = await extractImageFeatures(img)
        const objects = await detectObjects(img)
        const imageUrl = URL.createObjectURL(file)
        
        resolve({ features, objects, imageUrl })
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Process image from Cloudinary URL
export const processImageFromUrl = async (imageUrl: string) => {
  return new Promise<{
    features: number[]
    objects: any[]
  }>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = async () => {
      try {
        const features = await extractImageFeatures(img)
        const objects = await detectObjects(img)
        
        resolve({ features, objects })
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image from URL'))
    img.src = imageUrl
  })
}

// Suggest category based on detected objects
export const suggestCategoryFromObjects = (objects: any[]): string => {
  if (objects.length === 0) return 'Other'
  
  const categoryMap: { [key: string]: string } = {
    'cell phone': 'Electronics',
    'laptop': 'Electronics',
    'mouse': 'Electronics',
    'keyboard': 'Electronics',
    'book': 'Textbooks',
    'backpack': 'Personal Items',
    'handbag': 'Personal Items',
    'bottle': 'Personal Items',
    'cup': 'Personal Items',
    'umbrella': 'Personal Items',
    'tie': 'Clothing',
    'sports ball': 'Sports Equipment',
    'frisbee': 'Sports Equipment',
    'scissors': 'Academic',
    'teddy bear': 'Personal Items'
  }
  
  // Get the object with highest confidence
  const topObject = objects.reduce((prev, current) => 
    prev.confidence > current.confidence ? prev : current
  )
  
  return categoryMap[topObject.class] || 'Other'
}

// Find visually similar items from database
export const findSimilarItems = async (targetFeatures: number[], items: any[], threshold = 0.7) => {
  const similarities = items
    .filter(item => item.imageFeatures && item.imageFeatures.length > 0)
    .map(item => ({
      ...item,
      similarity: calculateSimilarity(targetFeatures, item.imageFeatures)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
  
  return similarities
}