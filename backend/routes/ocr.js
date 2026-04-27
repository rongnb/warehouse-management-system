const express = require('express');
const Tesseract = require('tesseract.js');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseOCRResult, initializeWorker, recognizeWithMultiplePSM } = require('../services/ocr');

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



// OCR识别接口
router.post('/recognize', auth, upload.single('image'), asyncHandler(async (req, res) => {
  const totalStartTime = Date.now();
  logger.info('🚀 开始OCR识别请求');

  if (!req.file) {
    logger.warn('❌ 没有上传图片');
    return res.status(400).json({ message: '请上传图片' });
  }

  // 防御 path-injection：将 req.file.path 锚定在 uploads 目录内
  const uploadsRoot = path.resolve(__dirname, '../uploads');
  const resolvedPath = path.resolve(req.file.path);
  if (!resolvedPath.startsWith(uploadsRoot + path.sep)) {
    logger.warn('❌ 非法的上传路径', { path: req.file.path });
    return res.status(400).json({ message: '非法的上传文件路径' });
  }
  const imagePath = resolvedPath;
  logger.info(`📷 图片已保存: ${imagePath}`);

  try {
    // 初始化worker
    const worker = await initializeWorker();

    // 执行识别（尝试多种 PSM 模式以提升多行中英文识别成功率）
    logger.info('🔍 开始OCR识别...');
    const recognizeStartTime = Date.now();
    const recognizedText = await recognizeWithMultiplePSM(worker, imagePath);
    const recognizeDuration = Date.now() - recognizeStartTime;
    logger.info(`✅ OCR识别完成，耗时: ${recognizeDuration}ms`);

    // 解析结果
    const parsedResult = parseOCRResult(recognizedText);

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

    res.status(500).json({
      success: false,
      message: 'OCR识别失败',
      error: error.message,
    });
  } finally {
    // 清理临时文件
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      logger.debug(`🧹 临时文件已删除: ${imagePath}`);
    }
  }
}));

// 获取OCR服务状态
router.get('/status', auth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    initialized: true,
    workerAvailable: true,
  });
}));

module.exports = router;
// 注意：parseOCRResult / initializeWorker 已迁移至 backend/services/ocr.js，请直接从那里 import。
