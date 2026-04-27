const express = require('express');
const { Warehouse, Inventory, Transaction, User, sequelize, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const logger = require('../utils/logger');

const router = express.Router();
const { Op } = Sequelize;

router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    keyword,
    status,
    name,
    code,
    manager
  } = req.query;

  const where = {};

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { code: { [Op.like]: `%${keyword}%` } },
      { location: { [Op.like]: `%${keyword}%` } },
    ];
  } else {
    if (name) {
      where.name = { [Op.like]: `%${name}%` };
    }
    if (code) {
      where.code = { [Op.like]: `%${code}%` };
    }
  }

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: warehouses } = await Warehouse.findAndCountAll({
    where,
    include: [
      { model: User, as: 'managerUser', attributes: ['realName', 'phone'], required: false },
      { model: User, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
    order: [['sort', 'ASC'], ['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  const formattedWarehouses = warehouses.map(warehouse => {
    const w = warehouse.toJSON();
    w.manager = w.managerUser || '';
    return w;
  });

  res.json({
    warehouses: formattedWarehouses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/options/list', auth, asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'location'],
    order: [['sort', 'ASC'], ['name', 'ASC']],
    raw: true,
  });

  const formattedWarehouses = warehouses.map(w => ({
    ...w,
    id: w.id,
  }));

  res.json({ warehouses: formattedWarehouses });
}));

router.get('/options', auth, asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'code', 'location'],
    order: [['sort', 'ASC'], ['name', 'ASC']],
    raw: true,
  });

  const formattedWarehouses = warehouses.map(w => ({
    ...w,
    id: w.id,
  }));

  res.json({ warehouses: formattedWarehouses });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findByPk(req.params.id, {
    include: [
      { model: User, as: 'managerUser', attributes: ['realName', 'phone', 'email'], required: false },
      { model: User, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
  });

  if (!warehouse) {
    throw new NotFoundError('仓库不存在');
  }

  const inventoryStats = await Inventory.findAll({
    where: { warehouseId: warehouse.id },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
    ],
    raw: true,
  });

  const formattedWarehouse = warehouse.toJSON();

  res.json({
    warehouse: formattedWarehouse,
    stats: inventoryStats[0] || { totalProducts: 0, totalQuantity: 0 },
  });
}));

router.post('/', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { name, code, location, address, manager, phone, description, remark, sort, status } = req.body;

  const mappedLocation = location || address;
  const mappedDescription = description || remark;

  const existingWarehouse = await Warehouse.findOne({ where: { code } });
  if (existingWarehouse) {
    throw new BadRequestError('仓库编码已存在');
  }

  const warehouse = await Warehouse.create({
    name,
    code,
    location: mappedLocation,
    manager,
    phone,
    description: mappedDescription,
    sort: sort || 0,
    status: status !== undefined ? status : true,
    createdBy: req.user.id,
  });

  await warehouse.reload({
    include: [
      { model: User, as: 'managerUser', attributes: ['realName'], required: false },
    ],
  });

  res.status(201).json({
    message: '仓库创建成功',
    warehouse,
  });
}));

router.put('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findByPk(req.params.id);
  if (!warehouse) {
    throw new NotFoundError('仓库不存在');
  }

  const { name, code, location, address, manager, phone, description, remark, sort, status } = req.body;

  const mappedLocation = location !== undefined ? location : (address !== undefined ? address : warehouse.location);
  const mappedDescription = description !== undefined ? description : (remark !== undefined ? remark : warehouse.description);

  if (code && code !== warehouse.code) {
    const existingWarehouse = await Warehouse.findOne({ where: { code } });
    if (existingWarehouse) {
      throw new BadRequestError('仓库编码已存在');
    }
  }

  if (name !== undefined) warehouse.name = name;
  if (code !== undefined) warehouse.code = code;
  if (mappedLocation !== undefined) warehouse.location = mappedLocation;
  if (manager !== undefined) warehouse.manager = manager;
  if (phone !== undefined) warehouse.phone = phone;
  if (mappedDescription !== undefined) warehouse.description = mappedDescription;
  if (sort !== undefined) warehouse.sort = sort;
  if (status !== undefined) warehouse.status = status;

  await warehouse.save();
  
  await warehouse.reload({
    include: [
      { model: User, as: 'managerUser', attributes: ['realName'], required: false },
    ],
  });

  res.json({
    message: '仓库更新成功',
    warehouse,
  });
}));

router.delete('/:id', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findByPk(req.params.id);
  if (!warehouse) {
    throw new NotFoundError('仓库不存在');
  }

  const inventoryCount = await Inventory.count({ where: { warehouseId: req.params.id } });
  if (inventoryCount > 0) {
    throw new ConflictError('该仓库还有库存，不能删除');
  }

  const transactionCount = await Transaction.count({ where: { warehouseId: req.params.id } });
  if (transactionCount > 0) {
    throw new ConflictError('该仓库有关联的事务记录，不能删除');
  }

  await warehouse.destroy();
  res.json({ message: '仓库删除成功' });
}));

module.exports = router;
