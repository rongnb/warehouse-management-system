const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

let workerInstance = null;
let workerInitializing = false;
let workerInitialized = false;

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
    const langPath = path.join(__dirname, '..');
    const hasLocalData = fs.existsSync(path.join(langPath, 'chi_sim.traineddata'))
      && fs.existsSync(path.join(langPath, 'eng.traineddata'));

    const workerOptions = {
      logger: (m) => {
        if (m.progress) {
          logger.debug(`[Tesseract] ${m.status} ${Math.round(m.progress * 100)}%`);
        }
      }
    };

    if (hasLocalData) {
      workerOptions.langPath = langPath;
      logger.info('📂 使用本地traineddata文件（离线模式）');
    }

    const worker = await Tesseract.createWorker('chi_sim+eng', 1, workerOptions);

    // 默认使用 PSM 6（统一文本块），更适合商品表面拍照的多行文字
    await worker.setParameters({
      'tessedit_pageseg_mode': '6',
      'tessedit_ocr_engine_mode': '1',
      'preserve_interword_spaces': '1',
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

// 评分：行数越多、可见字符越多，得分越高
function scoreOcrText(text) {
  if (!text) return 0;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const visibleChars = text.replace(/\s+/g, '').length;
  return lines.length * 10 + visibleChars;
}

// 使用多种 PSM 模式识别，返回得分最高的文本，提升多行中英文识别成功率
async function recognizeWithMultiplePSM(worker, imagePath) {
  const psmModes = ['6', '4', '3', '11'];
  let best = { text: '', score: -1, psm: '6' };

  for (const psm of psmModes) {
    try {
      await worker.setParameters({ 'tessedit_pageseg_mode': psm });
      const result = await worker.recognize(imagePath);
      const text = (result && result.data && result.data.text) || '';
      const score = scoreOcrText(text);
      logger.info(`📊 PSM ${psm} 识别得分: ${score}`);
      if (score > best.score) {
        best = { text, score, psm };
      }
    } catch (err) {
      logger.warn(`⚠️ PSM ${psm} 识别失败: ${err.message}`);
    }
  }

  // 还原默认 PSM 配置
  try {
    await worker.setParameters({ 'tessedit_pageseg_mode': '6' });
  } catch (_) {}

  logger.info(`🏆 选用 PSM ${best.psm} 的识别结果`);
  return best.text;
}

function parseOCRResult(ocrText) {
  logger.info('🔍 解析OCR结果:', ocrText);

  let modelName = '未识别';
  let manufacturer = '未识别';

  if (!ocrText || ocrText.trim().length === 0) {
    return { modelName, manufacturer, confidence: 0, ocrText: '' };
  }

  const lines = ocrText.split(/\r?\n/).filter(line => line.trim().length > 0);
  logger.info('📄 识别到的行:', lines);

  const cleanedLines = lines.map(line => line.replace(/\s+/g, ' ').trim());

  const mergedTexts = [...cleanedLines];
  for (let i = 0; i < cleanedLines.length - 1; i++) {
    mergedTexts.push(cleanedLines[i] + ' ' + cleanedLines[i + 1]);
  }
  if (cleanedLines.length > 0) {
    mergedTexts.push(cleanedLines.join(' '));
  }

  const sortedLines = [...new Set(mergedTexts)].sort((a, b) => b.length - a.length);

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

  const modelPatterns = [
    /[A-Za-z]{1,4}\s*[-_]?\s*\d{3,6}/i,
    /\d{3,6}\s*[-_]?\s*[A-Za-z]{1,4}/i,
    /[A-Za-z]{2,4}\d{2,4}/i,
    /[A-Za-z]{1,3}\s*[A-Za-z0-9]{3,8}/i,
    /[A-Za-z0-9]{3,10}/i
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

  let confidence = 0.5;
  if (manufacturer !== '未识别') confidence += 0.2;
  if (modelName !== '未识别') confidence += 0.2;
  if (lines.length >= 2) confidence += 0.1;
  confidence = Math.min(confidence, 0.95);

  logger.info('✅ 解析完成:', { modelName, manufacturer, confidence });
  return { modelName, manufacturer, confidence, ocrText: ocrText.trim() };
}

module.exports = {
  parseOCRResult,
  initializeWorker,
  recognizeWithMultiplePSM,
};
