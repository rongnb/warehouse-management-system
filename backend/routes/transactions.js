const express = require('express');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取出入库记录列表
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      transactionNo,
      productName,
      type,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (transactionNo) {
      query.transactionNo = { $regex: transactionNo, $options: 'i' };
    }

    if (productName) {
      const products = await Product.find({
        $or: [
          { name: { $regex: productName, $options: 'i' } },
          { sku: { $regex: productName, $options: 'i' } },
        ]
      }).select('_id');

      query.product = { $in: products.map(p => p._id) };
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await Transaction.find(query)
      .populate('product', 'name sku unit price')
      .populate('warehouse', 'name')
      .populate('supplier', 'name')
      .populate('operator', 'realName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(t => ({
      id: t._id,
      _id: t._id,
      transactionNo: t.transactionNo,
      productName: t.product?.name || '',
      sku: t.product?.sku || '',
      productId: t.product?._id,
      type: t.type,
      quantity: t.quantity,
      unitPrice: t.price || 0,
      totalAmount: (t.price || 0) * t.quantity,
      warehouseName: t.warehouse?.name || '',
      warehouseId: t.warehouse?._id,
      status: t.status,
      createdBy: t.operator?.realName || '',
      createdAt: t.createdAt?.toLocaleString() || '',
      remark: t.remark,
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取交易记录失败', error: error.message });
  }
});

// 导出出入库记录（按条件搜索）
router.get('/export', auth, async (req, res) => {
  try {
    const {
      transactionNo,
      productName,
      type,
      status,
      startDate,
      endDate,
    } = req.query;

    // 构建查询条件
    const query = {};

    if (transactionNo) {
      query.transactionNo = new RegExp(transactionNo, 'i');
    }
    if (productName) {
      // 需要通过product名称搜索，先查找匹配的产品
      const products = await Product.find({
        $or: [
          { name: { $regex: productName, $options: 'i' } },
          { sku: { $regex: productName, $options: 'i' } },
        ]
      }).select('_id');
      query.product = { $in: products.map(p => p._id) };
    }
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 查询所有符合条件的记录，populate关联数据
    const transactions = await Transaction.find(query)
      .populate('product', 'name sku unit specification')
      .populate('warehouse', 'name')
      .populate('operator', 'realName')
      .sort({ createdAt: -1 });

    // 格式化数据
    const formatted = transactions.map(t => ({
      id: t._id,
      transactionNo: t.transactionNo,
      type: t.type,
      productName: t.product?.name || '未知商品',
      sku: t.product?.sku || '',
      spec: t.product?.specification || '',
      unit: t.product?.unit || '',
      warehouseName: t.warehouse?.name || '未知仓库',
      quantity: t.quantity,
      unitPrice: t.unitPrice || t.price || 0,
      totalAmount: (t.unitPrice || t.price || 0) * t.quantity,
      consumptionUnit: t.consumptionUnit || '',
      consumptionDate: t.consumptionDate,
      consumptionApprover: t.consumptionApprover || '',
      consumptionHandler: t.consumptionHandler || '',
      status: t.status,
      createdBy: t.operator?.realName || '未知',
      createdAt: t.createdAt,
      remark: t.remark || '',
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('导出出入库记录失败:', error);
    res.status(500).json({ message: '导出失败', error: error.message });
  }
});

// 获取最近交易记录
router.get('/recent/list', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await Transaction.find()
      .populate('product', 'name sku')
      .populate('warehouse', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = transactions.map(t => ({
      id: t._id,
      transactionNo: t.transactionNo,
      productName: t.product?.name || '未知商品',
      type: t.type,
      quantity: t.quantity,
      time: t.createdAt.toLocaleString(),
    }));

    res.json({ transactions: formatted });
  } catch (error) {
    res.status(500).json({ message: '获取最近交易失败', error: error.message });
  }
});

// 获取单个交易详情
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('product', 'name sku unit specification')
      .populate('warehouse', 'name location')
      .populate('supplier', 'name contact phone')
      .populate('operator', 'realName username');

    if (!transaction) {
      return res.status(404).json({ message: '交易记录不存在' });
    }

    res.json({ transaction });
  } catch (error) {
    res.status(500).json({ message: '获取交易详情失败', error: error.message });
  }
});

