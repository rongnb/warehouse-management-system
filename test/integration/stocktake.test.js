const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const Warehouse = require('../../backend/models/Warehouse');
const Product = require('../../backend/models/Product');
const Inventory = require('../../backend/models/Inventory');
const Stocktake = require('../../backend/models/Stocktake');
const bcrypt = require('bcryptjs');

describe('Stocktake Full Process Integration Tests', () => {
  let adminToken;
  let keeperAToken;
  let keeperBToken;
  let adminId;
  let keeperAId;
  let keeperBId;
  let warehouseId;
  let productIds = [];
  let stocktakeId;

  beforeAll(async () => {
    // 清空所有数据
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Stocktake.deleteMany({});

    // 创建测试用户
    const adminPassword = await bcrypt.hash('123456', 10);
    const admin = await User.create({
      username: 'admin_test',
      password: adminPassword,
      realName: '管理员',
      email: 'admin@test.com',
      role: 'admin'
    });
    adminId = admin._id;

    const keeperAPassword = await bcrypt.hash('123456', 10);
    const keeperA = await User.create({
      username: 'keeper_a_test',
      password: keeperAPassword,
      realName: '仓管员A',
      email: 'keepera@test.com',
      role: 'warehouse_keeper'
    });
    keeperAId = keeperA._id;

    const keeperBPassword = await bcrypt.hash('123456', 10);
    const keeperB = await User.create({
      username: 'keeper_b_test',
      password: keeperBPassword,
      realName: '仓管员B',
      email: 'keeperb@test.com',
      role: 'warehouse_keeper'
    });
    keeperBId = keeperB._id;

    // 登录获取token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test', password: '123456' });
    adminToken = adminLogin.body.token;

    const keeperALogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'keeper_a_test', password: '123456' });
    keeperAToken = keeperALogin.body.token;

    const keeperBLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'keeper_b_test', password: '123456' });
    keeperBToken = keeperBLogin.body.token;

    // 创建测试仓库
    const warehouse = await Warehouse.create({
      name: '测试仓库',
      code: 'WH_TEST',
      location: '测试地址',
      manager: adminId
    });
    warehouseId = warehouse._id;

    // 创建测试商品
    const products = await Product.insertMany([
      { name: '商品1', sku: 'PROD001', unit: '个', price: 100, costPrice: 50, createdBy: adminId },
      { name: '商品2', sku: 'PROD002', unit: '箱', price: 200, costPrice: 100, createdBy: adminId },
      { name: '商品3', sku: 'PROD003', unit: '件', price: 300, costPrice: 150, createdBy: adminId }
    ]);
    productIds = products.map(p => p._id);

    // 创建初始库存
    await Inventory.insertMany([
      { product: productIds[0], warehouse: warehouseId, quantity: 100, updatedBy: adminId },
      { product: productIds[1], warehouse: warehouseId, quantity: 50, updatedBy: adminId },
      { product: productIds[2], warehouse: warehouseId, quantity: 75, updatedBy: adminId }
    ]);
  });

  test('1. 仓管员A发起盘库 - 成功', async () => {
    const res = await request(app)
      .post('/api/stocktake')
      .set('Authorization', `Bearer ${keeperAToken}`)
      .send({
        warehouse: warehouseId,
        remark: '月度盘库'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.initiatedBy.toString()).toBe(keeperAId.toString());
    expect(res.body.data.warehouse.toString()).toBe(warehouseId.toString());
    expect(res.body.data.items).toHaveLength(3);
    
    stocktakeId = res.body.data._id;

    // 验证初始系统数量正确
    const items = res.body.data.items;
    expect(items.find(i => i.product.toString() === productIds[0].toString()).systemQuantity).toBe(100);
    expect(items.find(i => i.product.toString() === productIds[1].toString()).systemQuantity).toBe(50);
    expect(items.find(i => i.product.toString() === productIds[2].toString()).systemQuantity).toBe(75);
  });

  test('2. 仓管员A录入盘点数据 - 成功', async () => {
    const res = await request(app)
      .put(`/api/stocktake/${stocktakeId}/items`)
      .set('Authorization', `Bearer ${keeperAToken}`)
      .send({
        items: [
          { product: productIds[0], actualQuantity: 98, remark: '少2个，可能损坏' },
          { product: productIds[1], actualQuantity: 50, remark: '数量正确' },
          { product: productIds[2], actualQuantity: 80, remark: '多5个，上次入库漏登' }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // 验证盘盈盘亏计算正确
    const stocktake = await Stocktake.findById(stocktakeId);
    const item1 = stocktake.items.find(i => i.product.toString() === productIds[0].toString());
    expect(item1.difference).toBe(-2);
    expect(item1.differenceType).toBe('loss');

    const item2 = stocktake.items.find(i => i.product.toString() === productIds[1].toString());
    expect(item2.difference).toBe(0);
    expect(item2.differenceType).toBe('normal');

    const item3 = stocktake.items.find(i => i.product.toString() === productIds[2].toString());
    expect(item3.difference).toBe(5);
    expect(item3.differenceType).toBe('profit');
  });

  test('3. 同一用户不能复核自己发起的盘库 - 权限控制验证', async () => {
    const res = await request(app)
      .put(`/api/stocktake/${stocktakeId}/review`)
      .set('Authorization', `Bearer ${keeperAToken}`)
      .send({
        status: 'approved',
        remark: '审核通过'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('不能复核自己发起的盘库任务');
  });

  test('4. 仓管员B复核盘库 - 成功', async () => {
    const res = await request(app)
      .put(`/api/stocktake/${stocktakeId}/review`)
      .set('Authorization', `Bearer ${keeperBToken}`)
      .send({
        status: 'approved',
        remark: '数据核实无误，同意通过'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.reviewedBy.toString()).toBe(keeperBId.toString());
    expect(res.body.data.reviewRemark).toBe('数据核实无误，同意通过');
  });

  test('5. 验证库存已自动更新', async () => {
    const inventory1 = await Inventory.findOne({ product: productIds[0], warehouse: warehouseId });
    expect(inventory1.quantity).toBe(98);

    const inventory2 = await Inventory.findOne({ product: productIds[1], warehouse: warehouseId });
    expect(inventory2.quantity).toBe(50);

    const inventory3 = await Inventory.findOne({ product: productIds[2], warehouse: warehouseId });
    expect(inventory3.quantity).toBe(80);
  });

  test('6. 验证盘库报表生成', async () => {
    const res = await request(app)
      .get(`/api/stocktake/${stocktakeId}/report`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalProfit).toBe(5 * 150); // 商品3成本价150，多5个
    expect(res.body.data.totalLoss).toBe(2 * 50); // 商品1成本价50，少2个
    expect(res.body.data.totalDifference).toBe(5 * 150 - 2 * 50);
  });
});
