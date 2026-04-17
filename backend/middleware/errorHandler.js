const logger = require('../utils/logger');
const { AppError } = require('../errors/AppError');

/**
 * 包装异步路由处理函数，自动 catch 任何 reject 并转交给 Express 错误中间件。
 * 替代每个路由里写 try/catch 的繁琐模板。
 *
 * 用法：
 *   router.get('/x', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 将 Mongoose / Express 抛出的错误规整化，挑选合适的 HTTP 状态码。
 */
function normalizeError(err) {
  if (err instanceof AppError) return err;

  // Mongoose 校验错误
  if (err && err.name === 'ValidationError') {
    const details = Object.keys(err.errors || {}).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
    return new AppError('数据校验失败', 422, 'VALIDATION_ERROR', details);
  }

  // Mongoose 重复键
  if (err && err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return new AppError(
      `字段重复: ${fields.join(', ') || '未知字段'}`,
      409,
      'DUPLICATE_KEY',
      err.keyValue,
    );
  }

  // Mongoose CastError（如 ObjectId 转换失败）
  if (err && err.name === 'CastError') {
    return new AppError('参数格式错误', 400, 'CAST_ERROR', { path: err.path, value: err.value });
  }

  // JWT 错误
  if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    return new AppError('登录已过期，请重新登录', 401, 'TOKEN_INVALID');
  }

  return null;
}

/**
 * Express 全局错误处理中间件。
 * 必须四参数签名 (err, req, res, next)，且要在所有路由之后挂载。
 */
function errorHandler(err, req, res, _next) {
  const normalized = normalizeError(err);
  const appErr = normalized || new AppError(
    process.env.NODE_ENV === 'production' ? '服务器内部错误' : (err && err.message) || '服务器内部错误',
    500,
    'INTERNAL_ERROR',
  );

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: appErr.statusCode,
    code: appErr.code,
  };

  if (appErr.statusCode >= 500) {
    logger.error(`[${appErr.code || 'ERROR'}] ${err && err.stack ? err.stack : appErr.message}`, logPayload);
  } else {
    logger.warn(`[${appErr.code || 'ERROR'}] ${appErr.message}`, logPayload);
  }

  const body = {
    success: false,
    message: appErr.message,
    code: appErr.code,
    requestId: req.requestId,
  };
  if (appErr.details) body.details = appErr.details;

  res.status(appErr.statusCode).json(body);
}

/**
 * 404 中间件，挂在所有路由之后、errorHandler 之前。
 */
function notFoundHandler(req, res, next) {
  next(new AppError(`接口不存在: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

module.exports = { asyncHandler, errorHandler, notFoundHandler };
