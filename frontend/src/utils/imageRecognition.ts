import Tesseract from 'tesseract.js'

// 图像识别结果接口
export interface RecognitionResult {
  modelName: string
  manufacturer: string
  confidence: number
  ocrText: string
}

// 图像识别类（专注OCR）
export class ImageRecognizer {
  private worker: any = null
  private workerInitialized: boolean = false
  private workerInitializing: boolean = false

  private readonly compressOptions = {
    maxWidth: 1600, // 较高分辨率以保留文字细节
    maxHeight: 1200,
    quality: 0.85 // 较高质量以保留文字清晰度
  }

  constructor() {
    console.log('🏗️ ImageRecognizer实例已创建（OCR模式）')
    // 构造函数中立即初始化Worker
    this.initializeWorker().catch(error => {
      console.error('❌ Worker预初始化失败:', error)
    })
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 开始初始化OCR识别器...')
    const startTime = Date.now()

    try {
      await this.initializeWorker()
      const duration = Date.now() - startTime
      console.log(`✅ OCR识别器初始化完成，耗时: ${duration}ms`)
      return this.workerInitialized
    } catch (error) {
      console.error('❌ OCR识别器初始化失败:', error)
      return false
    }
  }

  private async initializeWorker(): Promise<void> {
    if (this.workerInitialized) {
      console.log('✅ Tesseract Worker已就绪')
      return
    }

    if (this.workerInitializing) {
      console.log('⏳ Tesseract Worker正在初始化中...')
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.workerInitialized || !this.workerInitializing) {
            clearInterval(checkInterval)
            resolve(null)
          }
        }, 100)
      })
      return
    }

    this.workerInitializing = true
    const startTime = Date.now()
    console.log('🔍 开始初始化Tesseract Worker...')

    try {
      console.log('📦 开始创建Worker...')

      this.worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        logger: (m: any) => {
          const progress = m.progress ? Math.round(m.progress * 100) + '%' : ''
          console.log(`[Tesseract] ${m.status} ${progress}`)
        }
      })

      console.log('✅ Worker创建成功，开始配置参数...')

      // 配置Tesseract参数 - 优化中英文混合多行文本识别
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '3',  // PSM.AUTO - 自动检测页面布局，适合多行文本
        'tessedit_ocr_engine_mode': '1', // OEM.LSTM_ONLY - LSTM引擎，中文识别率远高于传统引擎
        // 注意：不设置 tessedit_char_whitelist，否则会阻止中文字符识别
        'preserve_interword_spaces': '1', // 保留单词间空格
      })

      console.log('✅ Tesseract参数配置完成')

      this.workerInitialized = true
      console.log(`✅ Tesseract Worker就绪: ${Date.now() - startTime}ms`)
    } catch (error) {
      console.error('❌ Tesseract Worker初始化失败:', error)
      console.error('❌ 错误详情:', JSON.stringify(error))
      this.worker = null
      this.workerInitialized = false
    } finally {
      this.workerInitializing = false
    }
  }

  // 图像压缩与预处理
  private async compressImage(imageData: string): Promise<string> {
    console.log('🖼️ 开始图像压缩与预处理...')
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = imageData

      img.onload = () => {
        let { width, height } = img
        const maxWidth = this.compressOptions.maxWidth
        const maxHeight = this.compressOptions.maxHeight

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(width)
        canvas.height = Math.floor(height)
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('无法获取画布上下文'))
          return
        }

        // 绘制原始图像
        ctx.drawImage(img, 0, 0, width, height)

        // 图像预处理：灰度化 + 对比度增强 + 自适应二值化
        const imageDataCtx = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageDataCtx.data

        // 第一步：灰度化
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        // 第二步：对比度增强（CLAHE简化版 - 直方图拉伸）
        let minVal = 255, maxVal = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < minVal) minVal = data[i]
          if (data[i] > maxVal) maxVal = data[i]
        }
        const range = maxVal - minVal
        if (range > 0 && range < 200) {
          // 仅当对比度不足时进行拉伸
          for (let i = 0; i < data.length; i += 4) {
            const stretched = Math.round(((data[i] - minVal) / range) * 255)
            data[i] = stretched
            data[i + 1] = stretched
            data[i + 2] = stretched
          }
        }

        // 第三步：锐化（增强文字边缘）
        ctx.putImageData(imageDataCtx, 0, 0)
        const sharpened = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const src = imageDataCtx.data
        const dst = sharpened.data
        const w = canvas.width
        // 简化的Unsharp Mask锐化
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4
            // 拉普拉斯算子
            const laplacian = 5 * src[idx]
              - src[((y - 1) * w + x) * 4]
              - src[((y + 1) * w + x) * 4]
              - src[(y * w + x - 1) * 4]
              - src[(y * w + x + 1) * 4]
            const val = Math.min(255, Math.max(0, laplacian))
            dst[idx] = val
            dst[idx + 1] = val
            dst[idx + 2] = val
          }
        }
        ctx.putImageData(sharpened, 0, 0)

        const compressedData = canvas.toDataURL('image/jpeg', this.compressOptions.quality)

        const duration = Date.now() - startTime
        const compressionRatio = Math.round((1 - compressedData.length / imageData.length) * 100)
        console.log(`✅ 图像压缩与预处理完成: ${duration}ms, ${img.width}x${img.height}→${Math.floor(width)}x${Math.floor(height)}, 压缩${compressionRatio}%`)

        resolve(compressedData)
      }

      img.onerror = (error) => {
        console.error('❌ 图像加载失败:', error)
        reject(error)
      }
    })
  }

  // 执行OCR文字识别
  private async performOCR(imageData: string): Promise<string> {
    const startTime = Date.now()

    if (!this.workerInitialized) {
      console.log('⚡ Worker未就绪，尝试初始化...')
      await this.initializeWorker()
    }

    if (!this.worker) {
      console.warn('⚠️ Tesseract Worker不可用')
      return ''
    }

    try {
      console.log('🔤 开始OCR识别...')

      const ret = await this.worker.recognize(imageData)

      const text = ret.data.text.trim()
      console.log(`✅ OCR完成: ${Date.now() - startTime}ms, ${text.length}字符, 置信度: ${ret.data.confidence.toFixed(1)}%`)

      if (text.length > 0) {
        console.log('📝 识别内容:')
        console.log('```')
        console.log(text)
        console.log('```')
      }

      return text
    } catch (error) {
      console.error('❌ OCR识别失败:', error)
      console.error('❌ 错误详情:', JSON.stringify(error))
      return ''
    }
  }

  async recognize(imageData: string): Promise<{
    result: RecognitionResult
    processedImages: {
      original: string
      cropped?: string
    }
  }> {
    const totalStartTime = Date.now()
    console.log('========================================')
    console.log('🚀 开始OCR识别流程')
    console.log('========================================')

    try {
      console.log('📋 1/3: 图像压缩')
      const compressedData = await this.compressImage(imageData)

      console.log('📋 2/3: OCR识别')
      const ocrResult = await this.performOCR(compressedData)

      console.log('📋 3/3: 解析结果')
      const result = this.parseOCRResult(ocrResult)

      const totalTime = Date.now() - totalStartTime
      console.log('========================================')
      console.log(`✅ 识别完成: ${totalTime}ms`)
      console.log(`   - 型号: ${result.modelName}`)
      console.log(`   - 厂家: ${result.manufacturer}`)
      console.log('========================================')

      return {
        result,
        processedImages: {
          original: compressedData,
          cropped: compressedData
        }
      }
    } catch (error) {
      const totalTime = Date.now() - totalStartTime
      console.error('========================================')
      console.error(`❌ 识别失败: ${totalTime}ms`)
      console.error('  错误:', error)
      console.error('========================================')
      throw new Error('OCR识别失败: ' + (error as Error).message)
    }
  }

  private parseOCRResult(ocrText: string): RecognitionResult {
    console.log('🔍 parseOCRResult 输入的 ocrText:', ocrText)
    console.log('🔍 parseOCRResult 输入的类型:', typeof ocrText)
    console.log('🔍 parseOCRResult 输入长度:', ocrText.length)

    let modelName = '未识别'
    let manufacturer = '未识别'

    if (!ocrText) {
      console.log('📭 无OCR文本')
      return { modelName, manufacturer, confidence: 0, ocrText: '' }
    }

    const lines = ocrText.split(/\r?\n/).filter(line => line.trim().length > 0)
    console.log('📄 识别到的行:', lines)

    // 清理文本 - 去除多余空格
    const cleanedLines = lines.map(line => line.replace(/\s+/g, ' ').trim())

    // 尝试合并相邻行，提高多行识别率
    const mergedTexts: string[] = []
    // 添加原始行
    mergedTexts.push(...cleanedLines)
    // 添加合并相邻行的结果
    for (let i = 0; i < cleanedLines.length - 1; i++) {
      mergedTexts.push(cleanedLines[i] + ' ' + cleanedLines[i + 1])
    }
    // 添加所有行合并的结果
    mergedTexts.push(cleanedLines.join(' '))

    const sortedLines = [...new Set(mergedTexts)].sort((a, b) => b.length - a.length)
    console.log('🔗 扩展后的文本候选项:', sortedLines.slice(0, 10))

    const manufacturerKeywords = [
      { name: '科思特', keywords: ['科思特', 'ke si te', 'kest'] },
      { name: '联想', keywords: ['联想', 'lenovo', 'thinkpad'] },
      { name: '华为', keywords: ['华为', 'huawei'] },
      { name: '小米', keywords: ['小米', 'xiaomi'] },
      { name: '苹果', keywords: ['苹果', 'apple'] },
      { name: '三星', keywords: ['三星', 'samsung'] },
      { name: '戴尔', keywords: ['戴尔', 'dell'] },
      { name: '惠普', keywords: ['惠普', 'hp'] },
      { name: '得力', keywords: ['得力', 'deli'] }
    ]

    // 1. 查找厂家
    for (const text of sortedLines) {
      for (const manu of manufacturerKeywords) {
        for (const keyword of manu.keywords) {
          const lowerText = text.toLowerCase()
          const lowerKeyword = keyword.toLowerCase()
          if (lowerText.includes(lowerKeyword)) {
            manufacturer = manu.name
            console.log(`🏭 匹配到厂家: ${manufacturer} (关键词: ${keyword})`)
            break
          }
        }
        if (manufacturer !== '未识别') break
      }
      if (manufacturer !== '未识别') break
    }

    // 2. 查找型号 - 匹配字母+数字格式
    const modelPatterns = [
      /[A-Za-z]{1,4}\s*[-_]?\s*\d{3,6}/i,  // K CRG319, CRG-319, CRG319
      /\d{3,6}\s*[-_]?\s*[A-Za-z]{1,4}/i,  // 319 CRG
      /[A-Za-z]{2,4}\d{2,4}/i,                  // CRG319
      /[A-Za-z]{1,3}\s*[A-Za-z0-9]{3,8}/i,  // 更广泛的型号格式
      /[A-Za-z0-9]{3,10}/i                   // 任意字母数字组合
    ]

    for (const text of sortedLines) {
      for (const pattern of modelPatterns) {
        const match = text.match(pattern)
        if (match) {
          const candidate = match[0].trim()
          // 过滤掉太短的纯数字或纯字母
          if (candidate.length >= 3 && !/^\d+$/.test(candidate)) {
            modelName = candidate
            console.log(`🔢 匹配到型号: ${modelName}`)
            break
          }
        }
      }
      if (modelName !== '未识别') break
    }

    // 3. 如果没有匹配到型号，使用最长的行，但优先选择有字母和数字混合的
    if (modelName === '未识别' && sortedLines.length > 0) {
      // 尝试找一个混合了字母和数字的行
      const mixedLine = sortedLines.find(line => /[A-Za-z]/.test(line) && /[0-9]/.test(line))
      if (mixedLine) {
        modelName = mixedLine.trim()
        console.log(`📝 使用混合字母数字的行作为型号: ${modelName}`)
      } else {
        modelName = sortedLines[0].trim()
        console.log(`📝 使用最长行作为型号: ${modelName}`)
      }
    }

    // 计算置信度：基于是否找到厂家和型号
    let confidence = 0.5
    if (manufacturer !== '未识别') confidence += 0.2
    if (modelName !== '未识别' && modelName !== '未识别') confidence += 0.2
    if (lines.length >= 2) confidence += 0.1
    confidence = Math.min(confidence, 0.95)

    console.log('📦 parseOCRResult返回结果:', { modelName, manufacturer, confidence, ocrText })
    return { modelName, manufacturer, confidence, ocrText }
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate()
        console.log('🧹 Tesseract Worker已终止')
      } catch (error) {
        console.error('❌ Worker终止失败:', error)
      }
      this.worker = null
    }
    this.workerInitialized = false
    this.workerInitializing = false
  }
}

