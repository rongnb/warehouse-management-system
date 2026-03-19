const express = require('express');
const fs = require('fs');
const path = require('path');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const logsDir = path.join(__dirname, '../../logs');

// 获取日志文件列表
router.get('/files', auth, requireRole(['admin']), async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('获取日志文件列表失败:', error);
    res.status(500).json({ message: '获取日志文件列表失败', error: error.message });
  }
});

// 读取日志文件内容
router.get('/file/:filename', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { filename } = req.params;
    const { lines = 100 } = req.query;

    // 安全检查，防止路径遍历
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: '无效的文件名' });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '日志文件不存在' });
    }

    // 如果是压缩文件，提示需要解压
    if (filename.endsWith('.gz')) {
      return res.json({
        content: '[压缩文件，请先解压查看]',
        compressed: true,
        filename
      });
    }

    // 读取最后 N 行
    const content = readLastLines(filePath, parseInt(lines));

    res.json({
      content,
      filename,
      totalLines: content.split('\n').length
    });
  } catch (error) {
    logger.error('读取日志文件失败:', error);
    res.status(500).json({ message: '读取日志文件失败', error: error.message });
  }
});

// 系统状态概览
router.get('/status', auth, requireRole(['admin']), async (req, res) => {
  try {
    // 磁盘使用情况
    const diskUsage = getDiskUsage();

    // 内存使用情况
    const memoryUsage = process.memoryUsage();

    // 运行时间
    const uptime = process.uptime();

    // 日志目录大小
    let logsDirSize = 0;
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        logsDirSize += stats.size;
      }
    }

    // 节点版本
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
        database: 'connected' // 这个可以进一步检查MongoDB连接状态
      }
    });
  } catch (error) {
    logger.error('获取系统状态失败:', error);
    res.status(500).json({ message: '获取系统状态失败', error: error.message });
  }
});

// 下载日志文件
router.get('/download/:filename', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { filename } = req.params;

    // 安全检查
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: '无效的文件名' });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '日志文件不存在' });
    }

    res.download(filePath);
  } catch (error) {
    logger.error('下载日志文件失败:', error);
    res.status(500).json({ message: '下载日志文件失败', error: error.message });
  }
});

// 删除日志文件
router.delete('/file/:filename', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { filename } = req.params;

    // 安全检查
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: '无效的文件名' });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '日志文件不存在' });
    }

    fs.unlinkSync(filePath);
    logger.info(`删除日志文件: ${filename}`, { user: req.user?._id });

    res.json({ message: '日志文件删除成功' });
  } catch (error) {
    logger.error('删除日志文件失败:', error);
    res.status(500).json({ message: '删除日志文件失败', error: error.message });
  }
});

// 辅助函数
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
    // 简化版，实际项目可以使用 diskusage 等库
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
