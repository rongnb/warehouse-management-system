const express = require('express');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取出入库记录列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword, 
      type, 
      warehouse,
      startDate,
      endDate
    } = req.query;
    
    const query = {};

    if (keyword) {
      // 先查询商品
      const products = await Product.find({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { sku: { $regex: keyword, $options: 'i' } },
        ]
      }).select('_id');
      
      query.$or = [
        { transactionNo: { $regex: keyword, $options: 'i' } },
        { product: { $in: products.map(p => p._id) } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await Transaction.find(query)
      .populate('product', 'name sku unit')
      .populate('warehouse', 'name')
      .populate('supplier', 'name')
      .populate('operator', 'realName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
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

// 入库
router.post('/in', auth, requireRole(['admin', 'manager', 'staff']), async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    const { 
      product, 
      warehouse, 
      quantity, 
      price, 
      supplier, 
      remark,
      batchNumber,
      productionDate,
      expiryDate
    } = req.body;

    if (!product || !warehouse || !quantity || quantity <= 0) {
      return res.status(400).json({ message: '参数不完整或数量无效' });
    }

    // 创建交易记录
    const transaction = new Transaction({
      type: 'in',
      product,
      warehouse,
      quantity,
      price: price || 0,
      supplier,
      remark,
      operator: req.user._id,
      batchNumber,
      productionDate,
      expiryDate,
    });

    await transaction.save({ session });

    // 更新库存
    const inventory = await Inventory.findOne({ product, warehouse }).session(session);
    
    if (inventory) {
      inventory.quantity += quantity;
      inventory.updatedBy = req.user._id;
      inventory.lastUpdated = new Date();
      await inventory.save({ session });
    } else {
      const newInventory = new Inventory({
        product,
        warehouse,
        quantity,
        updatedBy: req.user._id,
        batchNumber,
        productionDate,
        expiryDate,
      });
      await newInventory.save({ session });
    }

    await session.commitTransaction();
    await transaction.populate('product warehouse supplier', 'name sku unit');

    res.status(201).json({
      message: '入库成功',
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: '入库失败', error: error.message });
  } finally {
    session.endSession();
  }
});

// 出库
router.post('/out', auth, requireRole(['admin', 'manager', 'staff']), async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    const { 
      product, 
      warehouse, 
      quantity, 
      price, 
      customer, 
      remark 
    } = req.body;

    if (!product || !warehouse || !quantity || quantity <= 0) {
      return res.status(400).json({ message: '参数不完整或数量无效' });
    }

    // 检查库存是否足够
    const inventory = await Inventory.findOne({ product, warehouse }).session(session);
    
    if (!inventory || inventory.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({ message: '库存不足' });
    }

    // 创建交易记录
    const transaction = new Transaction({
      type: 'out',
      product,
      warehouse,
      quantity,
      price: price || 0,
      customer,
      remark,
      operator: req.user._id,
    });

    await transaction.save({ session });

    // 更新库存
    inventory.quantity -= quantity;
    inventory.updatedBy = req.user._id;
    inventory.lastUpdated = new Date();
    await inventory.save({ session });

    await session.commitTransaction();
    await transaction.populate('product warehouse', 'name sku unit');

    res.status(201).json({
      message: '出库成功',
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: '出库失败', error: error.message });
  } finally {
    session.endSession();
  }
});

// 取消交易
router.put('/:id/cancel', auth, requireRole(['admin', 'manager']), async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id).session(session);
    
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ message: '交易记录不存在' });
    }

    if (transaction.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({ message: '该交易已被取消' });
    }

    // 恢复库存
    const inventory = await Inventory.findOne({ 
      product: transaction.product, 
      warehouse: transaction.warehouse 
    }).session(session);

    if (!inventory) {
      await session.abortTransaction();
      return res.status(400).json({ message: '库存记录不存在' });
    }

    if (transaction.type === 'in') {
      // 入库取消，扣减库存
      if (inventory.quantity < transaction.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ message: '当前库存不足，无法取消入库' });
      }
      inventory.quantity -= transaction.quantity;
    } else {
      // 出库取消，增加库存
      inventory.quantity += transaction.quantity;
    }

    inventory.updatedBy = req.user._id;
    inventory.lastUpdated = new Date();
    await inventory.save({ session });

    // 更新交易状态
    transaction.status = 'cancelled';
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      message: '交易已取消',
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: '取消交易失败', error: error.message });
  } finally {
    session.endSession();
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

    // 格式化数据
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

module.exports = router;
