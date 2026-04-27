const express = require('express');
const { Category, Product, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

router.get('/tree', auth, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = {};

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const allCategories = await Category.findAll({
    where,
    order: [['sort', 'ASC'], ['createdAt', 'DESC']],
    raw: true,
  });

  const buildTree = (parentId = null, level = 1) => {
    const result = [];
    const filtered = allCategories.filter(cat =>
      (cat.parentId === parentId) || (!cat.parentId && !parentId)
    );

    for (const cat of filtered) {
      result.push({
        id: cat.id,
        _id: cat.id,
        name: cat.name,
        code: cat.code,
        parentId: cat.parentId,
        level: level,
        sort: cat.sort,
        status: cat.status,
        description: cat.description,
        children: buildTree(cat.id, level + 1),
      });
    }

    return result;
  };

  const tree = buildTree();
  res.json({ tree });
}));

router.get('/', auth, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = { parentId: null };
  
  if (status !== undefined) {
    where.status = status === 'true';
  }

  const categories = await Category.findAll({
    where,
    include: [{
      model: Category,
      as: 'children',
      required: false,
    }],
    order: [['sort', 'ASC'], ['createdAt', 'DESC']],
  });

  res.json({ categories });
}));

router.get('/options/list', auth, asyncHandler(async (req, res) => {
  const allCategories = await Category.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'parentId'],
    order: [['sort', 'ASC'], ['name', 'ASC']],
    raw: true,
  });

  const buildTree = (parentId = null) => {
    const result = [];
    const filtered = allCategories.filter(cat =>
      (cat.parentId === parentId) || (!cat.parentId && !parentId)
    );

    for (const cat of filtered) {
      result.push({
        id: cat.id,
        name: cat.name,
        code: cat.code,
        children: buildTree(cat.id),
      });
    }

    return result;
  };

  const tree = buildTree();
  res.json({ categories: tree });
}));

router.get('/options', auth, asyncHandler(async (req, res) => {
  const allCategories = await Category.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'parentId'],
    order: [['sort', 'ASC'], ['name', 'ASC']],
    raw: true,
  });

  const buildTree = (parentId = null) => {
    const result = [];
    const filtered = allCategories.filter(cat =>
      (cat.parentId === parentId) || (!cat.parentId && !parentId)
    );

    for (const cat of filtered) {
      result.push({
        id: cat.id,
        name: cat.name,
        code: cat.code,
        children: buildTree(cat.id),
      });
    }

    return result;
  };

  const tree = buildTree();
  res.json({ categories: tree });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id, {
    include: [
      { model: Category, as: 'parent', attributes: ['name'] },
      { model: Category, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
  });

  if (!category) {
    throw new NotFoundError('分类不存在');
  }

  const children = await Category.findAll({ where: { parentId: req.params.id } });
  const productCount = await Product.count({ where: { categoryId: req.params.id } });

  res.json({ 
    category,
    children,
    productCount,
  });
}));

router.post('/', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { name, code, parentId, description, sort } = req.body;

  const existingCategory = await Category.findOne({ where: { code } });
  if (existingCategory) {
    throw new BadRequestError('分类编码已存在');
  }

  const category = await Category.create({
    name,
    code,
    parentId: parentId || null,
    description,
    sort: sort || 0,
    createdBy: req.user.id,
  });

  res.status(201).json({
    message: '分类创建成功',
    category,
  });
}));

router.put('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    throw new NotFoundError('分类不存在');
  }

  const { name, code, parentId, description, sort, status } = req.body;

  if (code && code !== category.code) {
    const existingCategory = await Category.findOne({ where: { code } });
    if (existingCategory) {
      throw new BadRequestError('分类编码已存在');
    }
  }

  if (parentId && String(parentId) === String(req.params.id)) {
    throw new BadRequestError('不能将自己设置为父分类');
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
}));

router.delete('/:id', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    throw new NotFoundError('分类不存在');
  }

  const children = await Category.count({ where: { parentId: req.params.id } });
  if (children > 0) {
    throw new ConflictError('该分类下有子分类，不能删除');
  }

  const productCount = await Product.count({ where: { categoryId: req.params.id } });
  if (productCount > 0) {
    throw new ConflictError('该分类下有商品，不能删除');
  }

  await category.destroy();
  res.json({ message: '分类删除成功' });
}));

module.exports = router;