let globalRecognizer: ImageRecognizer | null = null
let globalInitializing = false
let globalInitialized = false

export function getImageRecognizer(): ImageRecognizer {
  if (!globalRecognizer) {
    console.log('🎯 创建全局ImageRecognizer单例')
    globalRecognizer = new ImageRecognizer()
  }
  return globalRecognizer
}

export async function initializeImageRecognizer(): Promise<boolean> {
  if (globalInitialized) {
    console.log('✅ 全局识别器已就绪')
    return true
  }

  if (globalInitializing) {
    console.log('⏳ 全局识别器正在初始化中...')
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (globalInitialized || !globalInitializing) {
          clearInterval(checkInterval)
          resolve(null)
        }
      }, 100)
    })
    return globalInitialized
  }

  globalInitializing = true
  console.log('🚀 开始初始化全局识别器...')

  try {
    const recognizer = getImageRecognizer()
    const success = await recognizer.initialize()
    globalInitialized = success
    console.log(`🎯 全局识别器初始化: ${success ? '✅成功' : '❌失败'}`)
    return success
  } catch (error) {
    console.error('❌ 全局识别器初始化异常:', error)
    return false
  } finally {
    globalInitializing = false
  }
}

export async function recognizeImage(imageData: string): Promise<{
  result: RecognitionResult
  processedImages: {
    original: string
    cropped?: string
  }
}> {
  const startTime = Date.now()
  const recognizer = getImageRecognizer()

  if (!globalInitialized) {
    await initializeImageRecognizer()
  }

  const result = await recognizer.recognize(imageData)
  console.log(`📊 总耗时: ${Date.now() - startTime}ms`)
  return result
}

export async function disposeImageRecognizer(): Promise<void> {
  if (globalRecognizer) {
    await globalRecognizer.dispose()
    globalRecognizer = null
  }
  globalInitialized = false
  globalInitializing = false
  console.log('🧹 全局识别器已清理')
}
