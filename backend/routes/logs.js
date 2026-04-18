const express = require('express');
const fs = require('fs');
const path = require('path');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const logsDir = path.join(__dirname, '../../logs');

// 获取日志文件列表
router.get('/files', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  if (!fs.existsSync(logsDir)) {
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.log') || file.endsWith('.log.gz'))
    .map(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        type: getLogFileType(file)
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  res.json({ files });
}));

// 读取日志文件内容
router.get('/file/:filename', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { lines = 100 } = req.query;

  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ message: '无效的文件名' });
  }

  const filePath = path.join(logsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '日志文件不存在' });
  }

  // Handle compressed files
  if (filename.endsWith('.gz')) {
    return res.json({
      content: '[压缩文件，请先解压查看]',
      compressed: true,
      filename
    });
  }

  // Read last N lines
  const content = readLastLines(filePath, parseInt(lines));

  res.json({
    content,
    filename,
    totalLines: content.split('\n').length
  });
}));

// 系统状态概览
router.get('/status', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  // Disk usage
  const diskUsage = getDiskUsage();

  // Memory usage
  const memoryUsage = process.memoryUsage();

  // Uptime
  const uptime = process.uptime();

  // Logs directory size
  let logsDirSize = 0;
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      logsDirSize += stats.size;
    }
  }

  // Node version
  const nodeVersion = process.version;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime)
    },
    memory: {
      rss: memoryUsage.rss,
      rssFormatted: formatFileSize(memoryUsage.rss),
      heapTotal: memoryUsage.heapTotal,
      heapTotalFormatted: formatFileSize(memoryUsage.heapTotal),
      heapUsed: memoryUsage.heapUsed,
      heapUsedFormatted: formatFileSize(memoryUsage.heapUsed),
      external: memoryUsage.external,
      externalFormatted: formatFileSize(memoryUsage.external)
    },
    disk: diskUsage,
    logs: {
      directory: logsDir,
      totalSize: logsDirSize,
      totalSizeFormatted: formatFileSize(logsDirSize)
    },
    node: {
      version: nodeVersion,
      env: process.env.NODE_ENV || 'development'
    },
    services: {
      backend: 'running',
      database: 'connected'
    }
  });
}));

// 下载日志文件
router.get('/download/:filename', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ message: '无效的文件名' });
  }

  const filePath = path.join(logsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '日志文件不存在' });
  }

  res.download(filePath);
}));

// 删除日志文件
router.delete('/file/:filename', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ message: '无效的文件名' });
  }

  const filePath = path.join(logsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '日志文件不存在' });
  }

  fs.unlinkSync(filePath);
  logger.info(`删除日志文件: ${filename}`, { user: req.user?.id });

  res.json({ message: '日志文件删除成功' });
}));

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟 ${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function getLogFileType(filename) {
  if (filename.startsWith('error-')) return 'error';
  if (filename.startsWith('warn-')) return 'warn';
  if (filename.startsWith('access-')) return 'access';
  if (filename.startsWith('combined-')) return 'combined';
  return 'other';
}

function getDiskUsage() {
  try {
    return {
      available: '未知',
      total: '未知',
      used: '未知'
    };
  } catch (e) {
    return {
      available: '未知',
      total: '未知',
      used: '未知'
    };
  }
}

function readLastLines(filePath, maxLines) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    if (lines.length <= maxLines) {
      return content;
    }

    return lines.slice(lines.length - maxLines).join('\n');
  } catch (error) {
    return `读取文件失败: ${error.message}`;
  }
}

module.exports = router;
