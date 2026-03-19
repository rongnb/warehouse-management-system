import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'

// 图像识别结果接口
export interface RecognitionResult {
  modelName: string
  manufacturer: string
  confidence: number
}

// 图像识别类
export class ImageRecognizer {
  private model: any = null
  private initialized: boolean = false

  // 初始化模型
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      console.log('正在加载图像识别模型...')
      // 加载MobileNet模型
      this.model = await mobilenet.load()
      this.initialized = true
      console.log('图像识别模型加载成功')
      return true
    } catch (error) {
      console.error('图像识别模型加载失败:', error)
      return false
    }
  }

  // 识别图像
  async recognize(imageData: string): Promise<RecognitionResult> {
    if (!this.initialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        throw new Error('模型未成功初始化')
      }
    }

    try {
      // 创建图像对象
      const img = new Image()
      img.src = imageData

      // 等待图像加载
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // 使用MobileNet模型识别图像
      const predictions = await this.model.classify(img)
      console.log('模型识别结果:', predictions)

      // 解析模型结果，尝试识别型号和厂家
      const result = this.parsePredictions(predictions)
      return result
    } catch (error) {
      console.error('图像识别失败:', error)
      throw new Error('图像识别失败')
    }
  }

  // 解析模型预测结果
  private parsePredictions(predictions: any[]): RecognitionResult {
    // 简单的结果解析，可根据实际需要进行更复杂的解析
    let modelName = '未识别'
    let manufacturer = '未识别'
    let maxConfidence = 0

    // 查找最高置信度的预测
    for (const prediction of predictions) {
      if (prediction.probability > maxConfidence) {
        maxConfidence = prediction.probability
      }
    }

    // 尝试解析型号和厂家
    const topPrediction = predictions[0]
    if (topPrediction) {
      // 示例：尝试从预测标签中提取信息
      const label = topPrediction.className.toLowerCase()

      // 尝试识别一些常见的产品类型
      const productTypes = ['laptop', 'phone', 'tablet', 'camera', 'headphone', 'keyboard', 'mouse']

      // 尝试识别厂家
      const manufacturers = ['apple', 'samsung', 'huawei', 'xiaomi', 'sony', 'dell', 'hp']

      for (const type of productTypes) {
        if (label.includes(type)) {
          modelName = this.capitalizeFirstLetter(type)
          break
        }
      }

      for (const manu of manufacturers) {
        if (label.includes(manu)) {
          manufacturer = this.capitalizeFirstLetter(manu)
          break
        }
      }

      // 如果无法识别类型，则使用模型返回的标签
      if (modelName === '未识别') {
        modelName = topPrediction.className.split(',')[0] || '未识别'
      }
    }

    return {
      modelName,
      manufacturer,
      confidence: maxConfidence
    }
  }

  // 首字母大写
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // 清理资源
  async dispose(): Promise<void> {
    if (this.model) {
      // 目前TensorFlow.js模型没有dispose方法，我们可以通过内存管理方式
      this.model = null
    }
    this.initialized = false
  }
}

// 创建图像识别器实例
export const imageRecognizer = new ImageRecognizer()

// 初始化识别器
export const initializeImageRecognizer = async (): Promise<boolean> => {
  return await imageRecognizer.initialize()
}

// 识别图像的便捷函数
export const recognizeImage = async (imageData: string): Promise<RecognitionResult> => {
  return await imageRecognizer.recognize(imageData)
}

// 清理函数
export const disposeImageRecognizer = async (): Promise<void> => {
  await imageRecognizer.dispose()
}
