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
    where[Op.and] = sequelize.literal('`Inventory`.`quantity` < (SELECT `minStock` FROM `products` WHERE `products`.`id` = `Inventory`.`productId`)');
  }

  // Status filter: 1=normal, 2=low stock, 3=overstock
  if (status === '2') {
    where[Op.and] = sequelize.literal('`Inventory`.`quantity` <= (SELECT `minStock` FROM `products` WHERE `products`.`id` = `Inventory`.`productId`)');
  } else if (status === '3') {
    where[Op.and] = sequelize.literal('`Inventory`.`quantity` >= (SELECT `maxStock` FROM `products` WHERE `products`.`id` = `Inventory`.`productId`)');
  } else if (status === '1') {
    where[Op.and] = sequelize.literal(
      '`Inventory`.`quantity` > (SELECT `minStock` FROM `products` WHERE `products`.`id` = `Inventory`.`productId`) ' +
      'AND `Inventory`.`quantity` < (SELECT `maxStock` FROM `products` WHERE `products`.`id` = `Inventory`.`productId`)'
    );
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

  const formattedInventory = inventory.map(item => {
    const itemObj = item.toJSON();
    return {
      id: itemObj.id,
      _id: itemObj.id,
      sku: itemObj.product?.sku || '',
      productName: itemObj.product?.name || '',
      productId: itemObj.product?.id,
      warehouseName: itemObj.warehouse?.name || '',
      warehouseId: itemObj.warehouse?.id,
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
      total,
      pages: Math.ceil(total / limit),
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

  const inventory = await sequelize.transaction(async (t) => {
    const inv = await Inventory.findByPk(id, { transaction: t });

    if (!inv) {
      throw new NotFoundError('库存记录不存在');
    }

    if (inv.quantity + quantity < 0) {
      throw new BadRequestError('库存不足，无法执行该调整');
    }

    inv.quantity += quantity;
    inv.updatedBy = req.user.id;
    inv.lastUpdated = new Date();
    await inv.save({ transaction: t });

    if (quantity !== 0) {
      await Transaction.create({
        type: quantity > 0 ? 'in' : 'out',
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        quantity: Math.abs(quantity),
        remark: `库存调整${remark ? ': ' + remark : ''}`,
        createdBy: req.user.id,
        operator: req.user.id,
        status: 'completed',
      }, { transaction: t });
    }

    await inv.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    return inv;
  });

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

  const inventory = await sequelize.transaction(async (t) => {
    let inv = await Inventory.findOne({
      where: { productId: product, warehouseId: warehouse },
      transaction: t,
    });

    if (inv) {
      if (inv.quantity + quantity < 0) {
        throw new BadRequestError('库存不足，无法执行该调整');
      }
      inv.quantity += quantity;
      inv.updatedBy = req.user.id;
      inv.lastUpdated = new Date();
      await inv.save({ transaction: t });
    } else {
      if (quantity <= 0) {
        throw new BadRequestError('该商品在指定仓库没有库存记录，无法执行出库操作');
      }
      inv = await Inventory.create({
        productId: product,
        warehouseId: warehouse,
        quantity,
        updatedBy: req.user.id,
      }, { transaction: t });
    }

    if (quantity !== 0) {
      await Transaction.create({
        type: quantity > 0 ? 'in' : 'out',
        productId: product,
        warehouseId: warehouse,
        quantity: Math.abs(quantity),
        remark: `库存调整${remark ? ': ' + remark : ''}`,
        createdBy: req.user.id,
        operator: req.user.id,
        status: 'completed',
      }, { transaction: t });
    }

    await inv.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    return inv;
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

    // Create out transaction from source warehouse
    const outTransaction = await Transaction.create({
      type: 'out',
      productId: product,
      warehouseId: fromWarehouse,
      quantity,
      remark: `库存转移至仓库ID ${toWarehouse}${remark ? ': ' + remark : ''}`,
      createdBy: req.user.id,
      operator: req.user.id,
      status: 'completed',
    }, { transaction: t });

    // Create in transaction to destination warehouse
    const inTransaction = await Transaction.create({
      type: 'in',
      productId: product,
      warehouseId: toWarehouse,
      quantity,
      remark: `从仓库ID ${fromWarehouse} 转入${remark ? ': ' + remark : ''}`,
      createdBy: req.user.id,
      operator: req.user.id,
      status: 'completed',
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
      transactions: { out: outTransaction, in: inTransaction },
    });
  });
}));

// 获取低库存预警
router.get('/low-stock', auth, asyncHandler(async (req, res) => {
  // Single query using aggregation instead of N+1
  const inventorySums = await Inventory.findAll({
    attributes: [
      'productId',
      [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalStock'],
    ],
    group: ['productId'],
    raw: true,
  });

  const productIds = inventorySums.map(i => i.productId);
  const products = await Product.findAll({
    where: { id: { [Op.in]: productIds }, status: true },
    attributes: ['id', 'name', 'sku', 'minStock'],
    raw: true,
  });

  const stockMap = new Map(inventorySums.map(i => [i.productId, parseInt(i.totalStock) || 0]));

  const lowStockItems = products
    .filter(p => (stockMap.get(p.id) || 0) <= p.minStock)
    .map(p => ({
      product: p.id,
      name: p.name,
      sku: p.sku,
      minStock: p.minStock,
      currentStock: stockMap.get(p.id) || 0,
    }));

  res.json({ products: lowStockItems });
}));

module.exports = router;
