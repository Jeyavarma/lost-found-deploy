import { useState } from 'react'
import { processImage, processImageFromUrl, initializeModels } from '@/lib/visual-ai'

export const useVisualAI = () => {
  const [processing, setProcessing] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const loadModels = async () => {
    if (modelsLoaded) return true
    
    try {
      await initializeModels()
      setModelsLoaded(true)
      return true
    } catch (error) {
      console.error('Failed to load AI models:', error)
      return false
    }
  }

  const processImageFile = async (file: File) => {
    setProcessing(true)
    try {
      await loadModels()
      const result = await processImage(file)
      return result
    } catch (error) {
      console.error('Image processing error:', error)
      throw error
    } finally {
      setProcessing(false)
    }
  }

  const processCloudinaryImage = async (imageUrl: string) => {
    setProcessing(true)
    try {
      await loadModels()
      const result = await processImageFromUrl(imageUrl)
      return result
    } catch (error) {
      console.error('Cloudinary image processing error:', error)
      throw error
    } finally {
      setProcessing(false)
    }
  }

  const enhanceItemData = async (itemData: any, imageFile?: File) => {
    if (!imageFile) return itemData

    try {
      const aiResult = await processImageFile(imageFile)
      
      return {
        ...itemData,
        imageFeatures: aiResult.features,
        detectedObjects: aiResult.objects,
        aiCategory: aiResult.objects.length > 0 ? 
          suggestCategoryFromObjects(aiResult.objects) : undefined
      }
    } catch (error) {
      console.error('AI enhancement error:', error)
      return itemData // Return original data if AI fails
    }
  }

  return {
    processing,
    modelsLoaded,
    loadModels,
    processImageFile,
    processCloudinaryImage,
    enhanceItemData
  }
}

const suggestCategoryFromObjects = (objects: any[]): string => {
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
  
  const topObject = objects.reduce((prev, current) => 
    prev.confidence > current.confidence ? prev : current
  )
  
  return categoryMap[topObject.class] || 'Other'
}