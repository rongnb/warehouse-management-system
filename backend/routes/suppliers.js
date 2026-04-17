const express = require('express');
const { Supplier, Product, User, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

router.get('/', auth, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    keyword, 
    level,
    status 
  } = req.query;
  
  const where = {};

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { code: { [Op.like]: `%${keyword}%` } },
      { contact: { [Op.like]: `%${keyword}%` } },
      { phone: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (level) {
    where.level = level;
  }

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: suppliers } = await Supplier.findAndCountAll({
    where,
    include: [
      { model: User, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
    order: [['level', 'ASC'], ['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    suppliers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/options/list', auth, asyncHandler(async (req, res) => {
  const suppliers = await Supplier.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'contact', 'phone'],
    order: [['name', 'ASC']],
  });

  res.json({ suppliers });
}));

router.get('/options', auth, asyncHandler(async (req, res) => {
  const suppliers = await Supplier.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'contact', 'phone'],
    order: [['name', 'ASC']],
    raw: true,
  });

  const formattedSuppliers = suppliers.map(s => ({
    ...s,
    id: s.id,
  }));

  res.json({ suppliers: formattedSuppliers });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id, {
    include: [
      { model: User, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
  });

  if (!supplier) {
    throw new NotFoundError('供应商不存在');
  }

  const productCount = await Product.count({ where: { supplierId: req.params.id } });

  res.json({ 
    supplier,
    productCount,
  });
}));

router.post('/', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { name, code, contact, phone, email, address, remark, level } = req.body;

  const existingSupplier = await Supplier.findOne({ where: { code } });
  if (existingSupplier) {
    throw new BadRequestError('供应商编码已存在');
  }

  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    throw new BadRequestError('手机号格式不正确');
  }

  const supplier = await Supplier.create({
    name,
    code,
    contact,
    phone,
    email,
    address,
    remark,
    level: level || 'B',
    createdBy: req.user.id,
  });

  res.status(201).json({
    message: '供应商创建成功',
    supplier,
  });
}));

router.put('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) {
    throw new NotFoundError('供应商不存在');
  }

  const { name, code, contact, phone, email, address, remark, level, status } = req.body;

  if (code && code !== supplier.code) {
    const existingSupplier = await Supplier.findOne({ where: { code } });
    if (existingSupplier) {
      throw new BadRequestError('供应商编码已存在');
    }
  }

  if (phone !== undefined && !/^1[3-9]\d{9}$/.test(phone)) {
    throw new BadRequestError('手机号格式不正确');
  }

  if (name !== undefined) supplier.name = name;
  if (code !== undefined) supplier.code = code;
  if (contact !== undefined) supplier.contact = contact;
  if (phone !== undefined) supplier.phone = phone;
  if (email !== undefined) supplier.email = email;
  if (address !== undefined) supplier.address = address;
  if (remark !== undefined) supplier.remark = remark;
  if (level !== undefined) supplier.level = level;
  if (status !== undefined) supplier.status = status;

  await supplier.save();

  res.json({
    message: '供应商更新成功',
    supplier,
  });
}));

router.delete('/:id', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) {
    throw new NotFoundError('供应商不存在');
  }

  const productCount = await Product.count({ where: { supplierId: req.params.id } });
  if (productCount > 0) {
    throw new ConflictError('该供应商下有商品，不能删除');
  }

  await supplier.destroy();
  res.json({ message: '供应商删除成功' });
}));

module.exports = router;
