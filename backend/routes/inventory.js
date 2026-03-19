const express = require('express');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Transaction = require('../models/Transaction');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

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
      lowStock,
      status
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

      const products = await Product.find(productQuery).select('_id minStock maxStock');
      query.product = { $in: products.map(p => p._id) };
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    // 获取所有库存记录
    let inventory = await Inventory.find(query)
      .populate('product', 'name sku unit price minStock maxStock')
      .populate('warehouse', 'name')
      .populate('updatedBy', 'realName')
      .sort({ updatedAt: -1 });

    // 根据状态过滤
    if (status) {
      inventory = inventory.filter(item => {
        const qty = item.quantity;
        const min = item.product?.minStock || 0;
        const max = item.product?.maxStock || 99999;

        if (status === '1') { // 正常
          return qty > min && qty < max;
        } else if (status === '2') { // 库存不足
          return qty <= min;
        } else if (status === '3') { // 库存过剩
          return qty >= max;
        }
        return true;
      });
    }

    const total = inventory.length;

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedInventory = inventory.slice(startIndex, startIndex + parseInt(limit));

    // 统一数据格式，直接返回前端需要的字段
    const formattedInventory = paginatedInventory.map(item => ({
      id: item._id,
      _id: item._id,
      sku: item.product?.sku || '',
      productName: item.product?.name || '',
      productId: item.product?._id,
      warehouseName: item.warehouse?.name || '',
      warehouseId: item.warehouse?._id,
      quantity: item.quantity,
      minStock: item.product?.minStock || 0,
      maxStock: item.product?.maxStock || 0,
      unitPrice: item.product?.price || 0,
      totalValue: item.product?.price ? item.product.price * item.quantity : 0,
      product: item.product,
      warehouse: item.warehouse,
    }));

    res.json({
      inventory: formattedInventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('获取库存列表失败:', error);
    res.status(500).json({ message: '获取库存列表失败', error: error.message });
  }
});

// 获取单个库存详情
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findById(id)
      .populate('product', 'name sku unit price minStock')
      .populate('warehouse', 'name location')
      .populate('updatedBy', 'realName');

    if (!inventory) {
      return res.status(404).json({ message: '库存记录不存在' });
    }

    res.json({ inventory });
  } catch (error) {
    res.status(500).json({ message: '获取库存详情失败', error: error.message });
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

// 库存调整（通过ID）
router.post('/:id/adjust', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, remark } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return res.status(404).json({ message: '库存记录不存在' });
    }

    // 更新库存 - 执行调整操作
    if (quantity > 0) {
      // 正数表示增加库存
      inventory.quantity += quantity;
    } else {
      // 负数表示减少库存
      if (inventory.quantity + quantity < 0) {
        return res.status(400).json({ message: '库存不足，无法执行该调整' });
      }
      inventory.quantity += quantity;
    }

    inventory.updatedBy = req.user._id;
    inventory.lastUpdated = new Date();
    await inventory.save();

    await inventory.populate('product warehouse', 'name sku unit');

    res.json({
      message: '库存调整成功',
      inventory,
    });
  } catch (error) {
    logger.error('库存调整失败:', error);
    res.status(500).json({ message: '库存调整失败', error: error.message });
  }
});

// 库存调整（通过产品和仓库）
router.post('/adjust', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product, warehouse, quantity, remark } = req.body;

    if (!product || !warehouse || quantity === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }

    // 查找现有库存记录
    let inventory = await Inventory.findOne({ product, warehouse });

    if (inventory) {
      // 更新库存 - 执行调整操作
      if (quantity > 0) {
        // 正数表示增加库存
        inventory.quantity += quantity;
      } else {
        // 负数表示减少库存
        if (inventory.quantity + quantity < 0) {
          return res.status(400).json({ message: '库存不足，无法执行该调整' });
        }
        inventory.quantity += quantity;
      }
      inventory.updatedBy = req.user._id;
      inventory.lastUpdated = new Date();
      await inventory.save();
    } else {
      // 创建新的库存记录 - 只有当调整量为正数时创建新记录
      if (quantity > 0) {
        inventory = new Inventory({
          product,
          warehouse,
          quantity,
          updatedBy: req.user._id,
        });
        await inventory.save();
      } else {
        return res.status(400).json({ message: '该商品在指定仓库没有库存记录，无法执行出库操作' });
      }
    }

    await inventory.populate('product warehouse', 'name sku unit');

    res.json({
      message: '库存调整成功',
      inventory,
    });
  } catch (error) {
    logger.error('库存调整失败:', error);
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

// 库存转移
router.post('/transfer', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product, fromWarehouse, toWarehouse, quantity, remark } = req.body;

    if (!product || !fromWarehouse || !toWarehouse || quantity === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({ message: '源仓库和目标仓库不能相同' });
    }

    // 检查源仓库是否有足够的库存
    const sourceInventory = await Inventory.findOne({ product, warehouse: fromWarehouse });

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      return res.status(400).json({ message: '源仓库库存不足' });
    }

    // 查找目标仓库的库存记录
    let targetInventory = await Inventory.findOne({ product, warehouse: toWarehouse });

    // 在源仓库减去数量
    sourceInventory.quantity -= quantity;
    sourceInventory.updatedBy = req.user._id;
    sourceInventory.lastUpdated = new Date();
    await sourceInventory.save();

    // 在目标仓库添加数量
    if (targetInventory) {
      targetInventory.quantity += quantity;
      targetInventory.updatedBy = req.user._id;
      targetInventory.lastUpdated = new Date();
      await targetInventory.save();
    } else {
      targetInventory = new Inventory({
        product,
        warehouse: toWarehouse,
        quantity: quantity,
        updatedBy: req.user._id,
      });
      await targetInventory.save();
    }

    // 创建交易记录
    const transaction = new Transaction({
      transactionNo: `TR${Date.now()}`,
      product,
      type: 'transfer',
      quantity,
      fromWarehouse,
      toWarehouse,
      remark,
      createdBy: req.user._id,
    });
    await transaction.save();

    await sourceInventory.populate('product warehouse', 'name sku unit');
    await targetInventory.populate('product warehouse', 'name sku unit');

    res.json({
      message: '库存转移成功',
      sourceInventory,
      targetInventory,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: '库存转移失败', error: error.message });
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
