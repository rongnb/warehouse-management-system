const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const dayjs = require('dayjs');
const logger = require('../utils/logger');

const router = express.Router();

// 获取仪表盘统计数据
router.get('/stats', auth, async (req, res) => {
  try {
    // 商品总数
    const productCount = await Product.countDocuments({ status: true });
    
    // 库存总价值
    const inventory = await Inventory.find().populate('product', 'costPrice');
    const inventoryValue = inventory.reduce((total, item) => {
      return total + (item.quantity * (item.product?.costPrice || 0));
    }, 0);

    // 今日入库
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    
    const todayIn = await Transaction.aggregate([
      { $match: { 
          type: 'in', 
          createdAt: { $gte: todayStart, $lte: todayEnd },
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // 今日出库
    const todayOut = await Transaction.aggregate([
      { $match: { 
          type: 'out', 
          createdAt: { $gte: todayStart, $lte: todayEnd },
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // 本月入库笔数
    const monthStart = dayjs().startOf('month').toDate();
    const monthEnd = dayjs().endOf('month').toDate();
    
    const inRate = await Transaction.countDocuments({
      type: 'in',
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: 'completed'
    });

    // 本月出库笔数
    const outRate = await Transaction.countDocuments({
      type: 'out',
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: 'completed'
    });

    // 计算增长率（模拟数据，实际项目可以计算环比/同比）
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
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
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
          id: product._id,
          name: product.name,
          sku: product.sku,
          minStock: product.minStock,
          quantity: totalStock,
        });
      }
    }

    // 只返回前10条预警
    res.json({ products: lowStockItems.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ message: '获取低库存预警失败', error: error.message });
  }
});

// 获取最近交易记录
router.get('/recent-transactions', auth, async (req, res) => {
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
      time: dayjs(t.createdAt).format('HH:mm'),
    }));

    res.json({ transactions: formatted });
  } catch (error) {
    res.status(500).json({ message: '获取最近交易失败', error: error.message });
  }
});

// 获取近7天出入库趋势
router.get('/trend', auth, async (req, res) => {
  try {
    const trendData = [];
    const today = dayjs();

    for (let i = 6; i >= 0; i--) {
      const date = today.subtract(i, 'day');
      const start = date.startOf('day').toDate();
      const end = date.endOf('day').toDate();

      // 当日入库
      const inData = await Transaction.aggregate([
        { $match: { 
            type: 'in', 
            createdAt: { $gte: start, $lte: end },
            status: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);

      // 当日出库
      const outData = await Transaction.aggregate([
        { $match: { 
            type: 'out', 
            createdAt: { $gte: start, $lte: end },
            status: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);

      trendData.push({
        date: date.format('MM-dd'),
        in: inData[0]?.total || 0,
        out: outData[0]?.total || 0,
      });
    }

    res.json({ trend: trendData });
  } catch (error) {
    res.status(500).json({ message: '获取趋势数据失败', error: error.message });
  }
});

// 获取分类占比
router.get('/category-stats', auth, async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { status: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      { $project: {
          name: '$categoryInfo.name',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: '获取分类统计失败', error: error.message });
  }
});

// 获取每个商品最近3笔出库记录（包含领用单位信息）
router.get('/recent-outbound', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // 使用aggregate获取每个商品的出库记录，然后取最近3笔
    const result = await Transaction.aggregate([
      // 只匹配出库且已完成的
      { $match: { type: 'out', status: 'completed' } },
      // 按商品分组
      { $group: {
        _id: '$product',
        totalOutbound: { $sum: '$quantity' },
        allOutbound: { $push: {
          quantity: '$quantity',
          consumptionUnit: '$consumptionUnit',
          consumptionDate: '$consumptionDate',
          createdAt: '$createdAt',
        } },
      } },
      // 按总出库数量降序排序
      { $sort: { totalOutbound: -1 } },
      // 只返回前N个商品
      { $limit: limit },
      // 关联商品信息
      { $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo',
      } },
      { $unwind: '$productInfo' },
    ]);

    // 格式化数据，只取每个商品最近3笔出库记录
    const formatted = result.map(item => {
      // 按创建时间降序排序，取最近3笔
      const sortedOutbound = item.allOutbound.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 3);

      // 格式化日期
      const recentOutbound = sortedOutbound.map((o) => ({
        quantity: o.quantity,
        consumptionUnit: o.consumptionUnit,
        date: o.consumptionDate
          ? dayjs(o.consumptionDate).format('YYYY-MM-DD')
          : dayjs(o.createdAt).format('YYYY-MM-DD'),
      }));

      return {
        productId: item._id,
        productName: item.productInfo.name,
        sku: item.productInfo.sku,
        totalOutbound: item.totalOutbound,
        recentOutbound,
      };
    });

    res.json({ products: formatted });
  } catch (error) {
    res.status(500).json({ message: '获取最近出库记录失败', error: error.message });
  }
});

module.exports = router;
