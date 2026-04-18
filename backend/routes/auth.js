const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { getJwtSecret, JWT_EXPIRES_IN } = require('../config/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, ForbiddenError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

// 限流：登录端点最易被暴力破解
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每 IP 20 次/15min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登录尝试过于频繁，请稍后再试', code: 'RATE_LIMITED' },
});

// 限流：写入类账号操作
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' },
});

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new BadRequestError('用户名和密码不能为空');
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw new BadRequestError('用户名或密码错误');
  }

  if (!user.status) {
    throw new BadRequestError('账号已被禁用');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new BadRequestError('用户名或密码错误');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
    },
  });
}));

router.post('/register', auth, writeLimiter, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('权限不足');
  }

  const { username, password, realName, email, phone, role } = req.body;

  const existingUser = await User.findOne({ 
    where: {
      [Op.or]: [{ username }, { email }]
    }
  });
  
  if (existingUser) {
    throw new BadRequestError('用户名或邮箱已存在');
  }

  const user = await User.create({
    username,
    password,
    realName,
    email,
    phone,
    role: role || 'staff',
  });

  res.status(201).json({
    message: '注册成功',
    user: {
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
}));

router.get('/profile', auth, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      realName: req.user.realName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      avatar: req.user.avatar,
    },
  });
}));

router.put('/change-password', auth, writeLimiter, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new BadRequestError('旧密码和新密码不能为空');
  }

  if (newPassword.length < 6) {
    throw new BadRequestError('新密码长度不能少于6位');
  }

  const user = await User.findByPk(req.user.id);
  
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new BadRequestError('旧密码错误');
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: '密码修改成功' });
}));

router.post('/logout', auth, asyncHandler(async (req, res) => {
  res.json({ message: '退出登录成功' });
}));

module.exports = router;
