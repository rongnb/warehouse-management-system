const express = require('express');
const { Inventory, Product, Warehouse, Transaction, User, sequelize, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

// 获取库存列表
router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    keyword,
    category,
    warehouse,
    lowStock,
    status
  } = req.query;

  const where = {};
  const includeProduct = {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'sku', 'unit', 'price', 'minStock', 'maxStock'],
    where: {},
    required: false,
  };

  if (keyword) {
    includeProduct.where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { sku: { [Op.like]: `%${keyword}%` } },
    ];
    includeProduct.required = true;
  }

  if (category) {
    includeProduct.where.categoryId = category;
    includeProduct.required = true;
  }

  if (warehouse) {
    where.warehouseId = warehouse;
  }

  // Low stock filter using SQL literal
  if (lowStock === 'true') {
    where[Op.and] = sequelize.literal('quantity < (SELECT minStock FROM products WHERE products.id = Inventory.productId)');
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: inventory } = await Inventory.findAndCountAll({
    where,
    include: [
      includeProduct,
      { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'], required: false },
      { model: User, as: 'updatedByUser', attributes: ['realName'], required: false },
    ],
    order: [['updatedAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  // Apply status filter in-memory if needed
  let filteredInventory = inventory;
  if (status) {
    filteredInventory = inventory.filter(item => {
      const qty = item.quantity;
      const min = item.product?.minStock || 0;
      const max = item.product?.maxStock || 99999;

      if (status === '1') {
        return qty > min && qty < max;
      } else if (status === '2') {
        return qty <= min;
      } else if (status === '3') {
        return qty >= max;
      }
      return true;
    });
  }

  const formattedInventory = filteredInventory.map(item => {
    const itemObj = item.toJSON();
    return {
      id: itemObj._id,
      _id: itemObj._id,
      sku: itemObj.product?.sku || '',
      productName: itemObj.product?.name || '',
      productId: itemObj.product?._id,
      warehouseName: itemObj.warehouse?.name || '',
      warehouseId: itemObj.warehouse?._id,
      quantity: itemObj.quantity,
      minStock: itemObj.product?.minStock || 0,
      maxStock: itemObj.product?.maxStock || 0,
      unitPrice: itemObj.product?.price || 0,
      totalValue: itemObj.product?.price ? itemObj.product.price * itemObj.quantity : 0,
      product: itemObj.product,
      warehouse: itemObj.warehouse,
    };
  });

  res.json({
    inventory: formattedInventory,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: status ? filteredInventory.length : total,
      pages: Math.ceil((status ? filteredInventory.length : total) / limit),
    },
  });
}));

// 获取单个库存详情
router.get('/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const inventory = await Inventory.findByPk(id, {
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit', 'price', 'minStock'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name', 'location'], required: false },
      { model: User, as: 'updatedByUser', attributes: ['realName'], required: false },
    ],
  });

  if (!inventory) {
    throw new NotFoundError('库存记录不存在');
  }

  res.json({ inventory });
}));

// 获取单个商品库存详情
router.get('/product/:productId', auth, asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const inventory = await Inventory.findAll({
    where: { productId },
    include: [
      { model: Warehouse, as: 'warehouse', attributes: ['name', 'location'], required: false },
    ],
    order: [['updatedAt', 'DESC']],
  });

  res.json({ inventory });
}));

// 库存调整（通过ID）
router.post('/:id/adjust', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity, remark } = req.body;

  if (quantity === undefined) {
    throw new BadRequestError('参数不完整');
  }

  const inventory = await Inventory.findByPk(id, {
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
    ],
  });

  if (!inventory) {
    throw new NotFoundError('库存记录不存在');
  }

  // Check if adjustment would result in negative quantity
  if (inventory.quantity + quantity < 0) {
    throw new BadRequestError('库存不足，无法执行该调整');
  }

  inventory.quantity += quantity;
  inventory.updatedBy = req.user.id;
  inventory.lastUpdated = new Date();
  await inventory.save();

  res.json({
    message: '库存调整成功',
    inventory,
  });
}));

