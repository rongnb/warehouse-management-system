const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    if (!user.status) {
      return res.status(400).json({ message: '账号已被禁用' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'warehouse-management-system-jwt-secret-key-2024',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

// 注册（仅管理员可调用）
router.post('/register', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }

    const { username, password, realName, email, phone, role } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }

    const user = new User({
      username,
      password,
      realName,
      email,
      phone,
      role: role || 'staff',
    });

    await user.save();

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user._id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
});

// 获取当前用户信息
router.get('/profile', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      realName: req.user.realName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      avatar: req.user.avatar,
    },
  });
});

// 修改密码
router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能少于6位' });
    }

    const isMatch = await req.user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '旧密码错误' });
    }

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '密码修改失败', error: error.message });
  }
});

// 退出登录
router.post('/logout', auth, async (req, res) => {
  res.json({ message: '退出登录成功' });
});

module.exports = router;
