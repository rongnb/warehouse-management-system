const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const Stocktake = require('../models/Stocktake');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 获取盘库列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, warehouse, keyword, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;
    if (keyword) {
      query.$or = [
        { stocktakeNo: { $regex: keyword, $options: 'i' } },
        { title: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stocktakes = await Stocktake.find(query)
      .populate('warehouse', 'name')
      .populate('createdBy', 'realName username')
      .populate('firstConfirmedBy', 'realName username')
      .populate('secondConfirmedBy', 'realName username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Stocktake.countDocuments(query);

    res.json({
      stocktakes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取盘库列表失败', error: error.message });
  }
});

// 获取盘库详情
router.get('/:id', auth, async (req, res) => {
  try {
    const stocktake = await Stocktake.findById(req.params.id)
      .populate('warehouse', 'name address')
      .populate('createdBy', 'realName username')
      .populate('firstConfirmedBy', 'realName username')
      .populate('secondConfirmedBy', 'realName username')
      .populate('items.product', 'name sku spec unit price');

    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    res.json({ stocktake });
  } catch (error) {
    res.status(500).json({ message: '获取盘库详情失败', error: error.message });
  }
});

// 创建盘库单：管理员、经理、仓管员都可以发起
router.post('/', auth, requireRole(['admin', 'manager', 'warehouse_keeper']), async (req, res) => {
  try {
    const { title, warehouse, remark } = req.body;

    if (!title || !warehouse) {
      return res.status(400).json({ message: '标题和仓库不能为空' });
    }

    const warehouseExists = await Warehouse.findById(warehouse);
    if (!warehouseExists) {
      return res.status(400).json({ message: '仓库不存在' });
    }

    // 获取该仓库所有库存
    const inventories = await Inventory.find({ warehouse })
      .populate('product', 'name sku spec unit price');

    const items = inventories.map(inv => {
      const systemQuantity = inv.quantity;
      return {
        product: inv.product._id,
        sku: inv.product.sku,
        productName: inv.product.name,
        spec: inv.product.spec,
        unit: inv.product.unit,
        systemQuantity,
        actualQuantity: 0,
        difference: -systemQuantity,
        differenceType: 'loss',
        unitPrice: inv.product.price || 0,
        totalAmount: -systemQuantity * (inv.product.price || 0),
      };
    });

    const stocktake = new Stocktake({
      title,
      warehouse,
      warehouseName: warehouseExists.name,
      startTime: new Date(),
      items,
      createdBy: req.user._id,
      remark,
    });

    await stocktake.save();

    res.json({ stocktake, message: '盘库单创建成功' });
  } catch (error) {
    res.status(500).json({ message: '创建盘库单失败', error: error.message });
  }
});

// 更新盘库单（录入实际库存）
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, remark } = req.body;

    const stocktake = await Stocktake.findById(id);
    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    if (stocktake.status !== 'draft') {
      return res.status(400).json({ message: '只能编辑草稿状态的盘库单' });
    }

    // 计算盘盈盘亏
    let totalProfitQuantity = 0;
    let totalProfitAmount = 0;
    let totalLossQuantity = 0;
    let totalLossAmount = 0;

    const updatedItems = items.map(item => {
      const difference = item.actualQuantity - item.systemQuantity;
      let differenceType = 'none';

      if (difference > 0) {
        differenceType = 'profit';
        totalProfitQuantity += difference;
        totalProfitAmount += difference * item.unitPrice;
      } else if (difference < 0) {
        differenceType = 'loss';
        totalLossQuantity += Math.abs(difference);
        totalLossAmount += Math.abs(difference) * item.unitPrice;
      }

      return {
        ...item,
        difference,
        differenceType,
        totalAmount: difference * item.unitPrice,
      };
    });

    stocktake.items = updatedItems;
    stocktake.totalProfitQuantity = totalProfitQuantity;
    stocktake.totalProfitAmount = totalProfitAmount;
    stocktake.totalLossQuantity = totalLossQuantity;
    stocktake.totalLossAmount = totalLossAmount;
    stocktake.remark = remark || stocktake.remark;

    await stocktake.save();

    res.json({ stocktake, message: '盘库单更新成功' });
  } catch (error) {
    res.status(500).json({ message: '更新盘库单失败', error: error.message });
  }
});

// 提交盘库单（进入核实流程）
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const stocktake = await Stocktake.findById(id);
    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    if (stocktake.status !== 'draft') {
      return res.status(400).json({ message: '只能提交草稿状态的盘库单' });
    }

    stocktake.status = 'confirming';
    await stocktake.save();

    res.json({ message: '盘库单已提交，等待核实' });
  } catch (error) {
    res.status(500).json({ message: '提交盘库单失败', error: error.message });
  }
});

