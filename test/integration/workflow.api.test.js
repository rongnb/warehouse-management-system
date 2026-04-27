require('../setup-env');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  sequelize, User, Category, Supplier, Warehouse, Product, Inventory, Transaction, Stocktake, StocktakeItem,
} = require('../../backend/models');

/**
 * End-to-end workflow integration test:
 * Login → Create Product → Inbound → Outbound → Stocktake (create → update → submit → dual-confirm)
 */
describe('Workflow Integration Tests', () => {
  let app;
  let adminToken, keeper1Token, keeper2Token;
  let adminUser, keeper1User, keeper2User;
  let warehouse, category, supplier;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Seed users
    adminUser = await User.create({
      username: 'admin', password: 'admin123', realName: '系统管理员',
      email: 'admin@test.com', role: 'admin', status: true,
    });
    keeper1User = await User.create({
      username: 'keeper1', password: 'keeper123', realName: '仓库管理员1',
      email: 'keeper1@test.com', role: 'warehouse_keeper', status: true,
    });
    keeper2User = await User.create({
      username: 'keeper2', password: 'keeper123', realName: '仓库管理员2',
      email: 'keeper2@test.com', role: 'warehouse_keeper', status: true,
    });

    // Seed reference data
    warehouse = await Warehouse.create({
      name: '测试仓库', code: 'TEST', location: '测试地址', status: true, sort: 0,
    });
    category = await Category.create({
      name: '测试分类', code: 'TESTCAT', sort: 1,
    });
    supplier = await Supplier.create({
      name: '测试供应商', code: 'TESTSUP', contact: '测试联系人', phone: '13800138000', level: 'A',
    });

    // Build Express app with all needed routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../../backend/routes/auth'));
    app.use('/api/products', require('../../backend/routes/products'));
    app.use('/api/transactions', require('../../backend/routes/transactions'));
    app.use('/api/stocktake', require('../../backend/routes/stocktake'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ==================== 1. Login ====================
  describe('1. Login', () => {
    it('should login as admin and get token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('admin');
      adminToken = res.body.token;
    });

    it('should login as keeper1 and get token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'keeper1', password: 'keeper123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('warehouse_keeper');
      keeper1Token = res.body.token;
    });

    it('should login as keeper2 and get token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'keeper2', password: 'keeper123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      keeper2Token = res.body.token;
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(res.status).toBe(400);
    });
  });

  // ==================== 2. Create Product ====================
  let productId;

  describe('2. Create Product', () => {
    it('should create a product as admin', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '测试商品',
          sku: 'TEST-001',
          category: String(category.id),
          supplier: String(supplier.id),
          unit: '个',
          price: 100,
          costPrice: 60,
          minStock: 10,
          maxStock: 500,
          specification: '测试规格',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      productId = res.body.id;
    });

    it('should list the created product', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThanOrEqual(1);
      const found = res.body.products.find(p => p.sku === 'TEST-001');
      expect(found).toBeTruthy();
      expect(found.name).toBe('测试商品');
    });
  });

  // ==================== 3. Inbound ====================
  describe('3. Inbound (入库)', () => {
    it('should create inbound transaction and update inventory', async () => {
      const res = await request(app)
        .post('/api/transactions/inbound')
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({
          product: productId,
          warehouse: warehouse.id,
          quantity: 50,
          price: 60,
          remark: '首次入库',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('入库');
      expect(res.body.transaction).toBeTruthy();
    });

    it('should verify inventory was created with correct quantity', async () => {
      const inventory = await Inventory.findOne({
        where: { productId, warehouseId: warehouse.id },
      });

      expect(inventory).toBeTruthy();
      expect(inventory.quantity).toBe(50);
    });

    it('should create a second inbound and accumulate inventory', async () => {
      const res = await request(app)
        .post('/api/transactions/inbound')
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({
          product: productId,
          warehouse: warehouse.id,
          quantity: 30,
          price: 60,
          remark: '补货入库',
        });

      expect(res.status).toBe(201);

      const inventory = await Inventory.findOne({
        where: { productId, warehouseId: warehouse.id },
      });
      expect(inventory.quantity).toBe(80);
    });
  });

  // ==================== 4. Outbound ====================
  describe('4. Outbound (出库)', () => {
    it('should create outbound transaction and reduce inventory', async () => {
      const res = await request(app)
        .post('/api/transactions/outbound')
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({
          product: productId,
          warehouse: warehouse.id,
          quantity: 20,
          price: 100,
          remark: '领用出库',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('出库');
    });

    it('should verify inventory was reduced', async () => {
      const inventory = await Inventory.findOne({
        where: { productId, warehouseId: warehouse.id },
      });
      expect(inventory.quantity).toBe(60); // 80 - 20
    });

    it('should reject outbound when quantity exceeds stock', async () => {
      const res = await request(app)
        .post('/api/transactions/outbound')
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({
          product: productId,
          warehouse: warehouse.id,
          quantity: 999,
          price: 100,
        });

      expect(res.status).toBe(400);
    });
  });

  // ==================== 5. Stocktake ====================
  let stocktakeId;

  describe('5. Stocktake (盘库)', () => {
    it('should create a stocktake for the warehouse', async () => {
      const res = await request(app)
        .post('/api/stocktake')
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({
          title: '月度盘点',
          warehouse: warehouse.id,
          remark: '集成测试盘库',
        });

      expect(res.status).toBe(200);
      expect(res.body.stocktake).toBeTruthy();
      expect(res.body.stocktake.status).toBe('draft');
      expect(res.body.stocktake.items).toBeDefined();
      expect(res.body.stocktake.items.length).toBeGreaterThanOrEqual(1);

      stocktakeId = res.body.stocktake.id;
    });

    it('should update stocktake items with actual quantities', async () => {
      // Get the stocktake detail to find items
      const detail = await request(app)
        .get(`/api/stocktake/${stocktakeId}`)
        .set('Authorization', `Bearer ${keeper1Token}`);

      expect(detail.status).toBe(200);
      const items = detail.body.stocktake.items;
      expect(items.length).toBeGreaterThanOrEqual(1);

      // Set actual quantity = 58 (system is 60, so loss of 2)
      const updatedItems = items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        spec: item.spec || '',
        unit: item.unit,
        systemQuantity: item.systemQuantity,
        actualQuantity: 58,
        unitPrice: item.unitPrice,
      }));

      const res = await request(app)
        .put(`/api/stocktake/${stocktakeId}`)
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({ items: updatedItems });

      expect(res.status).toBe(200);
      expect(res.body.stocktake.items[0].actualQuantity).toBe(58);
      expect(res.body.stocktake.items[0].difference).toBe(-2);
    });

    it('should submit stocktake for confirmation', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/submit`)
        .set('Authorization', `Bearer ${keeper1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('提交');
    });

    it('should allow first confirmer (keeper1) to confirm', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/confirm`)
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({ remark: '第一次核实' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('第一核实人');
    });

    it('should reject same user as second confirmer', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/confirm`)
        .set('Authorization', `Bearer ${keeper1Token}`)
        .send({ remark: '尝试重复核实' });

      expect(res.status).toBe(400);
    });

    it('should allow second confirmer (keeper2) to confirm and complete stocktake', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/confirm`)
        .set('Authorization', `Bearer ${keeper2Token}`)
        .send({ remark: '第二次核实' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('盘库完成');
    });

    it('should verify inventory was updated after stocktake completion', async () => {
      const inventory = await Inventory.findOne({
        where: { productId, warehouseId: warehouse.id },
      });
      // Was 60, stocktake said actual 58, difference -2 → 60 + (-2) = 58
      expect(inventory.quantity).toBe(58);
    });

    it('should verify stocktake_loss transaction was created', async () => {
      const lossTransaction = await Transaction.findOne({
        where: { type: 'stocktake_loss', productId },
      });

      expect(lossTransaction).toBeTruthy();
      expect(lossTransaction.quantity).toBe(2); // absolute value of difference
      expect(lossTransaction.status).toBe('completed');
    });
  });

  // ==================== 6. Transaction History ====================
  describe('6. Transaction History', () => {
    it('should list all transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);

      // Should have: 2 inbound, 1 outbound, 1 stocktake_loss
      const types = res.body.transactions.map(t => t.type);
      expect(types.filter(t => t === 'in').length).toBe(2);
      expect(types.filter(t => t === 'out').length).toBe(1);
      expect(types.filter(t => t === 'stocktake_loss').length).toBe(1);
    });
  });
});
