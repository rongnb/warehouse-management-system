const express = require('express');
const { Product, Inventory, Transaction, Warehouse, sequelize, Sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const dayjs = require('dayjs');
const logger = require('../utils/logger');

const router = express.Router();
const { Op, fn, col } = Sequelize;

// 获取仪表盘统计数据
router.get('/stats', auth, asyncHandler(async (req, res) => {
  // 商品总数
  const productCount = await Product.count({ where: { status: true } });

  // 库存总价值
  const inventory = await Inventory.findAll({
    include: [
      { model: Product, as: 'product', attributes: ['costPrice'], required: false },
    ],
    raw: false,
  });

  const inventoryValue = inventory.reduce((total, item) => {
    return total + (item.quantity * (item.product?.costPrice || 0));
  }, 0);

  // 今日入库
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();

  const todayIn = await Transaction.findAll({
    where: {
      type: 'in',
      createdAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd },
      status: 'completed',
    },
    attributes: [[fn('SUM', col('quantity')), 'total']],
    raw: true,
  });

  // 今日出库
  const todayOut = await Transaction.findAll({
    where: {
      type: 'out',
      createdAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd },
      status: 'completed',
    },
    attributes: [[fn('SUM', col('quantity')), 'total']],
    raw: true,
  });

  // 本月入库笔数
  const monthStart = dayjs().startOf('month').toDate();
  const monthEnd = dayjs().endOf('month').toDate();

  const inRate = await Transaction.count({
    where: {
      type: 'in',
      createdAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      status: 'completed',
    },
  });

  // 本月出库笔数
  const outRate = await Transaction.count({
    where: {
      type: 'out',
      createdAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      status: 'completed',
    },
  });

  // 计算增长率（模拟数据）
  const productGrowth = 8.2;
  const inventoryGrowth = 12.5;

  res.json({
    productCount,
    productGrowth,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    inventoryGrowth,
    todayIn: todayIn[0]?.total || 0,
    inRate,
    todayOut: todayOut[0]?.total || 0,
    outRate,
  });
}));

// 获取低库存预警
router.get('/low-stock', auth, asyncHandler(async (req, res) => {
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
        id: product.id,
        name: product.name,
        sku: product.sku,
        minStock: product.minStock,
        quantity: totalStock,
      });
    }
  }

  // 只返回前10条预警
  res.json({ products: lowStockItems.slice(0, 10) });
}));

// 获取最近交易记录
router.get('/recent-transactions', auth, asyncHandler(async (req, res) => {
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
      id: tObj._id,
      transactionNo: tObj.transactionNo,
      productName: tObj.product?.name || '未知商品',
      type: tObj.type,
      quantity: tObj.quantity,
      time: dayjs(tObj.createdAt).format('HH:mm'),
    };
  });

  res.json({ transactions: formatted });
}));

// 获取近7天出入库趋势
router.get('/trend', auth, asyncHandler(async (req, res) => {
  const trendData = [];
  const today = dayjs();

  for (let i = 6; i >= 0; i--) {
    const date = today.subtract(i, 'day');
    const start = date.startOf('day').toDate();
    const end = date.endOf('day').toDate();

    // 当日入库
    const inData = await Transaction.findAll({
      where: {
        type: 'in',
        createdAt: { [Op.gte]: start, [Op.lte]: end },
        status: 'completed',
      },
      attributes: [[fn('SUM', col('quantity')), 'total']],
      raw: true,
    });

    // 当日出库
    const outData = await Transaction.findAll({
      where: {
        type: 'out',
        createdAt: { [Op.gte]: start, [Op.lte]: end },
        status: 'completed',
      },
      attributes: [[fn('SUM', col('quantity')), 'total']],
      raw: true,
    });

    trendData.push({
      date: date.format('MM-DD'),
      in: inData[0]?.total || 0,
      out: outData[0]?.total || 0,
    });
  }

  res.json({ trend: trendData });
}));

// 获取分类占比
router.get('/category-stats', auth, asyncHandler(async (req, res) => {
  const { Category } = require('../models');

  const stats = await Product.findAll({
    where: { status: true },
    attributes: [
      'categoryId',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['categoryId'],
    raw: true,
  });

  const categoryIds = stats.map(s => s.categoryId).filter(Boolean);
  const categories = await Category.findAll({
    where: { id: { [Op.in]: categoryIds } },
    attributes: ['id', 'name'],
    raw: true,
  });

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const formatted = stats.map(s => ({
    name: categoryMap.get(s.categoryId) || '未分类',
    count: s.count,
  }));

  res.json({ stats: formatted });
}));

// 获取每个商品最近3笔出库记录
router.get('/recent-outbound', auth, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  // Get top products by total outbound quantity
  const topProducts = await Transaction.findAll({
    where: { type: 'out', status: 'completed' },
    attributes: [
      'productId',
      [fn('SUM', col('quantity')), 'totalOutbound'],
    ],
    group: ['productId'],
    order: [[fn('SUM', col('quantity')), 'DESC']],
    limit,
    raw: true,
  });

  const products = [];

  for (const item of topProducts) {
    const product = await Product.findByPk(item.productId, {
      attributes: ['id', 'name', 'sku'],
    });

    if (!product) continue;

    // Get recent 3 outbound transactions for this product
    const recentTransactions = await Transaction.findAll({
      where: { productId: item.productId, type: 'out', status: 'completed' },
      order: [['createdAt', 'DESC']],
      limit: 3,
      attributes: ['quantity', 'consumptionUnit', 'consumptionDate', 'createdAt'],
      raw: true,
    });

    const recentOutbound = recentTransactions.map(t => ({
      quantity: t.quantity,
      consumptionUnit: t.consumptionUnit || '',
      date: t.consumptionDate
        ? dayjs(t.consumptionDate).format('YYYY-MM-DD')
        : dayjs(t.createdAt).format('YYYY-MM-DD'),
    }));

    products.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      totalOutbound: item.totalOutbound,
      recentOutbound,
    });
  }

  res.json({ products });
}));

module.exports = router;
