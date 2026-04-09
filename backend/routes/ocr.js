const express = require('express');
const Tesseract = require('tesseract.js');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置multer处理图片上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `ocr-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /(\.jpg|\.jpeg|\.png|\.gif|\.bmp)$/i;
    if (allowedTypes.test(path.extname(file.originalname)) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件（jpg, jpeg, png, gif, bmp）'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
});

// 全局worker缓存，避免重复初始化
let workerInstance = null;
let workerInitializing = false;
let workerInitialized = false;

// 初始化Tesseract Worker
async function initializeWorker() {
  if (workerInitialized && workerInstance) {
    logger.info('✅ Tesseract Worker已初始化，复用实例');
    return workerInstance;
  }

  if (workerInitializing) {
    logger.info('⏳ Tesseract Worker正在初始化，等待...');
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (workerInitialized || !workerInitializing) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    });
    return workerInstance;
  }

  workerInitializing = true;
  const startTime = Date.now();
  logger.info('🔧 开始初始化Tesseract Worker...');

  try {
    const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
      logger: (m) => {
        if (m.progress) {
          logger.debug(`[Tesseract] ${m.status} ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // 配置识别参数 - 假设是一块文本，适合商品标签
    await worker.setParameters({
      'tessedit_pageseg_mode': '6', // PSM.SINGLE_BLOCK (假设一块统一文本，适合商品标签)
      'tessedit_ocr_engine_mode': '0', // OEM.TESSERACT_ONLY
      'tessedit_char_whitelist': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.\n ',
      'textord_auto_page': '0',
      'textord_parallelize': '0',
      'classify_min_confidence': '10',
      'textord_max_noise_size': '5',
      'chi_sim_fix_space': '1',
      'chi_sim_enable_dict_correction': '0',
    });

    workerInstance = worker;
    workerInitialized = true;
    const duration = Date.now() - startTime;
    logger.info(`✅ Tesseract Worker初始化完成，耗时: ${duration}ms`);
    return worker;
  } catch (error) {
    logger.error('❌ Tesseract Worker初始化失败:', error);
    workerInstance = null;
    workerInitialized = false;
    throw error;
  } finally {
    workerInitializing = false;
  }
}

