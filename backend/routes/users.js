const express = require('express');
const { User, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

router.get('/', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, keyword, role, status } = req.query;
  const where = {};

  if (keyword) {
    where[Op.or] = [
      { username: { [Op.like]: `%${keyword}%` } },
      { realName: { [Op.like]: `%${keyword}%` } },
      { email: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: users } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  
  res.json({ user });
}));

router.post('/', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
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
    message: '用户创建成功',
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

router.put('/:id', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { realName, email, phone, role, status } = req.body;
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError('邮箱已被使用');
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
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  });
}));

router.delete('/:id', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  if (user.username === 'admin') {
    throw new BadRequestError('超级管理员不能删除');
  }

  await user.destroy();
  res.json({ message: '用户删除成功' });
}));

module.exports = router;
