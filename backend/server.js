const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('./utils/logger');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// 日志中间件
app.use(logger.requestId);
app.use(logger.httpMiddleware);

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('数据库连接成功'))
.catch(err => {
  logger.error('MongoDB连接失败，使用内存模式运行:', err.message);
  logger.warn('注意：内存模式下数据不会持久化，重启服务后数据会丢失');
});

// 路由
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

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack, { requestId: req.requestId });
  res.status(500).json({
    message: '服务器内部错误',
    requestId: req.requestId
  });
});

// 404处理
app.use((req, res) => {
  logger.warn(`请求的资源不存在: ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    message: '接口不存在',
    requestId: req.requestId
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
  logger.info(`局域网访问地址: http://0.0.0.0:${PORT}`);
});
