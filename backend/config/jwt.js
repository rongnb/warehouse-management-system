// 集中管理 JWT 配置：生产环境必须显式提供 JWT_SECRET，
// 仅开发/测试环境允许使用回退值并打印告警。
const logger = require('../utils/logger');

const FALLBACK_SECRET = 'warehouse-management-system-jwt-secret-key-2024';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length > 0) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[security] 未设置 JWT_SECRET 环境变量，生产环境拒绝启动。请在 .env 中配置足够强度的随机字符串。'
    );
  }
  if (!global.__JWT_SECRET_WARNED__) {
    global.__JWT_SECRET_WARNED__ = true;
    if (logger && typeof logger.warn === 'function') {
      logger.warn('[security] 未设置 JWT_SECRET，正在使用开发环境默认密钥。请勿在生产环境中使用。');
    }
  }
  return FALLBACK_SECRET;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

module.exports = { getJwtSecret, JWT_EXPIRES_IN };
