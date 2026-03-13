const request = require('supertest');
const app = require('./backend/app');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 加载模型
const User = require('./backend/models/User');
const Product = require('./backend/models/Product');
const Category = require('./backend/models/Category');
const Supplier = require('./backend/models/Supplier');
const Warehouse = require('./backend/models/Warehouse');
const Inventory = require('./backend/models/Inventory');
const Transaction = require('./backend/models/Transaction');
const Stocktake = require('./backend/models/Stocktake');

// 测试配置
const TEST_CONFIG = {
  mongodbUri: 'mongodb://localhost:27017/warehouse_test',
  outputReport: '仓库管理系统测试报告.md'
};

// 测试用户数据
const testUsers = {
  admin: {
    username: 'admin_test',
    password: '123456',
    name: '系统管理员',
    role: 'admin'
  },
  manager: {
    username: 'manager_test',
    password: '123456',
    name: '仓库经理',
    role: 'manager'
  },
  staff1: {
    username: 'staff1_test',
    password: '123456',
    name: '仓库员工1',
    role: 'staff'
  },
  staff2: {
    username: 'staff2_test',
    password: '123456',
    name: '仓库员工2',
    role: 'staff'
  }
};

// 测试结果收集
const testResults = {
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    startTime: new Date().toISOString(),
    endTime: null
  },
  testCases: [],
  bugs: []
};

// 辅助函数：记录测试结果
function logTestResult(testCase) {
  testResults.summary.total++;
  testResults.testCases.push(testCase);
  
  if (testCase.status === 'passed') {
    testResults.summary.passed++;
    console.log(`✅ ${testCase.id} ${testCase.name}`);
  } else {
    testResults.summary.failed++;
    testResults.bugs.push({
      testId: testCase.id,
      testName: testCase.name,
      error: testCase.error
    });
    console.log(`❌ ${testCase.id} ${testCase.name}: ${testCase.error}`);
  }
}

// 辅助函数：获取JWT token
async function getToken(userCredentials) {
  const res = await request(app)
    .post('/api/auth/login')
    .send(userCredentials);
  return res.body.token;
}

// 生成测试报告
function generateReport() {
  testResults.summary.endTime = new Date().toISOString();
  const duration = (new Date(testResults.summary.endTime) - new Date(testResults.summary.startTime)) / 1000;
  
  let report = `# 仓库管理系统测试报告\n\n`;
  report += `## 测试概览\n\n`;
  report += `- 测试时间: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `- 测试耗时: ${duration.toFixed(2)} 秒\n`;
  report += `- 总测试用例: ${testResults.summary.total}\n`;
  report += `- 通过率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%\n`;
  report += `- ✅ 通过: ${testResults.summary.passed}\n`;
  report += `- ❌ 失败: ${testResults.summary.failed}\n\n`;
  
  if (testResults.bugs.length > 0) {
    report += `## 🐛 Bug 列表\n\n`;
    testResults.bugs.forEach((bug, index) => {
      report += `${index + 1}. **${bug.testId} ${bug.testName}**\n`;
      report += `   错误信息: ${bug.error}\n\n`;
    });
  }
  
  report += `## 详细测试结果\n\n`;
  
  // 按模块分组
  const modules = {};
  testResults.testCases.forEach(tc => {
    const module = tc.id.split('.')[0];
    if (!modules[module]) modules[module] = [];
    modules[module].push(tc);
  });
  
  for (const [module, cases] of Object.entries(modules)) {
    const moduleNames = {
      '1': '1. 基础数据维护流程',
      '2': '2. 入库流程',
      '3': '3. 出库流程',
      '4': '4. 库存管理流程',
      '5': '5. 盘库全流程',
      '6': '6. 查询统计流程'
    };
    
    report += `### ${moduleNames[module] || module}\n\n`;
    report += `| 用例ID | 测试用例名称 | 测试类型 | 预期结果 | 实际结果 | 状态 |\n`;
    report += `|--------|--------------|----------|----------|----------|------|\n`;
    
    cases.forEach(tc => {
      const status = tc.status === 'passed' ? '✅ 通过' : '❌ 失败';
      report += `| ${tc.id} | ${tc.name} | ${tc.type} | ${tc.expected} | ${tc.actual} | ${status} |\n`;
    });
    report += '\n';
  }
  
  fs.writeFileSync(path.join(__dirname, TEST_CONFIG.outputReport), report, 'utf8');
  console.log(`\n📝 测试报告已生成: ${TEST_CONFIG.outputReport}`);
}