// 核实盘库单 - 双人核实，发起人可以作为第一核实人
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    const stocktake = await Stocktake.findById(id);
    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    if (stocktake.status !== 'confirming') {
      return res.status(400).json({ message: '盘库单不在核实状态' });
    }

    // 双人核实逻辑
    if (!stocktake.firstConfirmedBy) {
      // 第一核实人（发起人也可以）
      stocktake.firstConfirmedBy = req.user._id;
      stocktake.firstConfirmedAt = new Date();
      stocktake.firstConfirmedRemark = remark || '';
      await stocktake.save();
      res.json({ message: '第一核实人确认成功，等待第二核实人确认' });
    } else if (!stocktake.secondConfirmedBy) {
      // 第二核实人：不能是第一核实人
      if (stocktake.firstConfirmedBy.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: '第二核实人不能与第一核实人相同' });
      }

      stocktake.secondConfirmedBy = req.user._id;
      stocktake.secondConfirmedAt = new Date();
      stocktake.secondConfirmedRemark = remark || '';
      stocktake.status = 'completed';
      stocktake.completedBy = req.user._id;
      stocktake.completedAt = new Date();
      stocktake.endTime = new Date();

      // 更新库存并生成出入库记录
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        for (const item of stocktake.items) {
          if (item.difference !== 0) {
            // 更新库存
            await Inventory.findOneAndUpdate(
              { product: item.product, warehouse: stocktake.warehouse },
              { $inc: { quantity: item.difference, lastUpdated: new Date(), updatedBy: req.user._id } },
              { session }
            );

            // 生成交易记录
            const transactionType = item.difference > 0 ? 'stocktake_profit' : 'stocktake_loss';
            const transaction = new Transaction({
              transactionNo: `TR${Date.now()}`,
              type: transactionType,
              product: item.product,
              warehouse: stocktake.warehouse,
              quantity: Math.abs(item.difference),
              price: item.unitPrice,
              referenceNo: stocktake.stocktakeNo,
              remark: `盘库${item.differenceType === 'profit' ? '盘盈' : '盘亏'}：${item.productName}`,
              createdBy: req.user._id,
              status: 'completed',
            });
            await transaction.save({ session });
          }
        }

        await session.commitTransaction();
        session.endSession();

        await stocktake.save();
        res.json({ message: '第二核实人确认成功，盘库完成，库存已更新' });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      return res.status(400).json({ message: '盘库单已完成核实' });
    }
  } catch (error) {
    res.status(500).json({ message: '核实盘库单失败', error: error.message });
  }
});

// 取消盘库单
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: '取消原因不能为空' });
    }

    const stocktake = await Stocktake.findById(id);
    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    if (stocktake.status === 'completed') {
      return res.status(400).json({ message: '已完成的盘库单不能取消' });
    }

    stocktake.status = 'cancelled';
    stocktake.cancelledBy = req.user._id;
    stocktake.cancelledAt = new Date();
    stocktake.cancelReason = reason;

    await stocktake.save();

    res.json({ message: '盘库单已取消' });
  } catch (error) {
    res.status(500).json({ message: '取消盘库单失败', error: error.message });
  }
});

// 导出盘库报表
router.get('/:id/export', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const stocktake = await Stocktake.findById(id)
      .populate('warehouse', 'name address')
      .populate('createdBy', 'realName username')
      .populate('firstConfirmedBy', 'realName username')
      .populate('secondConfirmedBy', 'realName username');

    if (!stocktake) {
      return res.status(404).json({ message: '盘库记录不存在' });
    }

    // 构造导出数据
    const exportData = {
      stocktakeNo: stocktake.stocktakeNo,
      title: stocktake.title,
      warehouseName: stocktake.warehouseName,
      status: stocktake.status,
      startTime: stocktake.startTime,
      endTime: stocktake.endTime,
      totalProfitQuantity: stocktake.totalProfitQuantity,
      totalProfitAmount: stocktake.totalProfitAmount,
      totalLossQuantity: stocktake.totalLossQuantity,
      totalLossAmount: stocktake.totalLossAmount,
      firstConfirmedBy: stocktake.firstConfirmedBy?.realName,
      firstConfirmedAt: stocktake.firstConfirmedAt,
      secondConfirmedBy: stocktake.secondConfirmedBy?.realName,
      secondConfirmedAt: stocktake.secondConfirmedAt,
      createdBy: stocktake.createdBy?.realName,
      createdAt: stocktake.createdAt,
      remark: stocktake.remark,
      items: stocktake.items.map(item => ({
        sku: item.sku,
        productName: item.productName,
        spec: item.spec,
        unit: item.unit,
        systemQuantity: item.systemQuantity,
        actualQuantity: item.actualQuantity,
        difference: item.difference,
        differenceType: item.differenceType === 'profit' ? '盘盈' : item.differenceType === 'loss' ? '盘亏' : '无差异',
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        remark: item.remark,
      })),
    };

    res.json({ data: exportData, message: '导出成功' });
  } catch (error) {
    res.status(500).json({ message: '导出盘库报表失败', error: error.message });
  }
});

module.exports = router;
