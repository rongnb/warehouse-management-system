const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取分类列表（树形结构）
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status !== undefined) {
      query.status = status === 'true';
    }

    // 查询一级分类
    const categories = await Category.find({ ...query, parentId: null })
      .populate('children')
      .sort({ sort: 1, createdAt: -1 });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: '获取分类列表失败', error: error.message });
  }
});

// 获取分类下拉列表
router.get('/options/list', auth, async (req, res) => {
  try {
    const categories = await Category.find({ status: true })
      .select('name code parentId')
      .sort({ sort: 1, name: 1 });

    // 构建树形结构
    const buildTree = (parentId = null) => {
      const result = [];
      const filtered = categories.filter(cat => 
        cat.parentId?.toString() === parentId?.toString() || 
        (!cat.parentId && !parentId)
      );
      
      for (const cat of filtered) {
        result.push({
          id: cat._id,
          name: cat.name,
          code: cat.code,
          children: buildTree(cat._id),
        });
      }
      
      return result;
    };

    const tree = buildTree();
    res.json({ categories: tree });
  } catch (error) {
    res.status(500).json({ message: '获取分类列表失败', error: error.message });
  }
});

// 获取单个分类详情
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentId', 'name')
      .populate('createdBy', 'realName');

    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 获取子分类
    const children = await Category.find({ parentId: req.params.id });
    // 获取该分类下的商品数量
    const productCount = await Product.countDocuments({ category: req.params.id });

    res.json({ 
      category,
      children,
      productCount,
    });
  } catch (error) {
    res.status(500).json({ message: '获取分类详情失败', error: error.message });
  }
});

// 创建分类
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, code, parentId, description, sort } = req.body;

    // 检查编码是否已存在
    const existingCategory = await Category.findOne({ code });
    if (existingCategory) {
      return res.status(400).json({ message: '分类编码已存在' });
    }

    const category = new Category({
      name,
      code,
      parentId: parentId || null,
      description,
      sort: sort || 0,
      createdBy: req.user._id,
    });

    await category.save();

    res.status(201).json({
      message: '分类创建成功',
      category,
    });
  } catch (error) {
    res.status(500).json({ message: '创建分类失败', error: error.message });
  }
});

// 更新分类
router.put('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }

    const { name, code, parentId, description, sort, status } = req.body;

    // 检查编码是否被其他分类使用
    if (code && code !== category.code) {
      const existingCategory = await Category.findOne({ code });
      if (existingCategory) {
        return res.status(400).json({ message: '分类编码已存在' });
      }
    }

    // 不能将自己设置为父分类
    if (parentId && parentId === req.params.id) {
      return res.status(400).json({ message: '不能将自己设置为父分类' });
    }

    if (name !== undefined) category.name = name;
    if (code !== undefined) category.code = code;
    if (parentId !== undefined) category.parentId = parentId || null;
    if (description !== undefined) category.description = description;
    if (sort !== undefined) category.sort = sort;
    if (status !== undefined) category.status = status;

    await category.save();

    res.json({
      message: '分类更新成功',
      category,
    });
  } catch (error) {
    res.status(500).json({ message: '更新分类失败', error: error.message });
  }
});

// 删除分类
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 检查是否有子分类
    const children = await Category.countDocuments({ parentId: req.params.id });
    if (children > 0) {
      return res.status(400).json({ message: '该分类下有子分类，不能删除' });
    }

    // 检查是否有商品使用该分类
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({ message: '该分类下有商品，不能删除' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: '分类删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除分类失败', error: error.message });
  }
});

module.exports = router;