// 连接测试数据库
beforeAll(async () => {
  try {
    await mongoose.connect(TEST_CONFIG.mongodbUri);
    console.log('✅ 连接测试数据库成功');
  } catch (error) {
    console.error('❌ 连接测试数据库失败:', error);
    process.exit(1);
  }
});

// 清空数据库
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  // 创建测试用户
  for (const user of Object.values(testUsers)) {
    await User.create(user);
  }
});

// 断开数据库连接并生成报告
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  generateReport();
});

describe('1. 基础数据维护流程', () => {
  let adminToken;
  
  beforeAll(async () => {
    adminToken = await getToken({
      username: testUsers.admin.username,
      password: testUsers.admin.password
    });
  });

  test('1.1 分类管理 - 新增商品分类（正向）', async () => {
    const testCase = {
      id: '1.1',
      name: '新增商品分类',
      type: '正向',
      expected: '分类创建成功，返回正确的分类信息',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const categoryData = {
        name: '电子产品',
        description: '电子类产品',
        sort: 1
      };
      
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(categoryData.name);
      
      testCase.actual = '分类创建成功，返回信息正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.2 分类管理 - 新增重复分类名称（反向）', async () => {
    const testCase = {
      id: '1.2',
      name: '新增重复分类名称',
      type: '反向',
      expected: '创建失败，提示分类名称已存在',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建一个分类
      await Category.create({ name: '电子产品', description: '测试' });
      
      const categoryData = {
        name: '电子产品',
        description: '重复分类'
      };
      
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData);
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '创建失败，正确提示重复';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.3 供应商管理 - 新增供应商（正向）', async () => {
    const testCase = {
      id: '1.3',
      name: '新增供应商',
      type: '正向',
      expected: '供应商创建成功，返回正确信息',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const supplierData = {
        name: '测试供应商有限公司',
        contact: '张三',
        phone: '13800138000',
        email: 'supplier@test.com',
        address: '测试地址',
        remark: '测试供应商'
      };
      
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(supplierData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(supplierData.name);
      expect(res.body.phone).toBe(supplierData.phone);
      
      testCase.actual = '供应商创建成功，信息正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.4 供应商管理 - 手机号格式错误（反向）', async () => {
    const testCase = {
      id: '1.4',
      name: '供应商手机号格式错误',
      type: '反向',
      expected: '创建失败，提示手机号格式不正确',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const supplierData = {
        name: '测试供应商',
        contact: '张三',
        phone: '12345', // 错误格式
        email: 'supplier@test.com'
      };
      
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(supplierData);
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '创建失败，正确校验手机号格式';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.5 仓库管理 - 新增仓库（正向）', async () => {
    const testCase = {
      id: '1.5',
      name: '新增仓库',
      type: '正向',
      expected: '仓库创建成功，返回正确信息',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const warehouseData = {
        name: '主仓库',
        location: 'A区1楼',
        manager: '李四',
        phone: '13800138001',
        remark: '主要存储仓库'
      };
      
      const res = await request(app)
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warehouseData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(warehouseData.name);
      
      testCase.actual = '仓库创建成功，信息正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.6 商品管理 - 新增商品（正向）', async () => {
    const testCase = {
      id: '1.6',
      name: '新增商品',
      type: '正向',
      expected: '商品创建成功，自动生成初始库存为0',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建分类
      const category = await Category.create({ name: '电子产品', description: '测试' });
      
      const productData = {
        name: '智能手机',
        sku: 'PHONE001',
        category: category._id,
        unit: '台',
        price: 3999,
        spec: '6G+128G',
        description: '新款智能手机',
        minStock: 10,
        maxStock: 100
      };
      
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(productData.name);
      expect(res.body.sku).toBe(productData.sku);
      
      // 验证初始库存
      const inventory = await Inventory.findOne({ product: res.body._id });
      expect(inventory).toBeDefined();
      expect(inventory.quantity).toBe(0);
      
      testCase.actual = '商品创建成功，初始库存为0';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('1.7 商品管理 - 新增重复SKU（反向）', async () => {
    const testCase = {
      id: '1.7',
      name: '新增重复SKU商品',
      type: '反向',
      expected: '创建失败，提示SKU已存在',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const category = await Category.create({ name: '电子产品', description: '测试' });
      
      // 先创建一个商品
      await Product.create({
        name: '智能手机',
        sku: 'PHONE001',
        category: category._id,
        unit: '台',
        price: 3999
      });
      
      const productData = {
        name: '另一款手机',
        sku: 'PHONE001', // 重复SKU
        category: category._id,
        unit: '台',
        price: 4999
      };
      
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '创建失败，正确提示SKU重复';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });
});

describe('2. 入库流程', () => {
  let adminToken;
  let testProduct;
  let testSupplier;
  let testWarehouse;
  
  beforeAll(async () => {
    adminToken = await getToken({
      username: testUsers.admin.username,
      password: testUsers.admin.password
    });
    
    // 准备测试数据
    const category = await Category.create({ name: '电子产品', description: '测试' });
    testProduct = await Product.create({
      name: '智能手机',
      sku: 'PHONE001',
      category: category._id,
      unit: '台',
      price: 3999
    });
    
    testSupplier = await Supplier.create({
      name: '测试供应商',
      contact: '张三',
      phone: '13800138000'
    });
    
    testWarehouse = await Warehouse.create({
      name: '主仓库',
      location: 'A区1楼'
    });
    
    // 初始化库存
    await Inventory.create({
      product: testProduct._id,
      warehouse: testWarehouse._id,
      quantity: 0,
      location: 'A-01'
    });
  });

  test('2.1 采购入库 - 正常入库（正向）', async () => {
    const testCase = {
      id: '2.1',
      name: '采购入库正常流程',
      type: '正向',
      expected: '入库成功，库存增加对应数量，生成入库记录',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const initialInventory = await Inventory.findOne({ product: testProduct._id });
      const inQuantity = 50;
      
      const res = await request(app)
        .post('/api/transactions/in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          warehouse: testWarehouse._id,
          quantity: inQuantity,
          type: 'purchase_in',
          supplier: testSupplier._id,
          remark: '采购入库测试'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.quantity).toBe(inQuantity);
      expect(res.body.type).toBe('purchase_in');
      
      // 验证库存增加
      const updatedInventory = await Inventory.findOne({ product: testProduct._id });
      expect(updatedInventory.quantity).toBe(initialInventory.quantity + inQuantity);
      
      // 验证入库记录
      const transaction = await Transaction.findById(res.body._id);
      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(inQuantity);
      
      testCase.actual = '入库成功，库存增加50，入库记录生成正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('2.2 采购入库 - 入库数量为0（反向）', async () => {
    const testCase = {
      id: '2.2',
      name: '入库数量为0',
      type: '反向',
      expected: '入库失败，提示数量必须大于0',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .post('/api/transactions/in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          warehouse: testWarehouse._id,
          quantity: 0, // 数量为0
          type: 'purchase_in',
          supplier: testSupplier._id
        });
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '入库失败，正确校验数量大于0';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('2.3 入库审核 - 审核通过（正向）', async () => {
    const testCase = {
      id: '2.3',
      name: '入库单审核通过',
      type: '正向',
      expected: '审核成功，入库单状态变为已审核',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建待审核的入库单
      const transaction = await Transaction.create({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        quantity: 30,
        type: 'purchase_in',
        supplier: testSupplier._id,
        status: 'pending',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id
      });
      
      const res = await request(app)
        .put(`/api/transactions/${transaction._id}/audit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          remark: '审核通过'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('approved');
      
      // 验证库存增加
      const inventory = await Inventory.findOne({ product: testProduct._id });
      expect(inventory.quantity).toBe(30); // 初始0 + 30
      
      testCase.actual = '审核通过，入库单状态更新，库存增加正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('2.4 入库审核 - 重复审核（反向）', async () => {
    const testCase = {
      id: '2.4',
      name: '已审核入库单重复审核',
      type: '反向',
      expected: '审核失败，提示入库单已审核',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建已审核的入库单
      const transaction = await Transaction.create({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        quantity: 30,
        type: 'purchase_in',
        supplier: testSupplier._id,
        status: 'approved',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id
      });
      
      const res = await request(app)
        .put(`/api/transactions/${transaction._id}/audit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          remark: '重复审核'
        });
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '审核失败，正确提示已审核状态不能重复审核';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });
});

describe('3. 出库流程', () => {
  let adminToken;
  let staffToken;
  let testProduct;
  let testWarehouse;
  
  beforeAll(async () => {
    adminToken = await getToken({
      username: testUsers.admin.username,
      password: testUsers.admin.password
    });
    
    staffToken = await getToken({
      username: testUsers.staff1.username,
      password: testUsers.staff1.password
    });
    
    // 准备测试数据
    const category = await Category.create({ name: '电子产品', description: '测试' });
    testProduct = await Product.create({
      name: '智能手机',
      sku: 'PHONE001',
      category: category._id,
      unit: '台',
      price: 3999
    });
    
    testWarehouse = await Warehouse.create({
      name: '主仓库',
      location: 'A区1楼'
    });
    
    // 初始化库存为100
    await Inventory.create({
      product: testProduct._id,
      warehouse: testWarehouse._id,
      quantity: 100,
      location: 'A-01'
    });
  });

  test('3.1 销售出库 - 正常出库（正向）', async () => {
    const testCase = {
      id: '3.1',
      name: '销售出库正常流程',
      type: '正向',
      expected: '出库成功，库存减少对应数量，生成出库记录',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const initialInventory = await Inventory.findOne({ product: testProduct._id });
      const outQuantity = 30;
      
      const res = await request(app)
        .post('/api/transactions/out')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          warehouse: testWarehouse._id,
          quantity: outQuantity,
          type: 'sale_out',
          customer: '测试客户',
          remark: '销售出库测试'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.quantity).toBe(outQuantity);
      expect(res.body.type).toBe('sale_out');
      
      // 验证库存减少
      const updatedInventory = await Inventory.findOne({ product: testProduct._id });
      expect(updatedInventory.quantity).toBe(initialInventory.quantity - outQuantity);
      
      testCase.actual = '出库成功，库存减少30，出库记录生成正确';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('3.2 销售出库 - 出库数量大于库存（反向）', async () => {
    const testCase = {
      id: '3.2',
      name: '出库数量大于现有库存',
      type: '反向',
      expected: '出库失败，提示库存不足',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .post('/api/transactions/out')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          warehouse: testWarehouse._id,
          quantity: 200, // 现有库存100，出库200
          type: 'sale_out',
          customer: '测试客户'
        });
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '出库失败，正确提示库存不足';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('3.3 领料出库 - 普通员工提交领料申请（正向）', async () => {
    const testCase = {
      id: '3.3',
      name: '普通员工提交领料出库申请',
      type: '正向',
      expected: '申请提交成功，状态为待审核',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .post('/api/transactions/out')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: testProduct._id,
          warehouse: testWarehouse._id,
          quantity: 10,
          type: 'material_out',
          department: '生产部',
          remark: '生产领料'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('pending'); // 待审核状态
      
      testCase.actual = '领料申请提交成功，状态为待审核';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('3.4 出库审核 - 无权限用户审核（反向）', async () => {
    const testCase = {
      id: '3.4',
      name: '普通员工审核出库单',
      type: '反向',
      expected: '审核失败，提示权限不足',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建待审核的出库单
      const transaction = await Transaction.create({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        quantity: 10,
        type: 'material_out',
        department: '生产部',
        status: 'pending',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id
      });
      
      // 使用普通员工账号审核
      const res = await request(app)
        .put(`/api/transactions/${transaction._id}/audit`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'approved',
          remark: '审核通过'
        });
      
      expect(res.statusCode).toBe(403);
      
      testCase.actual = '审核失败，正确提示权限不足';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });
});

describe('4. 库存管理流程', () => {
  let adminToken;
  let testProduct;
  let testWarehouse1;
  let testWarehouse2;
  
  beforeAll(async () => {
    adminToken = await getToken({
      username: testUsers.admin.username,
      password: testUsers.admin.password
    });
    
    // 准备测试数据
    const category = await Category.create({ name: '电子产品', description: '测试' });
    testProduct = await Product.create({
      name: '智能手机',
      sku: 'PHONE001',
      category: category._id,
      unit: '台',
      price: 3999,
      minStock: 10, // 最低库存预警
      maxStock: 100
    });
    
    testWarehouse1 = await Warehouse.create({
      name: '主仓库',
      location: 'A区1楼'
    });
    
    testWarehouse2 = await Warehouse.create({
      name: '副仓库',
      location: 'B区2楼'
    });
    
    // 初始化库存
    await Inventory.create({
      product: testProduct._id,
      warehouse: testWarehouse1._id,
      quantity: 100,
      location: 'A-01'
    });
    
    await Inventory.create({
      product: testProduct._id,
      warehouse: testWarehouse2._id,
      quantity: 5, // 低于最低库存，应该预警
      location: 'B-01'
    });
  });

  test('4.1 库存查询 - 按商品名称搜索（正向）', async () => {
    const testCase = {
      id: '4.1',
      name: '按商品名称搜索库存',
      type: '正向',
      expected: '返回匹配的库存记录',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: '智能手机' });
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // 两个仓库的库存
      
      testCase.actual = '查询成功，返回2条匹配的库存记录';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('4.2 库存预警 - 查询低于最低库存的商品（正向）', async () => {
    const testCase = {
      id: '4.2',
      name: '库存预警查询',
      type: '正向',
      expected: '返回副仓库中库存为5的商品（低于最低库存10）',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .get('/api/inventory/warning')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].quantity).toBe(5);
      expect(res.body[0].warehouse.name).toBe('副仓库');
      
      testCase.actual = '查询成功，返回1条低于最低库存的记录';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('4.3 移库操作 - 从主仓库移到副仓库（正向）', async () => {
    const testCase = {
      id: '4.3',
      name: '仓库间移库操作',
      type: '正向',
      expected: '移库成功，主仓库库存减少，副仓库库存增加',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const initialMain = await Inventory.findOne({ product: testProduct._id, warehouse: testWarehouse1._id });
      const initialSub = await Inventory.findOne({ product: testProduct._id, warehouse: testWarehouse2._id });
      const moveQuantity = 20;
      
      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          fromWarehouse: testWarehouse1._id,
          toWarehouse: testWarehouse2._id,
          quantity: moveQuantity,
          remark: '移库测试'
        });
      
      expect(res.statusCode).toBe(200);
      
      // 验证库存变化
      const updatedMain = await Inventory.findOne({ product: testProduct._id, warehouse: testWarehouse1._id });
      const updatedSub = await Inventory.findOne({ product: testProduct._id, warehouse: testWarehouse2._id });
      
      expect(updatedMain.quantity).toBe(initialMain.quantity - moveQuantity);
      expect(updatedSub.quantity).toBe(initialSub.quantity + moveQuantity);
      
      // 验证移库记录
      const transaction = await Transaction.findOne({ type: 'transfer' });
      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(moveQuantity);
      
      testCase.actual = `移库成功，主仓库库存${initialMain.quantity}→${updatedMain.quantity}，副仓库库存${initialSub.quantity}→${updatedSub.quantity}`;
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('4.4 移库操作 - 移出仓库库存不足（反向）', async () => {
    const testCase = {
      id: '4.4',
      name: '移出仓库库存不足时移库',
      type: '反向',
      expected: '移库失败，提示移出仓库库存不足',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: testProduct._id,
          fromWarehouse: testWarehouse1._id,
          toWarehouse: testWarehouse2._id,
          quantity: 200, // 主仓库只有100
          remark: '超量移库测试'
        });
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '移库失败，正确提示库存不足';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });
});

describe('5. 盘库全流程', () => {
  let adminToken;
  let managerToken;
  let staff1Token;
  let staff2Token;
  let testProduct;
  let testWarehouse;
  
  beforeAll(async () => {
    adminToken = await getToken({
      username: testUsers.admin.username,
      password: testUsers.admin.password
    });
    
    managerToken = await getToken({
      username: testUsers.manager.username,
      password: testUsers.manager.password
    });
    
    staff1Token = await getToken({
      username: testUsers.staff1.username,
      password: testUsers.staff1.password
    });
    
    staff2Token = await getToken({
      username: testUsers.staff2.username,
      password: testUsers.staff2.password
    });
    
    // 准备测试数据
    const category = await Category.create({ name: '电子产品', description: '测试' });
    testProduct = await Product.create({
      name: '智能手机',
      sku: 'PHONE001',
      category: category._id,
      unit: '台',
      price: 3999
    });
    
    testWarehouse = await Warehouse.create({
      name: '主仓库',
      location: 'A区1楼'
    });
    
    // 初始化库存为100
    await Inventory.create({
      product: testProduct._id,
      warehouse: testWarehouse._id,
      quantity: 100,
      location: 'A-01'
    });
  });

  test('5.1 盘库发起 - 新建盘库单（正向）', async () => {
    const testCase = {
      id: '5.1',
      name: '发起新的盘库单',
      type: '正向',
      expected: '盘库单创建成功，状态为草稿',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const res = await request(app)
        .post('/api/stocktake')
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({
          warehouse: testWarehouse._id,
          remark: '月度盘库',
          items: [
            {
              product: testProduct._id,
              systemQuantity: 100
            }
          ]
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('draft');
      expect(res.body.createdBy.name).toBe(testUsers.staff1.name);
      
      testCase.actual = '盘库单创建成功，状态为草稿';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.2 初盘录入 - 录入实际库存（正向）', async () => {
    const testCase = {
      id: '5.2',
      name: '初盘录入实际库存',
      type: '正向',
      expected: '实际库存录入成功，自动计算盘盈盘亏',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 先创建盘库单
      const stocktake = await Stocktake.create({
        warehouse: testWarehouse._id,
        remark: '月度盘库',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id,
        items: [
          {
            product: testProduct._id,
            systemQuantity: 100,
            actualQuantity: null
          }
        ],
        status: 'draft'
      });
      
      const actualQuantity = 105; // 盘盈5个
      
      const res = await request(app)
        .put(`/api/stocktake/${stocktake._id}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({
          items: [
            {
              product: testProduct._id,
              actualQuantity: actualQuantity
            }
          ]
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.items[0].actualQuantity).toBe(actualQuantity);
      expect(res.body.items[0].profitQuantity).toBe(5); // 105-100=5
      expect(res.body.totalProfitAmount).toBe(5 * 3999); // 5 * 单价
      
      testCase.actual = `实际库存录入成功，计算盘盈5个，金额${5 * 3999}元`;
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.3 提交盘库单 - 提交审核（正向）', async () => {
    const testCase = {
      id: '5.3',
      name: '提交盘库单待审核',
      type: '正向',
      expected: '提交成功，状态变为待核实',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 创建已录入实际库存的盘库单
      const stocktake = await Stocktake.create({
        warehouse: testWarehouse._id,
        remark: '月度盘库',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id,
        items: [
          {
            product: testProduct._id,
            systemQuantity: 100,
            actualQuantity: 105,
            profitQuantity: 5,
            profitAmount: 5 * 3999
          }
        ],
        totalProfitAmount: 5 * 3999,
        status: 'draft'
      });
      
      const res = await request(app)
        .post(`/api/stocktake/${stocktake._id}/submit`)
        .set('Authorization', `Bearer ${staff1Token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('pending_verify');
      
      testCase.actual = '提交成功，状态变为待核实';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.4 双人核实 - 第一核实人确认（正向）', async () => {
    const testCase = {
      id: '5.4',
      name: '第一核实人确认盘库结果',
      type: '正向',
      expected: '核实成功，状态变为待第二次核实',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 创建待核实的盘库单
      const stocktake = await Stocktake.create({
        warehouse: testWarehouse._id,
        remark: '月度盘库',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id,
        items: [
          {
            product: testProduct._id,
            systemQuantity: 100,
            actualQuantity: 105,
            profitQuantity: 5,
            profitAmount: 5 * 3999
          }
        ],
        totalProfitAmount: 5 * 3999,
        status: 'pending_verify'
      });
      
      const res = await request(app)
        .post(`/api/stocktake/${stocktake._id}/verify`)
        .set('Authorization', `Bearer ${staff2Token}`) // 不同的员工
        .send({
          status: 'approved',
          remark: '第一核实通过'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.firstVerifiedBy).toBeDefined();
      expect(res.body.status).toBe('pending_second_verify');
      
      testCase.actual = '第一核实成功，状态变为待第二次核实';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.5 双人核实 - 相同用户二次核实（反向）', async () => {
    const testCase = {
      id: '5.5',
      name: '第一核实人再次进行第二次核实',
      type: '反向',
      expected: '核实失败，提示不能与第一核实人相同',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const staff2Id = (await User.findOne({ username: testUsers.staff2.username }))._id;
      
      // 创建待第二次核实的盘库单，第一核实人是staff2
      const stocktake = await Stocktake.create({
        warehouse: testWarehouse._id,
        remark: '月度盘库',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id,
        firstVerifiedBy: staff2Id,
        items: [
          {
            product: testProduct._id,
            systemQuantity: 100,
            actualQuantity: 105,
            profitQuantity: 5,
            profitAmount: 5 * 3999
          }
        ],
        totalProfitAmount: 5 * 3999,
        status: 'pending_second_verify'
      });
      
      // 使用同一个用户进行第二次核实
      const res = await request(app)
        .post(`/api/stocktake/${stocktake._id}/verify`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .send({
          status: 'approved',
          remark: '第二次核实'
        });
      
      expect(res.statusCode).toBe(400);
      
      testCase.actual = '核实失败，正确提示不能与第一核实人相同';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.6 双人核实 - 普通员工进行第二次核实（反向）', async () => {
    const testCase = {
      id: '5.6',
      name: '普通员工进行第二次核实',
      type: '反向',
      expected: '核实失败，提示需要经理或管理员权限',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      // 创建待第二次核实的盘库单
      const stocktake = await Stocktake.create({
        warehouse: testWarehouse._id,
        remark: '月度盘库',
        createdBy: (await User.findOne({ username: testUsers.staff1.username }))._id,
        firstVerifiedBy: (await User.findOne({ username: testUsers.staff2.username }))._id,
        items: [
          {
            product: testProduct._id,
            systemQuantity: 100,
            actualQuantity: 105,
            profitQuantity: 5,
            profitAmount: 5 * 3999
          }
        ],
        totalProfitAmount: 5 * 3999,
        status: 'pending_second_verify'
      });
      
      // 使用普通员工（staff1）进行第二次核实
      const res = await request(app)
        .post(`/api/stocktake/${stocktake._id}/verify`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({
          status: 'approved',
          remark: '第二次核实'
        });
      
      expect(res.statusCode).toBe(403);
      
      testCase.actual = '核实失败，正确提示权限不足，需要经理/管理员权限';
      testCase.status = 'passed';
    } catch (error) {
      testCase.actual = error.message;
      testCase.status = 'failed';
      testCase.error = error.message;
    }
    
    logTestResult(testCase);
  });

  test('5.7 双人核实 - 经理第二次核实通过（正向）', async () => {
    const testCase = {
      id: '5.7',
      name: '经理第二次核实通过',
      type: '正向',
      expected: '核实成功，盘库完成，库存自动更新，生成盘盈记录',
      actual: '',
      status: '',
      error: ''
    };
    
    try {
      const initialInventory = await Inventory.findOne({ product: testProduct._id });
      
      // 创建待第二次核实的盘库单
      const stocktake = await Stocktake.create({
        warehouse: