/**
 * 统一应用错误基类。
 * 所有可预期的业务错误都应继承自 AppError，框架的全局错误处理中间件
 * 会据此返回合适的 HTTP 状态码与错误消息。
 *
 * 不要直接 throw 一个 plain string；请抛出 AppError 或其子类，
 * 这样 logger 与响应中间件能拿到一致的字段。
 */
class AppError extends Error {
  /**
   * @param {string} message 面向用户的中文错误消息
   * @param {number} statusCode HTTP 状态码，默认 500
   * @param {string} [code] 业务错误码（可选），便于前端区分
   * @param {object} [details] 附加上下文（可选，例如校验字段列表）
   */
  constructor(message, statusCode = 500, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (details) this.details = details;
    this.isOperational = true;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class BadRequestError extends AppError {
  constructor(message = '请求参数错误', details) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '请先登录') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突', details) {
    super(message, 409, 'CONFLICT', details);
  }
}

class ValidationError extends AppError {
  constructor(message = '校验失败', details) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
