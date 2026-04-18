require('../setup-env');
const express = require('express');
const request = require('supertest');
const {
  sequelize,
  User,
  Product,
  Category,
  Supplier,
  Warehouse,
  Transaction,
} = require('../../backend/models');
const jwt = require('jsonwebtoken');

describe('Reports API Integration Tests', () => {
  let app;
  let token;
  let warehouse;
  let product1, product2;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123',
      realName: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
    });

    token = jwt.sign(
      { userId: adminUser.id, username: adminUser.username, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const category = await Category.create({
      name: 'Test Category',
      code: 'CAT001',
    });

    const supplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contact: 'Contact',
      phone: '13800138000',
      level: 'A',
    });

    warehouse = await Warehouse.create({
      name: 'Test Warehouse',
      code: 'WH001',
      address: 'Test Address',
      status: true,
    });

    product1 = await Product.create({
      name: 'Product 1',
      sku: 'SKU001',
      categoryId: category.id,
      supplierId: supplier.id,
      unit: '个',
      price: 100,
      minStock: 10,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    });

    product2 = await Product.create({
      name: 'Product 2',
      sku: 'SKU002',
      categoryId: category.id,
      supplierId: supplier.id,
      unit: '个',
      price: 200,
      minStock: 5,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    });

    const Inventory = require('../../backend/models').Inventory;
    
    await Inventory.create({
      productId: product1.id,
      warehouseId: warehouse.id,
      quantity: 100,
      updatedBy: adminUser.id,
    });

    await Inventory.create({
      productId: product2.id,
      warehouseId: warehouse.id,
      quantity: 50,
      updatedBy: adminUser.id,
    });

    await Transaction.create({
      transactionNo: 'TR001',
      type: 'in',
      productId: product1.id,
      warehouseId: warehouse.id,
      supplierId: supplier.id,
      quantity: 100,
      price: 100,
      operator: adminUser.id,
      createdBy: adminUser.id,
      status: 'completed',
    });

    await Transaction.create({
      transactionNo: 'TR002',
      type: 'in',
      productId: product2.id,
      warehouseId: warehouse.id,
      supplierId: supplier.id,
      quantity: 50,
      price: 200,
      operator: adminUser.id,
      createdBy: adminUser.id,
      status: 'completed',
    });

    app = express();
    app.use(express.json());
    app.use('/api/reports', require('../../backend/routes/reports'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/reports', () => {
    it('should return list of available reports', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.reports).toBeDefined();
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.reports.length).toBe(6);
      
      const report = res.body.reports[0];
      expect(report.id).toBeTruthy();
      expect(report.name).toBeTruthy();
      expect(Array.isArray(report.columns)).toBe(true);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should export inventory report as CSV', async () => {
      const res = await request(app)
        .get('/api/reports/inventory?format=csv')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/csv/);
      
      const body = res.text;
      expect(body.startsWith('\uFEFF')).toBe(true);
      expect(body).toContain('SKU001');
    });

    it('should export inventory report as Excel', async () => {
      const res = await request(app)
        .get('/api/reports/inventory?format=excel')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.body).toBeTruthy();
    });

    it('should return 400 for unknown report ID', async () => {
      const res = await request(app)
        .get('/api/reports/nonexistent')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should apply filters correctly', async () => {
      const res = await request(app)
        .get(`/api/reports/inventory?format=csv&warehouse=${warehouse.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      const body = res.text;
      expect(body).toContain('SKU001');
      expect(body).toContain('SKU002');
    });
  });
});
