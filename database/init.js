const path = require('path');

// 添加backend目录到模块搜索路径
const backendPath = path.join(__dirname, '../backend');
const nodeModulesPath = path.join(backendPath, 'node_modules');
require('module').globalPaths.push(nodeModulesPath);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 正确加载.env文件，使用绝对路径确保不管在哪里运行都能找到
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// 引入模型
const User = require(path.join(__dirname, '../backend/models/User'));
const Category = require(path.join(__dirname, '../backend/models/Category'));
const Supplier = require(path.join(__dirname, '../backend/models/Supplier'));
const Warehouse = require(path.join(__dirname, '../backend/models/Warehouse'));
const Product = require(path.join(__dirname, '../backend/models/Product'));
const Inventory = require(path.join(__dirname, '../backend/models/Inventory'));
const Transaction = require(path.join(__dirname, '../backend/models/Transaction'));

// 连接数据库
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';

console.log(`正在连接数据库: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000, // 10秒超时
  connectTimeoutMS: 10000,
})
.then(() => console.log('✅ 数据库连接成功'))
.catch(err => {
  console.error('❌ 数据库连接失败:', err.message);
  console.log('💡 可能的解决方法：');
  console.log('   1. 确认MongoDB服务已启动，端口27017');
  console.log('   2. 检查backend/.env中的MONGODB_URI配置是否正确');
  console.log('   3. 如果是远程数据库，确认网络连接正常');
  process.exit(1);
});

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

    // 创建普通用户（仓管员A）
    const keeperAPassword = await bcrypt.hash('123456', 10);
    const keeperA = new User({
      username: 'keeper_a',
      password: keeperAPassword,
      realName: '仓管员A',
      email: 'keeper_a@example.com',
      phone: '13800138001',
      role: 'warehouse_keeper',
    });
    await keeperA.save();

    // 创建普通用户（仓管员B）
    const keeperBPassword = await bcrypt.hash('123456', 10);
    const keeperB = new User({
      username: 'keeper_b',
      password: keeperBPassword,
      realName: '仓管员B',
      email: 'keeper_b@example.com',
      phone: '13800138002',
      role: 'warehouse_keeper',
    });
    await keeperB.save();

    console.log('用户数据初始化完成');
    console.log('管理员账号: admin / 123456');
    console.log('仓管员A账号: keeper_a / 123456');
    console.log('仓管员B账号: keeper_b / 123456');

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
      { name: '二号仓库', code: 'WH002', location: '二号楼三层', manager: keeperA._id, phone: '13800138001', sort: 2 },
      { name: '备品仓库', code: 'WH003', location: '三号楼二层', manager: keeperB._id, phone: '13800138002', sort: 3 },
    ];

    const createdWarehouses = await Warehouse.insertMany(warehouses);
    console.log('仓库数据初始化完成');

    // 创建商品（包含 remark 字段）
    const products = [
      {
        name: '笔记本电脑',
        sku: 'ELEC001',
        category: createdCategories[0]._id,
        supplier: createdSuppliers[0]._id,
        specification: '16G/512G',
        modelName: 'ThinkPad X1 Carbon',
        manufacturer: '联想',
        description: '轻薄便携商务本',
        remark: '高性能处理器，适合办公',
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
        modelName: 'MX Master 3',
        manufacturer: '罗技',
        description: '办公无线鼠标',
        remark: '人体工学设计，静音按键',
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
        modelName: 'Double A',
        manufacturer: 'Double A',
        description: '优质打印纸',
        remark: '适合日常打印和复印',
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
        modelName: 'Pilot G-2',
        manufacturer: '百乐',
        description: '办公中性笔',
        remark: '书写流畅，持久耐用',
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
        modelName: '世达09326',
        manufacturer: '世达',
        description: '多功能螺丝刀套装',
        remark: '包含常用规格，适合维修',
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
        modelName: '维达超韧',
        manufacturer: '维达',
        description: '家庭装卫生纸',
        remark: '三层加厚，柔软舒适',
        unit: '提',
        price: 29,
        costPrice: 15,
        minStock: 30,
        maxStock: 300,
        createdBy: admin._id,
      },
      // 新增更多测试数据
      {
        name: '键盘',
        sku: 'ELEC003',
        category: createdCategories[0]._id,
        supplier: createdSuppliers[0]._id,
        specification: '机械键盘',
        modelName: 'Cherry MX',
        manufacturer: 'Cherry',
        description: '游戏机械键盘',
        remark: 'RGB背光，可编程按键',
        unit: '个',
        price: 399,
        costPrice: 250,
        minStock: 10,
        maxStock: 100,
        createdBy: admin._id,
      },
      {
        name: '文件夹',
        sku: 'OFFI003',
        category: createdCategories[1]._id,
        supplier: createdSuppliers[1]._id,
        specification: 'A4',
        modelName: '得力5301',
        manufacturer: '得力',
        description: '透明文件夹',
        remark: '可容纳100页文件',
        unit: '个',
        price: 3,
        costPrice: 1.5,
        minStock: 200,
        maxStock: 2000,
        createdBy: admin._id,
      },
      {
        name: '钳子',
        sku: 'TOOL002',
        category: createdCategories[2]._id,
        supplier: createdSuppliers[2]._id,
        specification: '6寸',
        modelName: '波斯BS220016',
        manufacturer: '波斯',
        description: '钢丝钳',
        remark: '坚固耐用，剪切锋利',
        unit: '把',
        price: 19,
        costPrice: 8,
        minStock: 50,
        maxStock: 500,
        createdBy: admin._id,
      },
      {
        name: '洗衣液',
        sku: 'DAIL002',
        category: createdCategories[3]._id,
        supplier: createdSuppliers[3]._id,
        specification: '2kg',
        modelName: '蓝月亮深层洁净',
        manufacturer: '蓝月亮',
        description: '瓶装洗衣液',
        remark: '深层洁净，易漂洗',
        unit: '瓶',
        price: 25,
        costPrice: 12,
        minStock: 20,
        maxStock: 200,
        createdBy: admin._id,
      },
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('商品数据初始化完成 (共 ' + createdProducts.length + ' 个商品)');

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
