const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '请先登录' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'warehouse-management-system-jwt-secret-key-2024');
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'token无效' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: '登录已过期，请重新登录' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
};

module.exports = { auth, requireRole };
