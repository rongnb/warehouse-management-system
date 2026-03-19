const express = require('express');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取供应商列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword, 
      level,
      status 
    } = req.query;
    
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { code: { $regex: keyword, $options: 'i' } },
        { contact: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (level) {
      query.level = level;
    }

    if (status !== undefined) {
      query.status = status === 'true';
    }

    const suppliers = await Supplier.find(query)
      .populate('createdBy', 'realName')
      .sort({ level: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Supplier.countDocuments(query);

    res.json({
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取供应商列表失败', error: error.message });
  }
});

// 获取供应商下拉列表
router.get('/options/list', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ status: true })
      .select('name code contact phone')
      .sort({ name: 1 });

    res.json({ suppliers });
  } catch (error) {
    res.status(500).json({ message: '获取供应商列表失败', error: error.message });
  }
});

// 获取供应商下拉列表（别名，兼容前端调用）
router.get('/options', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ status: true })
      .select('name code contact phone')
      .sort({ name: 1 });

    // 统一数据格式，添加id字段
    const formattedSuppliers = suppliers.map(s => ({
      ...s.toObject(),
      id: s._id,
    }));

    res.json({ suppliers: formattedSuppliers });
  } catch (error) {
    res.status(500).json({ message: '获取供应商列表失败', error: error.message });
  }
});

// 获取单个供应商详情
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'realName');

    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    // 获取该供应商的商品数量
    const productCount = await Product.countDocuments({ supplier: req.params.id });

    res.json({ 
      supplier,
      productCount,
    });
  } catch (error) {
    res.status(500).json({ message: '获取供应商详情失败', error: error.message });
  }
});

// 创建供应商
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, code, contact, phone, email, address, remark, level } = req.body;

    // 检查编码是否已存在
    const existingSupplier = await Supplier.findOne({ code });
    if (existingSupplier) {
      return res.status(400).json({ message: '供应商编码已存在' });
    }

    // 手机号格式校验
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: '手机号格式不正确' });
    }

    const supplier = new Supplier({
      name,
      code,
      contact,
      phone,
      email,
      address,
      remark,
      level: level || 'B',
      createdBy: req.user._id,
    });

    await supplier.save();

    res.status(201).json({
      message: '供应商创建成功',
      supplier,
    });
  } catch (error) {
    res.status(500).json({ message: '创建供应商失败', error: error.message });
  }
});

// 更新供应商
router.put('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    const { name, code, contact, phone, email, address, remark, level, status } = req.body;

    // 检查编码是否被其他供应商使用
    if (code && code !== supplier.code) {
      const existingSupplier = await Supplier.findOne({ code });
      if (existingSupplier) {
        return res.status(400).json({ message: '供应商编码已存在' });
      }
    }

    // 手机号格式校验
    if (phone !== undefined && !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: '手机号格式不正确' });
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
  } catch (error) {
    res.status(500).json({ message: '更新供应商失败', error: error.message });
  }
});

// 删除供应商
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    // 检查是否有商品使用该供应商
    const productCount = await Product.countDocuments({ supplier: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({ message: '该供应商下有商品，不能删除' });
    }

    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: '供应商删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除供应商失败', error: error.message });
  }
});

module.exports = router;
