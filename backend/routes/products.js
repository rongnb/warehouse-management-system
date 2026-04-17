const express = require('express');
const { Product, Inventory, Category, Supplier, Transaction, User, sequelize, Sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const logger = require('../utils/logger');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const { Op } = Sequelize;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `import-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /(\.xlsx|\.xls)$/i;
    if (allowedTypes.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .xlsx 和 .xls 格式的文件'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get('/options/list', auth, asyncHandler(async (req, res) => {
  const products = await Product.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'sku', 'unit', 'price'],
    order: [['name', 'ASC']],
    raw: true,
  });

  const formattedProducts = products.map(p => ({
    ...p,
    id: p.id,
  }));

  res.json({ products: formattedProducts });
}));

router.get('/options', auth, asyncHandler(async (req, res) => {
  const products = await Product.findAll({
    where: { status: true },
    attributes: ['id', 'name', 'sku', 'unit', 'price'],
    order: [['name', 'ASC']],
    raw: true,
  });

  const formattedProducts = products.map(p => ({
    ...p,
    id: p.id,
  }));

  res.json({ products: formattedProducts });
}));

router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    keyword,
    category,
    supplier,
    status
  } = req.query;

  const where = {};

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { sku: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  if (supplier) {
    where.supplierId = supplier;
  }

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const offset = (page - 1) * limit;
  const { count: total, rows: products } = await Product.findAndCountAll({
    where,
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
      { model: User, as: 'createdByUser', attributes: ['realName'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  const productIds = products.map(p => p.id);
  const inventoryResults = await Inventory.findAll({
    where: { productId: { [Op.in]: productIds } },
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
    ],
    group: ['productId'],
    raw: true,
  });

  const inventoryMap = new Map();
  inventoryResults.forEach(item => {
    inventoryMap.set(item.productId, item.totalQuantity || 0);
  });

  const formattedProducts = products.map(p => {
    const productObj = p.toJSON();
    productObj.id = productObj._id;
    productObj.categoryName = productObj.category?.name || '';
    productObj.supplierName = productObj.supplier?.name || '';
    productObj.createdByName = productObj.createdByUser?.realName || '';
    productObj.stock = inventoryMap.get(p.id) || 0;
    return productObj;
  });

  res.json({
    products: formattedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [
      { model: Category, as: 'category', attributes: ['name'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['name'], required: false },
    ],
  });

  if (!product) {
    throw new NotFoundError('商品不存在');
  }

  const productObj = product.toJSON();
  productObj.id = productObj._id;

  const inventory = await Inventory.findAll({
    where: { productId: productObj.id },
    attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']],
    raw: true,
  });

  productObj.stock = inventory.length > 0 && inventory[0].totalQuantity ? inventory[0].totalQuantity : 0;

  res.json({ product: productObj });
}));

router.post('/', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  logger.info('开始创建商品', {
    userId: req.user.id,
    requestBody: req.body
  });

  const {
    name,
    sku,
    category,
    supplier,
    description,
    specification,
    modelName,
    manufacturer,
    unit,
    price,
    costPrice,
    minStock,
    maxStock,
    status,
    remark
  } = req.body;

  let finalSku = sku;
  if (!finalSku || finalSku.trim() === '') {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    finalSku = `PROD${timestamp}${random}`;
    logger.info('自动生成SKU', { finalSku });
  }

  logger.info('检查SKU是否已存在', { sku: finalSku });
  const existingProduct = await Product.findOne({ where: { sku: finalSku } });
  if (existingProduct) {
    logger.warn('SKU已存在', { sku: finalSku });
    throw new BadRequestError('商品SKU已存在');
  }

  let finalCategory = category;
  if (!finalCategory || finalCategory.trim() === '') {
    let defaultCategory = await Category.findOne();
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: '默认分类',
        code: 'DEFAULT',
        description: '系统默认分类',
      });
      logger.info('创建默认分类', { categoryId: defaultCategory.id });
    }
    finalCategory = defaultCategory.id;
  }

  let finalSupplier = supplier;
  if (!finalSupplier || finalSupplier.trim() === '') {
    let defaultSupplier = await Supplier.findOne();
    if (!defaultSupplier) {
      defaultSupplier = await Supplier.create({
        name: '默认供应商',
        code: 'DEFAULT',
        contact: '系统默认',
        phone: '13800138000',
        level: 'B',
      });
      logger.info('创建默认供应商', { supplierId: defaultSupplier.id });
    }
    finalSupplier = defaultSupplier.id;
  }

  const product = await Product.create({
    name,
    sku: finalSku,
    categoryId: finalCategory,
    supplierId: finalSupplier,
    description,
    specification,
    modelName,
    manufacturer,
    unit,
    price,
    costPrice,
    minStock,
    maxStock,
    status: status !== undefined ? status : true,
    remark,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  logger.info('准备重新加载商品关联', { productName: name });
  await product.reload({
    include: [
      { model: Category, as: 'category', attributes: ['name'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['name'], required: false },
    ],
  });
  logger.info('商品创建成功', { productId: product.id, productName: name });

  res.status(201).json({
    message: '商品创建成功',
    id: product.id,
    product,
  });
}));

router.put('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  logger.info('开始更新商品', {
    productId: req.params.id,
    userId: req.user.id,
    requestBody: req.body
  });

  const product = await Product.findByPk(req.params.id);
  if (!product) {
    logger.warn('商品不存在', { productId: req.params.id });
    throw new NotFoundError('商品不存在');
  }

  const {
    name,
    sku,
    category,
    supplier,
    description,
    specification,
    unit,
    price,
    costPrice,
    minStock,
    maxStock,
    status,
    remark
  } = req.body;

  if (sku && sku !== product.sku) {
    logger.info('检查SKU是否重复', { newSku: sku, oldSku: product.sku });
    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      logger.warn('SKU已存在', { sku });
      throw new BadRequestError('商品SKU已存在');
    }
  }

  if (name !== undefined) product.name = name;
  if (sku !== undefined) product.sku = sku;
  if (category !== undefined) product.categoryId = category;
  if (supplier !== undefined) product.supplierId = supplier;
  if (description !== undefined) product.description = description;
  if (specification !== undefined) product.specification = specification;
  if (unit !== undefined) product.unit = unit;
  if (price !== undefined) product.price = price;
  if (costPrice !== undefined) product.costPrice = costPrice;
  if (minStock !== undefined) product.minStock = minStock;
  if (maxStock !== undefined) product.maxStock = maxStock;
  if (status !== undefined) product.status = status;
  if (remark !== undefined) product.remark = remark;

  product.updatedBy = req.user.id;

  logger.info('准备保存商品', { productId: req.params.id });
  await product.save();
  
  await product.reload({
    include: [
      { model: Category, as: 'category', attributes: ['name'], required: false },
      { model: Supplier, as: 'supplier', attributes: ['name'], required: false },
    ],
  });
  logger.info('商品更新成功', { productId: req.params.id, productName: product.name });

  res.json({
    message: '商品更新成功',
    product,
  });
}));

router.delete('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    logger.warn('商品不存在', { productId: req.params.id });
    throw new NotFoundError('商品不存在');
  }

  const inventory = await Inventory.findOne({ 
    where: { 
      productId: req.params.id,
      quantity: { [Op.gt]: 0 }
    }
  });
  if (inventory) {
    logger.warn('商品还有库存，不能删除', { productId: req.params.id, quantity: inventory.quantity });
    throw new ConflictError('商品还有库存，不能删除');
  }

  const transactionCount = await Transaction.count({ where: { productId: req.params.id } });
  if (transactionCount > 0) {
    logger.warn('商品有关联的事务记录，不能删除', { productId: req.params.id });
    throw new ConflictError('商品有关联的事务记录，不能删除');
  }

  await product.destroy();
  logger.info('商品删除成功', { productId: req.params.id, productName: product.name });
  res.json({ message: '商品删除成功' });
}));

const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      let errorMsg = '文件上传失败';
      if (err) {
        if (typeof err === 'string') {
          errorMsg = err;
        } else if (err.message) {
          errorMsg = err.message;
        }
      }
      logger.error('文件上传失败: %s', errorMsg);
      return res.status(400).json({ message: errorMsg });
    }
    next();
  });
};

router.post('/import', auth, requireRole(['admin', 'manager']), uploadMiddleware, asyncHandler(async (req, res) => {
  let filePath = null;
  
  try {
    logger.info('开始Excel导入', {
      userId: req.user.id,
      mode: req.body.mode,
    });

    if (!req.file) {
      throw new BadRequestError('请上传Excel文件');
    }

    filePath = req.file.path;
    // 防御 path-injection：确认 filePath 仍在 uploads 目录内
    const uploadsRoot = path.resolve(__dirname, '../uploads');
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsRoot + path.sep)) {
      throw new BadRequestError('非法的上传文件路径');
    }
    filePath = resolved;
    const mode = req.body.mode || 'create';
    const warehouseId = req.body.warehouseId;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const firstSheet = workbook.worksheets[0];

    if (!firstSheet || firstSheet.rowCount <= 1) {
      throw new BadRequestError('Excel文件中没有数据');
    }

    const headers = [];
    firstSheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? String(cell.value).trim() : '';
    });
    
    const jsonData = [];
    for (let rowNumber = 2; rowNumber <= firstSheet.rowCount; rowNumber++) {
      const row = firstSheet.getRow(rowNumber);
      const rowData = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            hasValue = true;
          }
        }
      });
      if (hasValue) {
        jsonData.push(rowData);
      }
    }

    if (jsonData.length === 0) {
      throw new BadRequestError('Excel文件中没有数据');
    }

    logger.info('Excel数据读取成功', { count: jsonData.length });

    const results = [];
    const errors = [];

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < jsonData.length; i++) {
        const item = jsonData[i];
        const rowNum = i + 1;

        try {
          if (!item['产品名称']) {
            throw new Error('产品名称不能为空');
          }
          if (!item['规格']) {
            throw new Error('规格不能为空');
          }
          if (!item['厂家']) {
            throw new Error('厂家不能为空');
          }
          if (!item['单位']) {
            throw new Error('单位不能为空');
          }

          let category = await Category.findOne({ transaction: t });
          if (!category) {
            category = await Category.create({
              name: '默认分类',
              code: 'DEFAULT',
              description: '系统默认分类',
            }, { transaction: t });
          }

          let supplier = await Supplier.findOne({ 
            where: { name: item['厂家'] },
            transaction: t 
          });
          if (!supplier) {
            supplier = await Supplier.create({
              name: item['厂家'],
              code: `SUP${Date.now() + i}`,
              contact: '系统导入',
              phone: '13800138000',
              level: 'B',
            }, { transaction: t });
          }

          let sku = item['SKU'];
          if (!sku || sku.trim() === '') {
            const timestamp = Date.now().toString().slice(-8);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            sku = `PROD${timestamp}${random}`;
          }

          const existingProduct = await Product.findOne({ 
            where: { sku },
            transaction: t 
          });
          if (existingProduct) {
            throw new Error(`SKU ${sku} 已存在`);
          }

          const product = await Product.create({
            name: item['产品名称'],
            sku,
            categoryId: category.id,
            supplierId: supplier.id,
            specification: item['规格'],
            modelName: item['产品型号'] || '',
            manufacturer: item['厂家'],
            unit: item['单位'],
            price: parseFloat(item['售价']) || 0,
            costPrice: parseFloat(item['成本价']) || 0,
            minStock: parseInt(item['库存下限']) || 0,
            maxStock: parseInt(item['库存上限']) || 99999,
            description: item['用途'] || '',
            remark: item['备注'] || '',
            createdBy: req.user.id,
            updatedBy: req.user.id,
          }, { transaction: t });

          if (mode === 'inventory' && warehouseId) {
            const quantity = parseInt(item['入库数量']) || 1;

            const transaction = await Transaction.create({
              transactionNo: `TR${Date.now() + i}`,
              type: 'in',
              productId: product.id,
              warehouseId,
              quantity,
              price: product.costPrice,
              operator: req.user.id,
              createdBy: req.user.id,
              status: 'completed',
            }, { transaction: t });

            let inventory = await Inventory.findOne({
              where: {
                productId: product.id,
                warehouseId,
              },
              transaction: t,
            });

            if (inventory) {
              inventory.quantity += quantity;
              inventory.updatedBy = req.user.id;
              inventory.lastUpdated = new Date();
              await inventory.save({ transaction: t });
            } else {
              inventory = await Inventory.create({
                productId: product.id,
                warehouseId,
                quantity,
                updatedBy: req.user.id,
              }, { transaction: t });
            }
          }

          results.push({ row: rowNum, success: true, product: product.name });
        } catch (error) {
          errors.push({ row: rowNum, success: false, error: error.message });
        }
      }
    });

    res.json({
      message: `导入完成，成功 ${results.length} 条，失败 ${errors.length} 条`,
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    });
  } catch (error) {
    logger.error('Excel导入失败', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}));

module.exports = router;
