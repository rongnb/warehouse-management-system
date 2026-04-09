const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const { auth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const router = express.Router();

// 配置multer处理文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    const fs = require('fs');
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
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
});

// 获取商品下拉列表
router.get('/options/list', auth, async (req, res) => {
  try {
    const products = await Product.find({ status: true })
      .select('name sku unit price')
      .sort({ name: 1 });

    // 统一数据格式，添加id字段
    const formattedProducts = products.map(p => ({
      ...p.toObject(),
      id: p._id,
    }));

    res.json({ products: formattedProducts });
  } catch (error) {
    logger.error('获取商品列表失败:', error);
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
});

// 获取商品下拉列表（别名，兼容前端调用）
router.get('/options', auth, async (req, res) => {
  try {
    const products = await Product.find({ status: true })
      .select('name sku unit price')
      .sort({ name: 1 });

    // 统一数据格式，添加id字段
    const formattedProducts = products.map(p => ({
      ...p.toObject(),
      id: p._id,
    }));

    res.json({ products: formattedProducts });
  } catch (error) {
    logger.error('获取商品列表失败:', error);
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
});

// 获取商品列表
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      keyword,
      category,
      supplier,
      status
    } = req.query;

    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (status !== undefined) {
      query.status = status === 'true';
    }

    // 获取商品列表
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'realName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    // 获取所有商品ID，批量查询库存
    const productIds = products.map(p => p._id);
    const inventoryResults = await Inventory.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: '$product', totalQuantity: { $sum: '$quantity' } } }
    ]);

    // 将库存结果转为Map，方便查找
    const inventoryMap = new Map();
    inventoryResults.forEach(item => {
      inventoryMap.set(item._id.toString(), item.totalQuantity);
    });

    // 统一数据格式，添加id字段和库存
    const formattedProducts = products.map(p => {
      const productObj = p.toObject();
      productObj.id = productObj._id;
      // 处理关联字段的显示
      productObj.categoryName = productObj.category?.name || '';
      productObj.supplierName = productObj.supplier?.name || '';
      productObj.createdByName = productObj.createdBy?.realName || '';

      // 从Map中获取库存
      productObj.stock = inventoryMap.get(p._id.toString()) || 0;

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
  } catch (error) {
    logger.error('获取商品列表失败:', error);
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
});

// 获取单个商品详情
router.get('/:id', auth, async (req, res) => {
  try {
    // 检查是否是有效的ObjectId格式
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      logger.warn('无效的商品ID格式', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('supplier', 'name');

    if (!product) {
      logger.warn('商品不存在', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
    }

    const productObj = product.toObject();
    productObj.id = productObj._id;

    // 计算总库存
    const inventory = await Inventory.aggregate([
      { $match: { product: productObj._id } },
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ]);

    productObj.stock = inventory.length > 0 ? inventory[0].totalQuantity : 0;

    res.json({ product: productObj });
  } catch (error) {
    logger.error('获取商品详情失败:', error);
    res.status(500).json({ message: '获取商品详情失败', error: error.message });
  }
});

// 创建商品
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    logger.info('开始创建商品', {
      userId: req.user._id,
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

    // 自动生成SKU（如果未提供）
    let finalSku = sku;
    if (!finalSku || finalSku.trim() === '') {
      // 生成基于时间戳的SKU
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      finalSku = `PROD${timestamp}${random}`;
      logger.info('自动生成SKU', { finalSku });
    }

    // 检查SKU是否已存在
    logger.info('检查SKU是否已存在', { sku: finalSku });
    const existingProduct = await Product.findOne({ sku: finalSku });
    if (existingProduct) {
      logger.warn('SKU已存在', { sku: finalSku });
      return res.status(400).json({ message: '商品SKU已存在' });
    }

    // 查找或创建默认分类
    let finalCategory = category;
    if (!finalCategory || finalCategory.trim() === '') {
      let defaultCategory = await Category.findOne();
      if (!defaultCategory) {
        defaultCategory = new Category({
          name: '默认分类',
          code: 'DEFAULT',
          description: '系统默认分类',
        });
        await defaultCategory.save();
        logger.info('创建默认分类', { categoryId: defaultCategory._id });
      }
      finalCategory = defaultCategory._id;
    }

    // 查找或创建默认供应商
    let finalSupplier = supplier;
    if (!finalSupplier || finalSupplier.trim() === '') {
      let defaultSupplier = await Supplier.findOne();
      if (!defaultSupplier) {
        defaultSupplier = new Supplier({
          name: '默认供应商',
          code: 'DEFAULT',
          contact: '系统默认',
          phone: '13800138000',
          level: 'B',
        });
        await defaultSupplier.save();
        logger.info('创建默认供应商', { supplierId: defaultSupplier._id });
      }
      finalSupplier = defaultSupplier._id;
    }

    const product = new Product({
      name,
      sku: finalSku,
      category: finalCategory,
      supplier: finalSupplier,
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
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    logger.info('准备保存新商品', { productName: name });
    await product.save();
    await product.populate('category supplier', 'name');
    logger.info('商品创建成功', { productId: product._id, productName: name });

    res.status(201).json({
      message: '商品创建成功',
      id: product._id,
      product,
    });
  } catch (error) {
    logger.error('创建商品失败', {
      userId: req.user._id,
      requestBody: req.body,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: '创建商品失败', error: error.message });
  }
});

// 更新商品
router.put('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    logger.info('开始更新商品', {
      productId: req.params.id,
      userId: req.user._id,
      requestBody: req.body
    });

    // 检查是否是有效的ObjectId格式
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      logger.warn('无效的商品ID格式', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      logger.warn('商品不存在', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
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

    // 检查SKU是否被其他商品使用
    if (sku && sku !== product.sku) {
      logger.info('检查SKU是否重复', { newSku: sku, oldSku: product.sku });
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        logger.warn('SKU已存在', { sku });
        return res.status(400).json({ message: '商品SKU已存在' });
      }
    }

    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku;
    if (category !== undefined) product.category = category;
    if (supplier !== undefined) product.supplier = supplier;
    if (description !== undefined) product.description = description;
    if (specification !== undefined) product.specification = specification;
    if (unit !== undefined) product.unit = unit;
    if (price !== undefined) product.price = price;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (minStock !== undefined) product.minStock = minStock;
    if (maxStock !== undefined) product.maxStock = maxStock;
    if (status !== undefined) product.status = status;
    if (remark !== undefined) product.remark = remark;

    product.updatedBy = req.user._id;

    logger.info('准备保存商品', { productId: req.params.id });
    await product.save();
    await product.populate('category supplier', 'name');
    logger.info('商品更新成功', { productId: req.params.id, productName: product.name });

    res.json({
      message: '商品更新成功',
      product,
    });
  } catch (error) {
    logger.error('更新商品失败', {
      productId: req.params.id,
      userId: req.user._id,
      requestBody: req.body,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: '更新商品失败', error: error.message });
  }
});