// 处理入库逻辑
async function handleInbound(req, res) {
  try {
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
      return res.status(400).json({ message: '参数不完整或数量无效' });
    }

    const transaction = new Transaction({
      transactionNo: `TR${Date.now()}`,
      type: 'in',
      product: finalProduct,
      warehouse: finalWarehouse,
      quantity,
      price: finalPrice,
      supplier,
      remark,
      operator: req.user._id,
      createdBy: req.user._id,
      batchNumber,
      productionDate,
      expiryDate,
      status: 'completed',
    });

    await transaction.save();

    // 直接更新库存
    const inventory = await Inventory.findOne({
      product: finalProduct,
      warehouse: finalWarehouse
    });

    if (inventory) {
      inventory.quantity += quantity;
      inventory.updatedBy = req.user._id;
      inventory.lastUpdated = new Date();
      await inventory.save();
    } else {
      const newInventory = new Inventory({
        product: finalProduct,
        warehouse: finalWarehouse,
        quantity: quantity,
        updatedBy: req.user._id,
        batchNumber: transaction.batchNumber,
        productionDate: transaction.productionDate,
        expiryDate: transaction.expiryDate,
      });
      await newInventory.save();
    }

    await transaction.populate('product warehouse supplier', 'name sku unit');

    res.status(201).json({
      message: '入库成功',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: '入库失败', error: error.message });
  }
}

router.post('/in', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), async (req, res) => {
  return handleInbound(req, res);
});

router.post('/inbound', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), async (req, res) => {
  return handleInbound(req, res);
});

// 处理出库逻辑
async function handleOutbound(req, res) {
  try {
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
      return res.status(400).json({ message: '参数不完整或数量无效' });
    }

    const inventory = await Inventory.findOne({ product: finalProduct, warehouse: finalWarehouse });

    if (!inventory || inventory.quantity < quantity) {
      return res.status(400).json({ message: '库存不足' });
    }

    const transaction = new Transaction({
      transactionNo: `TR${Date.now()}`,
      type: 'out',
      product: finalProduct,
      warehouse: finalWarehouse,
      quantity,
      price: finalPrice,
      customer,
      remark,
      operator: req.user._id,
      createdBy: req.user._id,
      status: 'completed',
      consumptionUnit,
      consumptionApprover,
      consumptionHandler,
      consumptionDate,
    });

    await transaction.save();

    inventory.quantity -= quantity;
    inventory.updatedBy = req.user._id;
    inventory.lastUpdated = new Date();
    await inventory.save();

    await transaction.populate('product warehouse', 'name sku unit');

    res.status(201).json({
      message: '出库成功',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: '出库失败', error: error.message });
  }
}

router.post('/out', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), async (req, res) => {
  return handleOutbound(req, res);
});

router.post('/outbound', auth, requireRole(['admin', 'manager', 'staff', 'warehouse_keeper']), async (req, res) => {
  return handleOutbound(req, res);
});

