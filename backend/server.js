const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { connect } = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

async function start() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Connect to SQLite
  try {
    await connect();
    logger.info('SQLite 数据库连接成功');
  } catch (err) {
    logger.error('SQLite 连接失败:', err);
    process.exit(1);
  }

  // 安全响应头：默认禁用 CSP（前端单独部署时再按需开启），
  // 其他通用响应头（X-Content-Type-Options/X-Frame-Options/HSTS 等）保留默认。
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(logger.requestId);
  app.use(logger.httpMiddleware);

  // CORS：默认允许同源 + 显式 CORS_ORIGIN（逗号分隔），未配置时回退到允许全部以兼容内网部署
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map(s => s.trim()).filter(Boolean);
    app.use(cors({
      origin(origin, callback) {
        // 同源/无 origin（如 curl）放行
        if (!origin) return callback(null, true);
        if (origins.includes('*') || origins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS: origin not allowed'));
      },
      credentials: true,
    }));
  } else {
    app.use(cors());
  }
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/inventory', require('./routes/inventory'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/suppliers', require('./routes/suppliers'));
  app.use('/api/warehouses', require('./routes/warehouses'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/stocktake', require('./routes/stocktake'));
  app.use('/api/system', require('./routes/system'));
  app.use('/api/logs', require('./routes/logs'));
  app.use('/api/ocr', require('./routes/ocr'));
  app.use('/api/reports', require('./routes/reports'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`服务器运行在 http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { start };
