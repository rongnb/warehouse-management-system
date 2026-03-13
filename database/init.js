const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../backend/.env' });

// 引入模型
const User = require('../backend/models/User');
const Category = require('../backend/models/Category');
const Supplier = require('../backend/models/Supplier');
const Warehouse = require('../backend/models/Warehouse');
const Product = require('../backend/models/Product');
const Inventory = require('../backend/models/Inventory');
const Transaction = require('../backend/models/Transaction');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('数据库连接成功'))
.catch(err => console.error('数据库连接失败:', err));

// 初始化数据
const initData = async () => {
  try {
    // 清空现有数据
    await User.deleteMany({});
    await Category.deleteMany({});
    await Supplier.deleteMany({});
    await Warehouse.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Transaction.deleteMany({});

    console.log('已清空原有数据');

    // 创建管理员用户
    const adminPassword = await bcrypt.hash('123456', 10);
    const admin = new User({
      username: 'admin',
      password: adminPassword,
      realName: '系统管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      role: 'admin',
    });
    await admin.save();

    // 创建普通用户
    const staffPassword = await bcrypt.hash('123456', 10);
    const staff = new User({
      username: 'staff',
      password: staffPassword,
      realName: '仓库管理员',
      email: 'staff@example.com',
      phone: '13800138001',
      role: 'staff',
    });
    await staff.save();

    console.log('用户数据初始化完成');
    console.log('管理员账号: admin / 123456');
    console.log('普通用户账号: staff / 123456');

    // 创建分类
    const categories = [
      { name: '电子产品', code: 'ELEC', description: '电子类产品', sort: 1 },
      { name: '办公用品', code: 'OFFI', description: '办公文具用品', sort: 2 },
      { name: '五金工具', code: 'TOOL', description: '五金工具类', sort: 3 },
      { name: '生活用品', code: 'DAIL', description: '日常生活用品', sort: 4 },
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log('分类数据初始化完成');

    // 创建供应商
    const suppliers = [
      { name: '电子科技有限公司', code: 'SUP001', contact: '张经理', phone: '13900139000', level: 'A' },
      { name: '办公用品供应商', code: 'SUP002', contact: '李经理', phone: '13900139001', level: 'B' },
      { name: '五金贸易公司', code: 'SUP003', contact: '王经理', phone: '13900139002', level: 'B' },
      { name: '生活用品超市', code: 'SUP004', contact: '赵经理', phone: '13900139003', level: 'C' },
    ];

    const createdSuppliers = await Supplier.insertMany(suppliers);
    console.log('供应商数据初始化完成');

    // 创建仓库
    const warehouses = [
      { name: '主仓库', code: 'WH001', location: '一号楼一层', manager: admin._id, phone: '13800138000', sort: 1 },
      { name: '二号仓库', code: 'WH002', location: '二号楼三层', manager: staff._id, phone: '13800138001', sort: 2 },
      { name: '备品仓库', code: 'WH003', location: '三号楼二层', sort: 3 },
    ];

    const createdWarehouses = await Warehouse.insertMany(warehouses);
    console.log('仓库数据初始化完成');

    // 创建商品
    const products = [
      { 
        name: '笔记本电脑', 
        sku: 'ELEC001', 
        category: createdCategories[0]._id, 
        supplier: createdSuppliers[0]._id,
        specification: '16G/512G',
        unit: '台',
        price: 5999,
        costPrice: 4500,
        minStock: 5,
        maxStock: 50,
        createdBy: admin._id,
      },
      { 
        name: '无线鼠标', 
        sku: 'ELEC002', 
        category: createdCategories[0]._id, 
        supplier: createdSuppliers[0]._id,
        specification: '蓝牙5.0',
        unit: '个',
        price: 99,
        costPrice: 45,
        minStock: 20,
        maxStock: 200,
        createdBy: admin._id,
      },
      { 
        name: 'A4打印纸', 
        sku: 'OFFI001', 
        category: createdCategories[1]._id, 
        supplier: createdSuppliers[1]._id,
        specification: '80g',
        unit: '包',
        price: 25,
        costPrice: 18,
        minStock: 50,
        maxStock: 500,
        createdBy: admin._id,
      },
      { 
        name: '中性笔', 
        sku: 'OFFI002', 
        category: createdCategories[1]._id, 
        supplier: createdSuppliers[1]._id,
        specification: '0.5mm黑色',
        unit: '盒',
        price: 12,
        costPrice: 6,
        minStock: 100,
        maxStock: 1000,
        createdBy: admin._id,
      },
      { 
        name: '螺丝刀套装', 
        sku: 'TOOL001', 
        category: createdCategories[2]._id, 
        supplier: createdSuppliers[2]._id,
        specification: '32件套',
        unit: '套',
        price: 89,
        costPrice: 45,
        minStock: 10,
        maxStock: 100,
        createdBy: admin._id,
      },
      { 
        name: '卫生纸', 
        sku: 'DAIL001', 
        category: createdCategories[3]._id, 
        supplier: createdSuppliers[3]._id,
        specification: '10卷/提',
        unit: '提',
        price: 29,
        costPrice: 15,
        minStock: 30,
        maxStock: 300,
        createdBy: admin._id,
      },
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('商品数据初始化完成');

    // 创建库存
    const inventory = [];
    createdProducts.forEach(product => {
      createdWarehouses.forEach(warehouse => {
        inventory.push({
          product: product._id,
          warehouse: warehouse._id,
          quantity: Math.floor(Math.random() * 50) + 10,
          updatedBy: admin._id,
        });
      });
    });

    await Inventory.insertMany(inventory);
    console.log('库存数据初始化完成');

    // 创建一些交易记录
    const transactions = [];
    for (let i = 0; i < 20; i++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const warehouse = createdWarehouses[Math.floor(Math.random() * createdWarehouses.length)];
      const type = Math.random() > 0.5 ? 'in' : 'out';
      const quantity = Math.floor(Math.random() * 20) + 1;

      transactions.push({
        type,
        product: product._id,
        warehouse: warehouse._id,
        quantity,
        price: type === 'in' ? product.costPrice : product.price,
        supplier: type === 'in' ? product.supplier : undefined,
        customer: type === 'out' ? '客户' + Math.floor(Math.random() * 100) : undefined,
        operator: admin._id,
        remark: type === 'in' ? '采购入库' : '销售出库',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
      });
    }

    await Transaction.insertMany(transactions);
    console.log('交易记录初始化完成');

    console.log('所有数据初始化完成！');
    process.exit(0);

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
};

// 执行初始化
initData();