// 处理审核逻辑
async function handleAudit(req, res) {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    let mappedStatus = status;
    if (status === 'approved') {
      mappedStatus = 'completed';
    } else if (status === 'rejected') {
      mappedStatus = 'cancelled';
    }

    if (!['completed', 'cancelled'].includes(mappedStatus)) {
      return res.status(400).json({ message: '无效的审核状态' });
    }

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: '交易记录不存在' });
    }

    if (transaction.type !== 'in') {
      return res.status(400).json({ message: '只能审核入库单' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: '该入库单已审核或已取消，无法重复审核' });
    }

    if (mappedStatus === 'completed') {
      const inventory = await Inventory.findOne({
        product: transaction.product,
        warehouse: transaction.warehouse
      });

      if (inventory) {
        inventory.quantity += transaction.quantity;
        inventory.updatedBy = req.user._id;
        inventory.lastUpdated = new Date();
        await inventory.save();
      } else {
        const newInventory = new Inventory({
          product: transaction.product,
          warehouse: transaction.warehouse,
          quantity: transaction.quantity,
          updatedBy: req.user._id,
          batchNumber: transaction.batchNumber,
          productionDate: transaction.productionDate,
          expiryDate: transaction.expiryDate,
        });
        await newInventory.save();
      }

      transaction.status = 'completed';
      transaction.auditBy = req.user._id;
      transaction.auditTime = new Date();
      transaction.auditRemark = remark || '';
      await transaction.save();
      await transaction.populate('product warehouse supplier', 'name sku unit');

      res.json({
        message: '入库单审核通过，库存已更新',
        transaction,
      });
    } else {
      transaction.status = 'cancelled';
      transaction.auditBy = req.user._id;
      transaction.auditTime = new Date();
      transaction.auditRemark = remark || '';
      await transaction.save();

      res.json({
        message: '入库单已拒绝',
        transaction,
      });
    }
  } catch (error) {
    res.status(500).json({ message: '审核入库单失败', error: error.message });
  }
}

router.put('/:id/audit', auth, requireRole(['admin', 'manager']), async (req, res) => {
  return handleAudit(req, res);
});

router.post('/:id/audit', auth, requireRole(['admin', 'manager']), async (req, res) => {
  return handleAudit(req, res);
});

// 处理取消逻辑
async function handleCancel(req, res) {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: '交易记录不存在' });
    }

    if (transaction.status === 'cancelled') {
      return res.status(400).json({ message: '该交易已被取消' });
    }

    if (transaction.status === 'completed') {
      const inventory = await Inventory.findOne({
        product: transaction.product,
        warehouse: transaction.warehouse
      });

      if (!inventory) {
        return res.status(400).json({ message: '库存记录不存在' });
      }

      if (transaction.type === 'in') {
        if (inventory.quantity < transaction.quantity) {
          return res.status(400).json({ message: '当前库存不足，无法取消入库' });
        }
        inventory.quantity -= transaction.quantity;
      } else {
        inventory.quantity += transaction.quantity;
      }

      inventory.updatedBy = req.user._id;
      inventory.lastUpdated = new Date();
      await inventory.save();
    }

    transaction.status = 'cancelled';
    transaction.remark = req.body.reason || transaction.remark;
    await transaction.save();

    res.json({
      message: '交易已取消',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: '取消交易失败', error: error.message });
  }
}

router.put('/:id/cancel', auth, requireRole(['admin', 'manager']), async (req, res) => {
  return handleCancel(req, res);
});

router.post('/:id/cancel', auth, requireRole(['admin', 'manager']), async (req, res) => {
  return handleCancel(req, res);
});

// 更新交易记录
router.put('/:id', auth, async (req, res) => {
  try {
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

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: '交易记录不存在' });
    }

    // 更新基本信息
    if (productId) transaction.product = productId;
    if (warehouseId) transaction.warehouse = warehouseId;
    if (quantity !== undefined) transaction.quantity = quantity;
    if (unitPrice !== undefined) transaction.unitPrice = unitPrice;
    if (remark !== undefined) transaction.remark = remark;
    if (customer !== undefined) transaction.customer = customer;
    // 更新领用相关字段
    if (consumptionUnit !== undefined) transaction.consumptionUnit = consumptionUnit;
    if (consumptionApprover !== undefined) transaction.consumptionApprover = consumptionApprover;
    if (consumptionHandler !== undefined) transaction.consumptionHandler = consumptionHandler;
    if (consumptionDate !== undefined) transaction.consumptionDate = consumptionDate;

    await transaction.save();
    await transaction.populate('product warehouse', 'name sku unit');

    res.json({
      message: '更新成功',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: '更新失败', error: error.message });
  }
});

module.exports = router;
