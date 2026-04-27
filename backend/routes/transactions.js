const express = require('express');
const { Transaction, Inventory, Product, Warehouse, Supplier, User, sequelize, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op, fn, col } = Sequelize;

// 获取出入库记录列表
router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    transactionNo,
    productName,
    type,
    status,
    startDate,
    endDate,
    warehouse,
    supplier,
    operator
  } = req.query;

  const where = {};
  const includeProduct = {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'sku', 'unit', 'price'],
    required: false,
  };

  if (transactionNo) {
    where.transactionNo = { [Op.like]: `%${transactionNo}%` };
  }

  if (productName) {
    includeProduct.where = {
      [Op.or]: [
        { name: { [Op.like]: `%${productName}%` } },
        { sku: { [Op.like]: `%${productName}%` } },
      ],
    };
    includeProduct.required = true;
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (warehouse) {
    where.warehouseId = warehouse;
  }

  if (supplier) {
    where.supplierId = supplier;
  }

  if (operator) {
    where.operator = operator;
  }

  if (startDate && endDate) {
    where.createdAt = {
      [Op.gte]: new Date(startDate),
      [Op.lte]: new Date(endDate),
    };
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: transactions } = await Transaction.findAndCountAll({
    where,
    include: [
      includeProduct,
      { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
      { model: User, as: 'operatorUser', attributes: ['realName'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  const formattedTransactions = transactions.map(t => {
    const tObj = t.toJSON();
    return {
      id: tObj.id,
      _id: tObj.id,
      transactionNo: tObj.transactionNo,
      productName: tObj.product?.name || '',
      sku: tObj.product?.sku || '',
      productId: tObj.product?.id,
      type: tObj.type,
      quantity: tObj.quantity,
      unitPrice: tObj.price || 0,
      totalAmount: (tObj.price || 0) * tObj.quantity,
      warehouseName: tObj.warehouse?.name || '',
      warehouseId: tObj.warehouse?.id,
      status: tObj.status,
      createdBy: tObj.operatorUser?.realName || '',
      createdAt: tObj.createdAt,
      remark: tObj.remark,
    };
  });

  res.json({
    transactions: formattedTransactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// 导出出入库记录（按条件搜索）
router.get('/export', auth, asyncHandler(async (req, res) => {
  const {
    transactionNo,
    productName,
    type,
    status,
    startDate,
    endDate,
  } = req.query;

  const where = {};
  const includeProduct = {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'sku', 'unit', 'specification'],
    required: false,
  };

  if (transactionNo) {
    where.transactionNo = { [Op.like]: `%${transactionNo}%` };
  }

  if (productName) {
    includeProduct.where = {
      [Op.or]: [
        { name: { [Op.like]: `%${productName}%` } },
        { sku: { [Op.like]: `%${productName}%` } },
      ],
    };
    includeProduct.required = true;
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (startDate && endDate) {
    where.createdAt = {
      [Op.gte]: new Date(startDate),
      [Op.lte]: new Date(endDate),
    };
  }

  const transactions = await Transaction.findAll({
    where,
    include: [
      includeProduct,
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      { model: User, as: 'operatorUser', attributes: ['realName'], required: false },
    ],
    order: [['createdAt', 'DESC']],
  });

  const formatted = transactions.map(t => {
    const tObj = t.toJSON();
    return {
      id: tObj.id,
      transactionNo: tObj.transactionNo,
      type: tObj.type,
      productName: tObj.product?.name || '未知商品',
      sku: tObj.product?.sku || '',
      spec: tObj.product?.specification || '',
      unit: tObj.product?.unit || '',
      warehouseName: tObj.warehouse?.name || '未知仓库',
      quantity: tObj.quantity,
      unitPrice: tObj.unitPrice || tObj.price || 0,
      totalAmount: (tObj.unitPrice || tObj.price || 0) * tObj.quantity,
      consumptionUnit: tObj.consumptionUnit || '',
      consumptionDate: tObj.consumptionDate,
      consumptionApprover: tObj.consumptionApprover || '',
      consumptionHandler: tObj.consumptionHandler || '',
      status: tObj.status,
      createdBy: tObj.operatorUser?.realName || '未知',
      createdAt: tObj.createdAt,
      remark: tObj.remark || '',
    };
  });

  res.json(formatted);
}));

// 获取最近交易记录
router.get('/recent/list', auth, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const transactions = await Transaction.findAll({
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit,
  });

  const formatted = transactions.map(t => {
    const tObj = t.toJSON();
    return {
      id: tObj.id,
      transactionNo: tObj.transactionNo,
      productName: tObj.product?.name || '未知商品',
      type: tObj.type,
      quantity: tObj.quantity,
      time: tObj.createdAt,
    };
  });

  res.json({ transactions: formatted });
}));

// 获取单个交易详情
router.get('/:id', auth, asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id, {
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit', 'specification'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name', 'location'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['name', 'contact', 'phone'], required: false },
      { model: User, as: 'operatorUser', attributes: ['realName', 'username'], required: false },
    ],
  });

  if (!transaction) {
    throw new NotFoundError('交易记录不存在');
  }

  res.json({ transaction });
}));

// 处理入库逻辑
async function handleInbound(req, res) {
  const {
    productId,
    warehouseId,
    quantity,
    unitPrice,
    remark,
    product,
    warehouse,
    price,
    supplier,
    batchNumber,
    productionDate,
    expiryDate
  } = req.body;

  const finalProduct = productId || product;
  const finalWarehouse = warehouseId || warehouse;
  const finalPrice = unitPrice || price || 0;

  if (!finalProduct || !finalWarehouse || !quantity || quantity <= 0) {
    throw new BadRequestError('参数不完整或数量无效');
  }

  await sequelize.transaction(async (t) => {
    // Create transaction
    const transaction = await Transaction.create({
      type: 'in',
      productId: finalProduct,
      warehouseId: finalWarehouse,
      quantity,
      price: finalPrice,
      supplierId: supplier,
      remark,
      operator: req.user.id,
      createdBy: req.user.id,
      batchNumber,
      productionDate,
      expiryDate,
      status: 'completed',
    }, { transaction: t });

    // Update inventory
    let inventory = await Inventory.findOne({
      where: { productId: finalProduct, warehouseId: finalWarehouse },
      transaction: t,
    });

    if (inventory) {
      inventory.quantity += quantity;
      inventory.updatedBy = req.user.id;
      inventory.lastUpdated = new Date();
      await inventory.save({ transaction: t });
    } else {
      inventory = await Inventory.create({
        productId: finalProduct,
        warehouseId: finalWarehouse,
        quantity: quantity,
        updatedBy: req.user.id,
        batchNumber: transaction.batchNumber,
        productionDate: transaction.productionDate,
        expiryDate: transaction.expiryDate,
      }, { transaction: t });
    }

    await transaction.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
        { model: Supplier, as: 'supplier', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    res.status(201).json({
      message: '入库成功',
      transaction,
    });
  });
}

router.post('/in', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), asyncHandler(handleInbound));
router.post('/inbound', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), asyncHandler(handleInbound));

// 处理出库逻辑
async function handleOutbound(req, res) {
  const {
    productId,
    warehouseId,
    quantity,
    unitPrice,
    remark,
    product,
    warehouse,
    price,
    customer,
    consumptionUnit,
    consumptionApprover,
    consumptionHandler,
    consumptionDate
  } = req.body;

  const finalProduct = productId || product;
  const finalWarehouse = warehouseId || warehouse;
  const finalPrice = unitPrice || price || 0;

  if (!finalProduct || !finalWarehouse || !quantity || quantity <= 0) {
    throw new BadRequestError('参数不完整或数量无效');
  }

  await sequelize.transaction(async (t) => {
    // Check inventory
    const inventory = await Inventory.findOne({
      where: { productId: finalProduct, warehouseId: finalWarehouse },
      transaction: t,
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new BadRequestError('库存不足');
    }

    // Create transaction
    const transaction = await Transaction.create({
      type: 'out',
      productId: finalProduct,
      warehouseId: finalWarehouse,
      quantity,
      price: finalPrice,
      customer,
      remark,
      operator: req.user.id,
      createdBy: req.user.id,
      status: 'completed',
      consumptionUnit,
      consumptionApprover,
      consumptionHandler,
      consumptionDate,
    }, { transaction: t });

    // Update inventory
    inventory.quantity -= quantity;
    inventory.updatedBy = req.user.id;
    inventory.lastUpdated = new Date();
    await inventory.save({ transaction: t });

    await transaction.reload({
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
        { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
      ],
      transaction: t,
    });

    res.status(201).json({
      message: '出库成功',
      transaction,
    });
  });
}

router.post('/out', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), asyncHandler(handleOutbound));
router.post('/outbound', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), asyncHandler(handleOutbound));