// 删除商品
router.delete('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    // 检查是否是有效的ObjectId格式
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      logger.warn('无效的商品ID格式', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      logger.warn('商品不存在', { productId: req.params.id });
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否有库存
    const inventory = await Inventory.findOne({ product: req.params.id, quantity: { $gt: 0 } });
    if (inventory) {
      logger.warn('商品还有库存，不能删除', { productId: req.params.id, quantity: inventory.quantity });
      return res.status(400).json({ message: '商品还有库存，不能删除' });
    }

    await Product.findByIdAndDelete(req.params.id);
    logger.info('商品删除成功', { productId: req.params.id, productName: product.name });
    res.json({ message: '商品删除成功' });
  } catch (error) {
    logger.error('删除商品失败', {
      productId: req.params.id,
      userId: req.user._id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: '删除商品失败', error: error.message });
  }
});

// Excel导入 - 带错误处理的中间件
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

router.post('/import', auth, requireRole(['admin', 'manager']), uploadMiddleware, async (req, res) => {
  try {
    logger.info('开始Excel导入', {
      userId: req.user._id,
      mode: req.body.mode,
    });

    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }

    const mode = req.body.mode || 'create'; // 'create' 或 'inventory'
    const warehouseId = req.body.warehouseId;

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Excel文件中没有数据' });
    }

    logger.info('Excel数据读取成功', { count: jsonData.length });

    const results = [];
    const errors = [];

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

        // 查找或创建分类（默认使用第一个分类）
        let category = await Category.findOne();
        if (!category) {
          category = new Category({
            name: '默认分类',
            code: 'DEFAULT',
            description: '系统默认分类',
          });
          await category.save();
        }

        // 查找或创建供应商
        let supplier = await Supplier.findOne({ name: item['厂家'] });
        if (!supplier) {
          supplier = new Supplier({
            name: item['厂家'],
            code: `SUP${Date.now() + i}`,
            contact: '系统导入',
            phone: '13800138000',
            level: 'B',
          });
          await supplier.save();
        }

        // 生成或使用SKU
        let sku = item['SKU'];
        if (!sku || sku.trim() === '') {
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          sku = `PROD${timestamp}${random}`;
        }

        // 检查SKU是否已存在
        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
          throw new Error(`SKU ${sku} 已存在`);
        }

        const product = new Product({
          name: item['产品名称'],
          sku,
          category: category._id,
          supplier: supplier._id,
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
          createdBy: req.user._id,
          updatedBy: req.user._id,
        });

        await product.save();

        // 如果是自动入库模式
        if (mode === 'inventory' && warehouseId) {
          const quantity = parseInt(item['入库数量']) || 1;

          // 创建入库单
          const transaction = new Transaction({
            transactionNo: `TR${Date.now() + i}`,
            type: 'in',
            product: product._id,
            warehouse: warehouseId,
            quantity,
            price: product.costPrice,
            operator: req.user._id,
            createdBy: req.user._id,
            status: 'completed',
          });

          await transaction.save();

          // 更新或创建库存记录
          let inventory = await Inventory.findOne({
            product: product._id,
            warehouse: warehouseId,
          });

          if (inventory) {
            inventory.quantity += quantity;
            inventory.updatedBy = req.user._id;
            inventory.lastUpdated = new Date();
          } else {
            inventory = new Inventory({
              product: product._id,
              warehouse: warehouseId,
              quantity,
              updatedBy: req.user._id,
            });
          }

          await inventory.save();
        }

        results.push({ row: rowNum, success: true, product: product.name });
      } catch (error) {
        errors.push({ row: rowNum, success: false, error: error.message });
      }
    }

    // 清理上传的文件
    const fs = require('fs');
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: `导入完成，成功 ${results.length} 条，失败 ${errors.length} 条`,
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    });
  } catch (error) {
    logger.error('Excel导入失败', {
      userId: req.user._id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Excel导入失败', error: error.message });
  }
});

module.exports = router;
