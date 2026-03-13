const express = require('express');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取仓库列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword, 
      status 
    } = req.query;
    
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { code: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (status !== undefined) {
      query.status = status === 'true';
    }

    const warehouses = await Warehouse.find(query)
      .populate('manager', 'realName phone')
      .populate('createdBy', 'realName')
      .sort({ sort: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Warehouse.countDocuments(query);

    res.json({
      warehouses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取仓库列表失败', error: error.message });
  }
});

// 获取仓库下拉列表
router.get('/options/list', auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ status: true })
      .select('name code location')
      .sort({ sort: 1, name: 1 });

    res.json({ warehouses });
  } catch (error) {
    res.status(500).json({ message: '获取仓库列表失败', error: error.message });
  }
});

// 获取单个仓库详情
router.get('/:id', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('manager', 'realName phone email')
      .populate('createdBy', 'realName');

    if (!warehouse) {
      return res.status(404).json({ message: '仓库不存在' });
    }

    // 获取该仓库的库存统计
    const inventoryStats = await Inventory.aggregate([
      { $match: { warehouse: warehouse._id } },
      { $group: { 
          _id: null, 
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    res.json({ 
      warehouse,
      stats: inventoryStats[0] || { totalProducts: 0, totalQuantity: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: '获取仓库详情失败', error: error.message });
  }
});

// 创建仓库
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, code, location, manager, phone, description, sort } = req.body;

    // 检查编码是否已存在
    const existingWarehouse = await Warehouse.findOne({ code });
    if (existingWarehouse) {
      return res.status(400).json({ message: '仓库编码已存在' });
    }

    const warehouse = new Warehouse({
      name,
      code,
      location,
      manager,
      phone,
      description,
      sort: sort || 0,
      createdBy: req.user._id,
    });

    await warehouse.save();
    await warehouse.populate('manager', 'realName');

    res.status(201).json({
      message: '仓库创建成功',
      warehouse,
    });
  } catch (error) {
    res.status(500).json({ message: '创建仓库失败', error: error.message });
  }
});

// 更新仓库
router.put('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: '仓库不存在' });
    }

    const { name, code, location, manager, phone, description, sort, status } = req.body;

    // 检查编码是否被其他仓库使用
    if (code && code !== warehouse.code) {
      const existingWarehouse = await Warehouse.findOne({ code });
      if (existingWarehouse) {
        return res.status(400).json({ message: '仓库编码已存在' });
      }
    }

    if (name !== undefined) warehouse.name = name;
    if (code !== undefined) warehouse.code = code;
    if (location !== undefined) warehouse.location = location;
    if (manager !== undefined) warehouse.manager = manager;
    if (phone !== undefined) warehouse.phone = phone;
    if (description !== undefined) warehouse.description = description;
    if (sort !== undefined) warehouse.sort = sort;
    if (status !== undefined) warehouse.status = status;

    await warehouse.save();
    await warehouse.populate('manager', 'realName');

    res.json({
      message: '仓库更新成功',
      warehouse,
    });
  } catch (error) {
    res.status(500).json({ message: '更新仓库失败', error: error.message });
  }
});

// 删除仓库
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: '仓库不存在' });
    }

    // 检查是否有库存
    const inventoryCount = await Inventory.countDocuments({ warehouse: req.params.id });
    if (inventoryCount > 0) {
      return res.status(400).json({ message: '该仓库还有库存，不能删除' });
    }

    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: '仓库删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除仓库失败', error: error.message });
  }
});

module.exports = router;