// 库存调整（通过产品和仓库）
router.post('/adjust', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { product, warehouse, quantity, remark } = req.body;

  if (!product || !warehouse || quantity === undefined) {
    throw new BadRequestError('参数不完整');
  }

  // Find existing inventory record
  let inventory = await Inventory.findOne({
    where: { productId: product, warehouseId: warehouse },
  });

  if (inventory) {
    if (inventory.quantity + quantity < 0) {
      throw new BadRequestError('库存不足，无法执行该调整');
    }
    inventory.quantity += quantity;
    inventory.updatedBy = req.user.id;
    inventory.lastUpdated = new Date();
    await inventory.save();
  } else {
    if (quantity <= 0) {
      throw new BadRequestError('该商品在指定仓库没有库存记录，无法执行出库操作');
    }
    inventory = await Inventory.create({
      productId: product,
      warehouseId: warehouse,
      quantity,
      updatedBy: req.user.id,
    });
  }

  await inventory.reload({
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
    ],
  });

  res.json({
    message: '库存调整成功',
    inventory,
  });
}));

// 库存盘点
router.post('/check', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { product, warehouse, actualQuantity, remark } = req.body;

  if (!product || !warehouse || actualQuantity === undefined) {
    throw new BadRequestError('参数不完整');
  }

  const inventory = await Inventory.findOne({
    where: { productId: product, warehouseId: warehouse },
  });

  if (!inventory) {
    throw new NotFoundError('该商品在指定仓库没有库存记录');
  }

  // Record check difference
  const difference = actualQuantity - inventory.quantity;

  // Update inventory
  inventory.quantity = actualQuantity;
  inventory.updatedBy = req.user.id;
  inventory.lastUpdated = new Date();
  await inventory.save();

  await inventory.reload({
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
    ],
  });

  res.json({
    message: '盘点完成',
    inventory,
    difference,
  });
}));

// 库存转移
router.post('/transfer', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { product, fromWarehouse, toWarehouse, quantity, remark } = req.body;

  if (!product || !fromWarehouse || !toWarehouse || quantity === undefined) {
    throw new BadRequestError('参数不完整');
  }

  if (fromWarehouse === toWarehouse) {
    throw new BadRequestError('源仓库和目标仓库不能相同');
  }

  await sequelize.transaction(async (t) => {
    // Check source inventory
    const sourceInventory = await Inventory.findOne({
      where: { productId: product, warehouseId: fromWarehouse },
      transaction: t,
    });

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      throw new BadRequestError('源仓库库存不足');
    }

    // Reduce from source
    sourceInventory.quantity -= quantity;
    sourceInventory.updatedBy = req.user.id;
    sourceInventory.lastUpdated = new Date();
    await sourceInventory.save({ transaction: t });

    // Find or create target inventory
    let targetInventory = await Inventory.findOne({
      where: { productId: product, warehouseId: toWarehouse },
      transaction: t,
    });

    if (targetInventory) {
      targetInventory.quantity += quantity;
      targetInventory.updatedBy = req.user.id;
      targetInventory.lastUpdated = new Date();
      await targetInventory.save({ transaction: t });
    } else {
      targetInventory = await Inventory.create({
        productId: product,
        warehouseId: toWarehouse,
        quantity: quantity,
        updatedBy: req.user.id,
      }, { transaction: t });
    }

    // Create transaction record (using toWarehouse as warehouseId, fromWarehouse in remark)
    const transactionRecord = await Transaction.create({
      type: 'transfer',
      productId: product,
      warehouseId: toWarehouse,
      quantity,
      remark: `从仓库ID ${fromWarehouse} 转移${remark ? ': ' + remark : ''}`,
      createdBy: req.user.id,
      operator: req.user.id,
    }, { transaction: t });

    await sourceInventory.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    await targetInventory.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    res.json({
      message: '库存转移成功',
      sourceInventory,
      targetInventory,
      transaction: transactionRecord,
    });
  });
}));

// 获取低库存预警
router.get('/low-stock', auth, asyncHandler(async (req, res) => {
  // Get all active products
  const products = await Product.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'sku', 'minStock'],
  });

  const lowStockItems = [];

  for (const product of products) {
    const inventoryRecords = await Inventory.findAll({
      where: { productId: product.id },
      attributes: ['quantity'],
      raw: true,
    });

    const totalStock = inventoryRecords.reduce((sum, item) => sum + item.quantity, 0);

    if (totalStock <= product.minStock) {
      lowStockItems.push({
        product: product.id,
        name: product.name,
        sku: product.sku,
        minStock: product.minStock,
        currentStock: totalStock,
      });
    }
  }

  res.json({ products: lowStockItems });
}));

module.exports = router;