// 解析OCR结果提取型号和厂家
function parseOCRResult(ocrText) {
  logger.info('🔍 解析OCR结果:', ocrText);

  let modelName = '未识别';
  let manufacturer = '未识别';

  if (!ocrText || ocrText.trim().length === 0) {
    return { modelName, manufacturer, confidence: 0, ocrText: '' };
  }

  const lines = ocrText.split(/\r?\n/).filter(line => line.trim().length > 0);
  logger.info('📄 识别到的行:', lines);

  // 清理文本
  const cleanedLines = lines.map(line => line.replace(/\s+/g, ' ').trim());

  // 尝试合并相邻行
  const mergedTexts = [...cleanedLines];
  for (let i = 0; i < cleanedLines.length - 1; i++) {
    mergedTexts.push(cleanedLines[i] + ' ' + cleanedLines[i + 1]);
  }
  if (cleanedLines.length > 0) {
    mergedTexts.push(cleanedLines.join(' '));
  }

  const sortedLines = [...new Set(mergedTexts)].sort((a, b) => b.length - a.length);

  // 厂家关键词列表
  const manufacturerKeywords = [
    { name: '科思特', keywords: ['科思特', 'ke si te', 'kest'] },
    { name: '联想', keywords: ['联想', 'lenovo', 'thinkpad'] },
    { name: '华为', keywords: ['华为', 'huawei'] },
    { name: '小米', keywords: ['小米', 'xiaomi'] },
    { name: '苹果', keywords: ['苹果', 'apple'] },
    { name: '三星', keywords: ['三星', 'samsung'] },
    { name: '戴尔', keywords: ['戴尔', 'dell'] },
    { name: '惠普', keywords: ['惠普', 'hp'] },
    { name: '得力', keywords: ['得力', 'deli'] },
  ];

  // 1. 查找厂家
  for (const text of sortedLines) {
    for (const manu of manufacturerKeywords) {
      for (const keyword of manu.keywords) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) {
          manufacturer = manu.name;
          logger.info(`🏭 匹配到厂家: ${manufacturer} (关键词: ${keyword})`);
          break;
        }
      }
      if (manufacturer !== '未识别') break;
    }
    if (manufacturer !== '未识别') break;
  }

  // 2. 查找型号 - 匹配字母+数字格式
  const modelPatterns = [
    /[A-Za-z]{1,4}\s*[-_]?\s*\d{3,6}/i,  // CRG-319, CRG319
    /\d{3,6}\s*[-_]?\s*[A-Za-z]{1,4}/i,  // 319 CRG
    /[A-Za-z]{2,4}\d{2,4}/i,                  // CRG319
    /[A-Za-z]{1,3}\s*[A-Za-z0-9]{3,8}/i,  // 更广泛的型号格式
    /[A-Za-z0-9]{3,10}/i                   // 任意字母数字组合
  ];

  for (const text of sortedLines) {
    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match) {
        const candidate = match[0].trim();
        if (candidate.length >= 3 && !/^\d+$/.test(candidate)) {
          modelName = candidate;
          logger.info(`🔢 匹配到型号: ${modelName}`);
          break;
        }
      }
    }
    if (modelName !== '未识别') break;
  }

  // 3. 如果没有匹配到型号，使用最长的行
  if (modelName === '未识别' && sortedLines.length > 0) {
    const mixedLine = sortedLines.find(line => /[A-Za-z]/.test(line) && /[0-9]/.test(line));
    if (mixedLine) {
      modelName = mixedLine.trim();
      logger.info(`📝 使用混合字母数字的行作为型号: ${modelName}`);
    } else {
      modelName = sortedLines[0].trim();
      logger.info(`📝 使用最长行作为型号: ${modelName}`);
    }
  }

  // 计算置信度
  let confidence = 0.5;
  if (manufacturer !== '未识别') confidence += 0.2;
  if (modelName !== '未识别') confidence += 0.2;
  if (lines.length >= 2) confidence += 0.1;
  confidence = Math.min(confidence, 0.95);

  logger.info('✅ 解析完成:', { modelName, manufacturer, confidence });
  return { modelName, manufacturer, confidence, ocrText: ocrText.trim() };
}

// OCR识别接口
router.post('/recognize', auth, upload.single('image'), async (req, res) => {
  const totalStartTime = Date.now();
  logger.info('🚀 开始OCR识别请求');

  try {
    if (!req.file) {
      logger.warn('❌ 没有上传图片');
      return res.status(400).json({ message: '请上传图片' });
    }

    const imagePath = req.file.path;
    logger.info(`📷 图片已保存: ${imagePath}`);

    // 初始化worker
    const worker = await initializeWorker();

    // 执行识别
    logger.info('🔍 开始OCR识别...');
    const recognizeStartTime = Date.now();
    const result = await worker.recognize(imagePath);
    const recognizeDuration = Date.now() - recognizeStartTime;
    logger.info(`✅ OCR识别完成，耗时: ${recognizeDuration}ms`);

    // 解析结果
    const parsedResult = parseOCRResult(result.data.text);

    // 清理临时文件
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      logger.debug(`🧹 临时文件已删除: ${imagePath}`);
    }

    const totalDuration = Date.now() - totalStartTime;
    logger.info(`🏁 整个OCR流程完成，总耗时: ${totalDuration}ms`);

    res.json({
      success: true,
      result: parsedResult,
      duration: totalDuration,
    });
  } catch (error) {
    const totalDuration = Date.now() - totalStartTime;
    logger.error(`❌ OCR识别失败，耗时 ${totalDuration}ms:`, error);

    // 清理临时文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'OCR识别失败',
      error: error.message,
    });
  }
});

// 获取OCR服务状态
router.get('/status', auth, async (req, res) => {
  res.json({
    success: true,
    initialized: workerInitialized,
    workerAvailable: workerInstance !== null,
  });
});

module.exports = router;
