const express = require('express');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取库存列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword, 
      category, 
      warehouse,
      lowStock
    } = req.query;
    
    let query = {};

    // 如果要查询低库存商品
    if (lowStock === 'true') {
      query.quantity = { $lt: 5 }; // 库存小于5的预警
    }

    // 先查询商品
    let productQuery = {};
    if (keyword || category) {
      if (keyword) {
        productQuery.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { sku: { $regex: keyword, $options: 'i' } },
        ];
      }
      if (category) {
        productQuery.category = category;
      }
      
      const products = await Product.find(productQuery).select('_id');
      query.product = { $in: products.map(p => p._id) };
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    const inventory = await Inventory.find(query)
      .populate('product', 'name sku unit price minStock')
      .populate('warehouse', 'name')
      .populate('updatedBy', 'realName')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      inventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取库存列表失败', error: error.message });
  }
});

// 获取单个商品库存详情
router.get('/product/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const inventory = await Inventory.find({ product: productId })
      .populate('warehouse', 'name location')
      .sort({ updatedAt: -1 });

    res.json({ inventory });
  } catch (error) {
    res.status(500).json({ message: '获取库存详情失败', error: error.message });
  }
});

// 库存调整
router.post('/adjust', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product, warehouse, quantity, remark } = req.body;

    if (!product || !warehouse || quantity === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }

    // 查找现有库存记录
    let inventory = await Inventory.findOne({ product, warehouse });
    
    if (inventory) {
      // 更新库存
      inventory.quantity = quantity;
      inventory.updatedBy = req.user._id;
      inventory.lastUpdated = new Date();
      await inventory.save();
    } else {
      // 创建新的库存记录
      inventory = new Inventory({
        product,
        warehouse,
        quantity,
        updatedBy: req.user._id,
      });
      await inventory.save();
    }

    await inventory.populate('product warehouse', 'name sku unit');

    res.json({
      message: '库存调整成功',
      inventory,
    });
  } catch (error) {
    res.status(500).json({ message: '库存调整失败', error: error.message });
  }
});

// 库存盘点
router.post('/check', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product, warehouse, actualQuantity, remark } = req.body;

    if (!product || !warehouse || actualQuantity === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const inventory = await Inventory.findOne({ product, warehouse });
    
    if (!inventory) {
      return res.status(404).json({ message: '该商品在指定仓库没有库存记录' });
    }

    // 记录盘点差异
    const difference = actualQuantity - inventory.quantity;

    // 更新库存
    inventory.quantity = actualQuantity;
    inventory.updatedBy = req.user._id;
    inventory.lastUpdated = new Date();
    await inventory.save();

    await inventory.populate('product warehouse', 'name sku unit');

    res.json({
      message: '盘点完成',
      inventory,
      difference,
    });
  } catch (error) {
    res.status(500).json({ message: '盘点失败', error: error.message });
  }
});

// 获取低库存预警
router.get('/low-stock', auth, async (req, res) => {
  try {
    // 查找库存低于最低库存的商品
    const products = await Product.find({ status: true }).select('name sku minStock');
    
    const lowStockItems = [];
    
    for (const product of products) {
      const inventoryRecords = await Inventory.find({ product: product._id });
      const totalStock = inventoryRecords.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalStock <= product.minStock) {
        lowStockItems.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          minStock: product.minStock,
          currentStock: totalStock,
        });
      }
    }

    res.json({ products: lowStockItems });
  } catch (error) {
    res.status(500).json({ message: '获取低库存预警失败', error: error.message });
  }
});

module.exports = router;
