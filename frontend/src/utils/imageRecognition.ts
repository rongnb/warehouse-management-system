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
    // 构造函数中立即初始化Worker
    this.initializeWorker().catch(_error => {
    })
  }

  async initialize(): Promise<boolean> {
    try {
      await this.initializeWorker()
      return this.workerInitialized
    } catch (error) {
      return false
    }
  }

  private async initializeWorker(): Promise<void> {
    if (this.workerInitialized) {
      return
    }

    if (this.workerInitializing) {
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

    try {
      this.worker = await Tesseract.createWorker('chi_sim+eng', 1)

      // 仅设置允许初始化后修改的参数
      // PSM 6: 假设是统一的文本块，对于商品表面拍照的多行文字效果最佳
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '6',
        'preserve_interword_spaces': '1',
      })

      this.workerInitialized = true
    } catch (error) {
      this.worker = null
      this.workerInitialized = false
    } finally {
      this.workerInitializing = false
    }
  }

  // 图像压缩与预处理
  private async compressImage(imageData: string): Promise<string> {
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

        const imageDataCtx = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const grayData = new Uint8ClampedArray(canvas.width * canvas.height)

        // 第一步：灰度化（使用加权和，人眼对绿色更敏感）
        for (let i = 0; i < imageDataCtx.data.length; i += 4) {
          grayData[i / 4] = Math.round(
            imageDataCtx.data[i] * 0.299 +
            imageDataCtx.data[i + 1] * 0.587 +
            imageDataCtx.data[i + 2] * 0.114
          )
        }

        // 第二步：Otsu自适应二值化（自动计算最优阈值，保留中英文笔画细节）
        const otsuThreshold = this.computeOtsuThreshold(grayData, canvas.width, canvas.height)

        // 应用二值化：黑底白字更适合OCR
        for (let i = 0; i < grayData.length; i++) {
          const val = grayData[i] > otsuThreshold ? 255 : 0
          const pi = i * 4
          imageDataCtx.data[pi] = val
          imageDataCtx.data[pi + 1] = val
          imageDataCtx.data[pi + 2] = val
        }

        ctx.putImageData(imageDataCtx, 0, 0)

        // 第三步：轻微去噪（移除孤立的椒盐噪声点）
        this.removeNoise(ctx, canvas.width, canvas.height)

        const compressedData = canvas.toDataURL('image/jpeg', this.compressOptions.quality)

        const duration = Date.now() - startTime
        const compressionRatio = Math.round((1 - compressedData.length / imageData.length) * 100)

        resolve(compressedData)
      }

      img.onerror = (error) => {
        reject(error)
      }
    })
  }

  // Otsu自动阈值二值化
  private computeOtsuThreshold(grayData: Uint8ClampedArray, width: number, height: number): number {
    const histogram = new Uint32Array(256)
    for (let i = 0; i < grayData.length; i++) {
      histogram[grayData[i]]++
    }

    const total = grayData.length
    let sum = 0
    for (let i = 0; i < 256; i++) sum += i * histogram[i]

    let sumB = 0
    let wB = 0
    let maxVariance = 0
    let threshold = 128

    for (let t = 0; t < 256; t++) {
      wB += histogram[t]
      if (wB === 0) continue
      const wF = total - wB
      if (wF === 0) break

      sumB += t * histogram[t]
      const mB = sumB / wB
      const mF = (sum - sumB) / wF
      const variance = wB * wF * (mB - mF) * (mB - mF)

      if (variance > maxVariance) {
        maxVariance = variance
        threshold = t
      }
    }

    return threshold
  }

  // 椒盐噪声去除（仅移除孤立的噪点，保留文字结构）
  private removeNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data
    const binary = new Uint8Array(width * height)

    // 二值化数据
    for (let i = 0; i < binary.length; i++) {
      binary[i] = data[i * 4] > 128 ? 1 : 0
    }

    // 统计每个白点周围8邻域的白点数量
    const clean = new Uint8Array(binary.length)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (binary[idx] === 0) continue

        let neighbors = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            neighbors += binary[(y + dy) * width + (x + dx)]
          }
        }

        // 8邻域中有>=3个白点则保留，否则认为是噪声
        clean[idx] = neighbors >= 3 ? 1 : 0
      }
    }

    // 写回
    for (let i = 0; i < clean.length; i++) {
      const val = clean[i] ? 255 : 0
      data[i * 4] = val
      data[i * 4 + 1] = val
      data[i * 4 + 2] = val
    }

    ctx.putImageData(imgData, 0, 0)
  }

  // 评分OCR文本：综合行数 + 可见字符数 + 平均置信度
  private scoreOcrText(text: string, confidence: number): number {
    if (!text) return 0
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
    const visibleChars = text.replace(/\s+/g, '').length
    // 置信度权重 × 文本丰富度，行数和字符数也有加成
    const confidenceBonus = confidence * 100
    return lines.length * 10 + visibleChars + confidenceBonus
  }

  // 执行OCR文字识别 - 尝试多种 PSM 模式以提升多行中英文识别率
  private async performOCR(imageData: string): Promise<string> {
    if (!this.workerInitialized) {
      await this.initializeWorker()
    }

    if (!this.worker) {
      return ''
    }

    // PSM模式说明：
    // 3: 全页自动检测（适合多区域混合布局）
    // 4: 单列竖排文本（适合商品标签整块文字）
    // 6: 统一文本块（适合背景清晰的多行文字）
    // 7: 单行文本（适合单行型号/条码）
    // 11: 稀疏文本（适合背景复杂的情况）
    // 13: 原始文本行（不做分行处理）
    const psmModes = ['6', '3', '4', '7', '11', '13']
    let bestText = ''
    let bestScore = -1

    for (const psm of psmModes) {
      try {
        await this.worker.setParameters({ 'tessedit_pageseg_mode': psm })
        const ret = await this.worker.recognize(imageData)
        const text = (ret?.data?.text || '').trim()
        const conf = ret?.data?.confidence ? ret.data.confidence / 100 : 0.5
        const score = this.scoreOcrText(text, conf)
        if (score > bestScore) {
          bestScore = score
          bestText = text
        }
      } catch (_) {
        // 单个 PSM 失败忽略，继续尝试其他模式
      }
    }

    // 还原默认 PSM 配置
    try {
      await this.worker.setParameters({ 'tessedit_pageseg_mode': '6' })
    } catch (_) {}

    return bestText
  }

  async recognize(imageData: string): Promise<{
    result: RecognitionResult
    processedImages: {
      original: string
      cropped?: string
    }
  }> {
    const totalStartTime = Date.now()

    try {
      const compressedData = await this.compressImage(imageData)

      const ocrResult = await this.performOCR(compressedData)

      const result = this.parseOCRResult(ocrResult)

      const totalTime = Date.now() - totalStartTime

      return {
        result,
        processedImages: {
          original: compressedData,
          cropped: compressedData
        }
      }
    } catch (error) {
      const totalTime = Date.now() - totalStartTime
      throw new Error('OCR识别失败: ' + (error as Error).message)
    }
  }

  private parseOCRResult(ocrText: string): RecognitionResult {
    let modelName = '未识别'
    let manufacturer = '未识别'

    if (!ocrText) {
      return { modelName, manufacturer, confidence: 0, ocrText: '' }
    }

    // 后处理：常见OCR误识字符纠正
    const normalizedText = this.normalizeOcrText(ocrText)

    const lines = normalizedText.split(/\r?\n/).filter(line => line.trim().length > 0)

    // 清理文本 - 去除多余空格
    const cleanedLines = lines.map(line => line.replace(/\s+/g, ' ').trim())

    // 尝试合并相邻行，提高多行识别率
    const mergedTexts: string[] = []
    mergedTexts.push(...cleanedLines)
    for (let i = 0; i < cleanedLines.length - 1; i++) {
      mergedTexts.push(cleanedLines[i] + ' ' + cleanedLines[i + 1])
    }
    mergedTexts.push(cleanedLines.join(' '))

    const sortedLines = [...new Set(mergedTexts)].sort((a, b) => b.length - a.length)

    const manufacturerKeywords = [
      { name: '科思特', keywords: ['科思特', 'ke si te', 'kest', '科思', '科斯特'] },
      { name: '联想', keywords: ['联想', 'lenovo', 'thinkpad', 'ThinkPad'] },
      { name: '华为', keywords: ['华为', 'huawei', 'HUAWEI'] },
      { name: '小米', keywords: ['小米', 'xiaomi', 'XIAOMI', '红米'] },
      { name: '苹果', keywords: ['苹果', 'apple', 'APPLE'] },
      { name: '三星', keywords: ['三星', 'samsung', 'SAMSUNG'] },
      { name: '戴尔', keywords: ['戴尔', 'dell', 'DELL'] },
      { name: '惠普', keywords: ['惠普', 'hp', 'HP', ' Hewlett'] },
      { name: '得力', keywords: ['得力', 'deli', 'DELI'] },
      { name: '爱普生', keywords: ['爱普生', 'epson', 'EPSON'] },
      { name: '罗技', keywords: ['罗技', 'logitech', 'LOGITECH'] },
      { name: '微软', keywords: ['微软', 'microsoft', 'MICROSOFT'] },
    ]

    // 1. 查找厂家（从长到短匹配，优先完整匹配）
    for (const text of sortedLines) {
      for (const manu of manufacturerKeywords) {
        for (const keyword of manu.keywords) {
          if (text.includes(keyword)) {
            manufacturer = manu.name
            break
          }
        }
        if (manufacturer !== '未识别') break
      }
      if (manufacturer !== '未识别') break
    }

    // 2. 查找型号 - 匹配字母+数字格式（优先长匹配）
    const modelPatterns = [
      /[A-Za-z]{1,5}[-_]?\d{2,6}/i,         // CRG-319, K-520, CRG319
      /\d{2,6}[-_]?[A-Za-z]{1,5}/i,         // 319 CRG, 520K
      /[A-Za-z]{2,6}\d{2,6}/i,              // CRG9528, M1450
      /[A-Za-z]{1,3}\s*[A-Za-z0-9]{3,8}/i,  // 更广泛的型号格式
      /[A-Za-z0-9]{4,12}/i                   // 任意字母数字组合
    ]

    for (const text of sortedLines) {
      for (const pattern of modelPatterns) {
        const match = text.match(pattern)
        if (match) {
          const candidate = match[0].trim().replace(/\s+/g, '')
          // 过滤掉太短的纯数字或纯字母
          if (candidate.length >= 3 && !/^\d+$/.test(candidate) && !/^[A-Za-z]+$/.test(candidate)) {
            modelName = candidate.toUpperCase()
            break
          }
        }
      }
      if (modelName !== '未识别') break
    }

    // 3. 如果没有匹配到型号，尝试从包含厂家的行中提取
    if (modelName === '未识别' && manufacturer !== '未识别') {
      const manuLine = sortedLines.find(line =>
        manufacturerKeywords.find(m => m.name === manufacturer)?.keywords.some(
          k => line.includes(k)
        )
      )
      if (manuLine) {
        // 在厂家所在行中查找数字和字母混合的片段
        const parts = manuLine.split(/\s+/).filter(p => p.length >= 3)
        const modelPart = parts.find(p =>
          /[A-Za-z]/.test(p) && /[0-9]/.test(p) && p.length >= 4
        )
        if (modelPart) {
          modelName = modelPart.toUpperCase()
        }
      }
    }

    // 4. 如果还是没有，使用最长的混合行
    if (modelName === '未识别' && sortedLines.length > 0) {
      const mixedLine = sortedLines.find(line => /[A-Za-z]/.test(line) && /[0-9]/.test(line))
      if (mixedLine) {
        modelName = mixedLine.trim().toUpperCase()
      } else {
        modelName = sortedLines[0].trim().toUpperCase()
      }
    }

    // 计算置信度：基于是否找到厂家和型号
    let confidence = 0.5
    if (manufacturer !== '未识别') confidence += 0.2
    if (modelName !== '未识别' && modelName !== '未识别') confidence += 0.2
    if (lines.length >= 2) confidence += 0.1
    confidence = Math.min(confidence, 0.95)

    return { modelName, manufacturer, confidence, ocrText: normalizedText }
  }

  // OCR文本后处理：纠正常见误识
  private normalizeOcrText(text: string): string {
    if (!text) return text

    const replacements: [RegExp, string][] = [
      // 中文/英文标点混淆
      [/[，,]{2,}/g, ','],          // 多余逗号
      [/[,;]/g, ''],                // 孤立无意义符号
      [/[。.]+$/g, ''],              // 尾部句号
      // 常见OCR数字误识（0和O、1和l、8和B）
      [/(?<=[A-Za-z])0(?=[A-Za-z])/g, 'O'],  // 字母间0→O
      [/(?<=\d)O(?=\d)/g, '0'],     // 数字间O→0
      [/(?<=[A-Za-z])1(?=[A-Za-z])/g, 'l'], // 字母间1→l
      [/(?<=\d)l(?=\d)/g, '1'],     // 数字间l→1
      [/(?<=[A-Za-z])8(?=[A-Za-z])/g, 'B'], // 字母间8→B
      [/(?<=[A-Za-z])B(?=[A-Za-z0-9])/g, '8'], // 字母间B→8（保守）
      // 常见中文字符误识
      [/一/g, '-'],                 // 数字1误识为横线
      [/—/g, '-'],                  // 长破折号统一
      [/\s*-\s*/g, '-'],            // 破折号周围空格
    ]

    let result = text
    for (const [pattern, replacement] of replacements) {
      result = result.replace(pattern, replacement)
    }

    // 去除行首行尾多余空白
    result = result.split(/\r?\n/).map(l => l.trim()).join('\n')

    return result
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate()
      } catch (error) {
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
    globalRecognizer = new ImageRecognizer()
  }
  return globalRecognizer
}

export async function initializeImageRecognizer(): Promise<boolean> {
  if (globalInitialized) {
    return true
  }

  if (globalInitializing) {
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

  try {
    const recognizer = getImageRecognizer()
    const success = await recognizer.initialize()
    globalInitialized = success
    return success
  } catch (error) {
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
  return result
}

export async function disposeImageRecognizer(): Promise<void> {
  if (globalRecognizer) {
    await globalRecognizer.dispose()
    globalRecognizer = null
  }
  globalInitialized = false
  globalInitializing = false
}
