const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取商品列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword, 
      category, 
      supplier, 
      status 
    } = req.query;
    
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (status !== undefined) {
      query.status = status === 'true';
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'realName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
});

// 获取单个商品详情
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('supplier', 'name contact phone');

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 获取库存信息
    const inventory = await Inventory.find({ product: req.params.id })
      .populate('warehouse', 'name');

    res.json({ product, inventory });
  } catch (error) {
    res.status(500).json({ message: '获取商品详情失败', error: error.message });
  }
});

// 创建商品
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { 
      name, 
      sku, 
      category, 
      supplier, 
      description, 
      specification, 
      unit, 
      price, 
      costPrice, 
      minStock, 
      maxStock 
    } = req.body;

    // 检查SKU是否已存在
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: '商品SKU已存在' });
    }

    const product = new Product({
      name,
      sku,
      category,
      supplier,
      description,
      specification,
      unit,
      price,
      costPrice,
      minStock,
      maxStock,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await product.save();
    await product.populate('category supplier', 'name');

    res.status(201).json({
      message: '商品创建成功',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: '创建商品失败', error: error.message });
  }
});

// 更新商品
router.put('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const { 
      name, 
      sku, 
      category, 
      supplier, 
      description, 
      specification, 
      unit, 
      price, 
      costPrice, 
      minStock, 
      maxStock,
      status 
    } = req.body;

    // 检查SKU是否被其他商品使用
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        return res.status(400).json({ message: '商品SKU已存在' });
      }
    }

    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku;
    if (category !== undefined) product.category = category;
    if (supplier !== undefined) product.supplier = supplier;
    if (description !== undefined) product.description = description;
    if (specification !== undefined) product.specification = specification;
    if (unit !== undefined) product.unit = unit;
    if (price !== undefined) product.price = price;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (minStock !== undefined) product.minStock = minStock;
    if (maxStock !== undefined) product.maxStock = maxStock;
    if (status !== undefined) product.status = status;
    
    product.updatedBy = req.user._id;

    await product.save();
    await product.populate('category supplier', 'name');

    res.json({
      message: '商品更新成功',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: '更新商品失败', error: error.message });
  }
});

// 删除商品
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否有库存
    const inventory = await Inventory.findOne({ product: req.params.id, quantity: { $gt: 0 } });
    if (inventory) {
      return res.status(400).json({ message: '商品还有库存，不能删除' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: '商品删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除商品失败', error: error.message });
  }
});

// 获取商品下拉列表
router.get('/options/list', auth, async (req, res) => {
  try {
    const products = await Product.find({ status: true })
      .select('name sku unit price')
      .sort({ name: 1 });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
});

module.exports = router;
