const express = require('express');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取用户列表
router.get('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, role, status } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { realName: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status !== undefined) {
      query.status = status === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户列表失败', error: error.message });
  }
});

// 获取单个用户信息
router.get('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
});

// 创建用户
router.post('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { username, password, realName, email, phone, role } = req.body;

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
      message: '用户创建成功',
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
    res.status(500).json({ message: '创建用户失败', error: error.message });
  }
});

// 更新用户信息
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { realName, email, phone, role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查邮箱是否被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: '邮箱已被使用' });
      }
    }

    if (realName !== undefined) user.realName = realName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;

    await user.save();

    res.json({
      message: '用户更新成功',
      user: {
        id: user._id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '更新用户失败', error: error.message });
  }
});

// 删除用户
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({ message: '超级管理员不能删除' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除用户失败', error: error.message });
  }
});

module.exports = router;
