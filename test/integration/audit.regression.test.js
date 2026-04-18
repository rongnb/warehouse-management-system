/**
 * 多 Agent 审计后的回归测试。
 * 覆盖：
 *  1. 库存转移流程（验证 Transaction.type 'transfer' 已加入 ENUM）
 *  2. 盘库 submit/confirm/cancel/update 的 RBAC 权限校验
 *  3. transactions PUT /:id 的 RBAC 权限校验
 */
require('../setup-env');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  sequelize,
  User,
  Product,
  Category,
  Supplier,
  Warehouse,
  Inventory,
  Transaction,
  Stocktake,
  StocktakeItem,
} = require('../../backend/models');

function tokenFor(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('审计回归测试 - 多 Agent 修复验证', () => {
  let app;
  let admin, manager, staff;
  let adminToken, managerToken, staffToken;
  let product, srcWarehouse, dstWarehouse;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    admin = await User.create({
      username: 'audit_admin', password: 'pwd12345', realName: 'A',
      email: 'audit_admin@t.com', role: 'admin',
    });
    manager = await User.create({
      username: 'audit_manager', password: 'pwd12345', realName: 'M',
      email: 'audit_manager@t.com', role: 'manager',
    });
    staff = await User.create({
      username: 'audit_staff', password: 'pwd12345', realName: 'S',
      email: 'audit_staff@t.com', role: 'staff',
    });
    adminToken = tokenFor(admin);
    managerToken = tokenFor(manager);
    staffToken = tokenFor(staff);

    const cat = await Category.create({ name: '审计分类', code: 'AUDIT_CAT' });
    const sup = await Supplier.create({
      name: '审计供应商', code: 'AUDIT_SUP', contact: 'C', phone: '13800000000', level: 'A',
    });
    product = await Product.create({
      name: '审计商品', sku: 'AUDIT_SKU_1', unit: '个',
      categoryId: cat.id, supplierId: sup.id, price: 10, cost: 5,
    });
    srcWarehouse = await Warehouse.create({ name: '源仓', code: 'AUDIT_WH_S', location: 'L1' });
    dstWarehouse = await Warehouse.create({ name: '目标仓', code: 'AUDIT_WH_D', location: 'L2' });

    await Inventory.create({
      productId: product.id,
      warehouseId: srcWarehouse.id,
      quantity: 100,
      updatedBy: admin.id,
    });

    app = express();
    app.use(express.json());
    app.use('/api/inventory', require('../../backend/routes/inventory'));
    app.use('/api/stocktake', require('../../backend/routes/stocktake'));
    app.use('/api/transactions', require('../../backend/routes/transactions'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ---------------------------------------------------------------
  // 1. 库存转移：以前会因为 Transaction.type ENUM 不含 'transfer' 报错
  // ---------------------------------------------------------------
  describe('POST /api/inventory/transfer', () => {
    it('管理员可以执行库存转移并生成 type=transfer 的流水', async () => {
      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: product.id,
          fromWarehouse: srcWarehouse.id,
          toWarehouse: dstWarehouse.id,
          quantity: 20,
          remark: '审计回归',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('库存转移成功');

      // 验证库存确实转移
      const src = await Inventory.findOne({
        where: { productId: product.id, warehouseId: srcWarehouse.id },
      });
      const dst = await Inventory.findOne({
        where: { productId: product.id, warehouseId: dstWarehouse.id },
      });
      expect(src.quantity).toBe(80);
      expect(dst.quantity).toBe(20);

      // 验证 transfer 类型的 Transaction 已写入数据库
      const txs = await Transaction.findAll({ where: { type: 'transfer' } });
      expect(txs.length).toBeGreaterThanOrEqual(1);
    });

    it('普通员工无权执行库存转移', async () => {
      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: product.id,
          fromWarehouse: srcWarehouse.id,
          toWarehouse: dstWarehouse.id,
          quantity: 1,
        });
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // 2. 盘库 RBAC：以前 submit/confirm/cancel/update 只校验登录，未校验角色
  // ---------------------------------------------------------------
  describe('Stocktake RBAC', () => {
    let stocktakeId;

    beforeAll(async () => {
      const st = await Stocktake.create({
        title: '审计盘库',
        warehouseId: srcWarehouse.id,
        warehouseName: srcWarehouse.name,
        status: 'draft',
        createdBy: admin.id,
        startTime: new Date(),
      });
      await StocktakeItem.create({
        stocktakeId: st.id,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        productSku: product.sku,
        systemQuantity: 80,
        actualQuantity: 80,
        unitPrice: 10,
        difference: 0,
        differenceType: 'none',
        totalAmount: 0,
      });
      stocktakeId = st.id;
    });

    it('普通员工无权更新盘库单', async () => {
      const res = await request(app)
        .put(`/api/stocktake/${stocktakeId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ items: [] });
      expect(res.status).toBe(403);
    });

    it('普通员工无权提交盘库单', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/submit`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('普通员工无权取消盘库单', async () => {
      const res = await request(app)
        .post(`/api/stocktake/${stocktakeId}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ reason: '测试' });
      expect(res.status).toBe(403);
    });

    it('manager 可以提交，staff 不能 confirm', async () => {
      const submitRes = await request(app)
        .post(`/api/stocktake/${stocktakeId}/submit`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});
      expect(submitRes.status).toBe(200);

      const confirmRes = await request(app)
        .post(`/api/stocktake/${stocktakeId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ remark: '试图越权' });
      expect(confirmRes.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // 3. transactions PUT /:id RBAC：以前任何登录用户都能改流水
  // ---------------------------------------------------------------
  describe('PUT /api/transactions/:id RBAC', () => {
    let txId;

    beforeAll(async () => {
      const tx = await Transaction.create({
        type: 'in',
        productId: product.id,
        warehouseId: srcWarehouse.id,
        quantity: 5,
        price: 10,
        unitPrice: 10,
        operator: admin.id,
        createdBy: admin.id,
        status: 'completed',
      });
      txId = tx.id;
    });

    it('普通员工无权更新交易记录', async () => {
      const res = await request(app)
        .put(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ remark: '越权改动' });
      expect(res.status).toBe(403);
    });

    it('管理员可以更新交易记录', async () => {
      const res = await request(app)
        .put(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ remark: '审计修订' });
      expect(res.status).toBe(200);
      expect(res.body.transaction.remark).toBe('审计修订');
    });
  });
});