// 处理审核逻辑
async function handleAudit(req, res) {
  const { id } = req.params;
  const { status, remark } = req.body;

  let mappedStatus = status;
  if (status === 'approved') {
    mappedStatus = 'completed';
  } else if (status === 'rejected') {
    mappedStatus = 'cancelled';
  }

  if (!['completed', 'cancelled'].includes(mappedStatus)) {
    throw new BadRequestError('无效的审核状态');
  }

  await sequelize.transaction(async (t) => {
    const transaction = await Transaction.findByPk(id, { transaction: t });

    if (!transaction) {
      throw new NotFoundError('交易记录不存在');
    }

    if (transaction.type !== 'in') {
      throw new BadRequestError('只能审核入库单');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestError('该入库单已审核或已取消，无法重复审核');
    }

    if (mappedStatus === 'completed') {
      // Update inventory
      let inventory = await Inventory.findOne({
        where: {
          productId: transaction.productId,
          warehouseId: transaction.warehouseId,
        },
        transaction: t,
      });

      if (inventory) {
        inventory.quantity += transaction.quantity;
        inventory.updatedBy = req.user.id;
        inventory.lastUpdated = new Date();
        await inventory.save({ transaction: t });
      } else {
        inventory = await Inventory.create({
          productId: transaction.productId,
          warehouseId: transaction.warehouseId,
          quantity: transaction.quantity,
          updatedBy: req.user.id,
          batchNumber: transaction.batchNumber,
          productionDate: transaction.productionDate,
          expiryDate: transaction.expiryDate,
        }, { transaction: t });
      }

      transaction.status = 'completed';
      transaction.auditBy = req.user.id;
      transaction.auditTime = new Date();
      transaction.auditRemark = remark || '';
      await transaction.save({ transaction: t });

      await transaction.reload({
        include: [
          { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
          { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
          { model: Supplier, as: 'supplier', attributes: ['name'], required: false },
        ],
        transaction: t,
      });

      res.json({
        message: '入库单审核通过，库存已更新',
        transaction,
      });
    } else {
      transaction.status = 'cancelled';
      transaction.auditBy = req.user.id;
      transaction.auditTime = new Date();
      transaction.auditRemark = remark || '';
      await transaction.save({ transaction: t });

      res.json({
        message: '入库单已拒绝',
        transaction,
      });
    }
  });
}

router.put('/:id/audit', auth, requireRole(['admin', 'manager']), asyncHandler(handleAudit));
router.post('/:id/audit', auth, requireRole(['admin', 'manager']), asyncHandler(handleAudit));

// 处理取消逻辑
async function handleCancel(req, res) {
  await sequelize.transaction(async (t) => {
    const transaction = await Transaction.findByPk(req.params.id, { transaction: t });

    if (!transaction) {
      throw new NotFoundError('交易记录不存在');
    }

    if (transaction.status === 'cancelled') {
      throw new BadRequestError('该交易已被取消');
    }

    if (transaction.status === 'completed') {
      const inventory = await Inventory.findOne({
        where: {
          productId: transaction.productId,
          warehouseId: transaction.warehouseId,
        },
        transaction: t,
      });

      if (!inventory) {
        throw new BadRequestError('库存记录不存在');
      }

      if (transaction.type === 'in') {
        if (inventory.quantity < transaction.quantity) {
          throw new BadRequestError('当前库存不足，无法取消入库');
        }
        inventory.quantity -= transaction.quantity;
      } else {
        inventory.quantity += transaction.quantity;
      }

      inventory.updatedBy = req.user.id;
      inventory.lastUpdated = new Date();
      await inventory.save({ transaction: t });
    }

    transaction.status = 'cancelled';
    transaction.remark = req.body.reason || transaction.remark;
    await transaction.save({ transaction: t });

    res.json({
      message: '交易已取消',
      transaction,
    });
  });
}

router.put('/:id/cancel', auth, requireRole(['admin', 'manager']), asyncHandler(handleCancel));
router.post('/:id/cancel', auth, requireRole(['admin', 'manager']), asyncHandler(handleCancel));

// 更新交易记录
router.put('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    productId,
    warehouseId,
    quantity,
    unitPrice,
    remark,
    customer,
    consumptionUnit,
    consumptionApprover,
    consumptionHandler,
    consumptionDate
  } = req.body;

  const transaction = await Transaction.findByPk(id);
  if (!transaction) {
    throw new NotFoundError('交易记录不存在');
  }

  // Update basic fields
  if (productId) transaction.productId = productId;
  if (warehouseId) transaction.warehouseId = warehouseId;
  if (quantity !== undefined) transaction.quantity = quantity;
  if (unitPrice !== undefined) transaction.unitPrice = unitPrice;
  if (remark !== undefined) transaction.remark = remark;
  if (customer !== undefined) transaction.customer = customer;
  if (consumptionUnit !== undefined) transaction.consumptionUnit = consumptionUnit;
  if (consumptionApprover !== undefined) transaction.consumptionApprover = consumptionApprover;
  if (consumptionHandler !== undefined) transaction.consumptionHandler = consumptionHandler;
  if (consumptionDate !== undefined) transaction.consumptionDate = consumptionDate;

  await transaction.save();

  await transaction.reload({
    include: [
      { model: Product, as: 'product', attributes: ['name', 'sku', 'unit'], required: false },
      { model: Warehouse, as: 'warehouse', attributes: ['name'], required: false },
    ],
  });

  res.json({
    message: '更新成功',
    transaction,
  });
}));

module.exports = router;
