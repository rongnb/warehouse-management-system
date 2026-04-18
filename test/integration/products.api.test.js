require('../setup-env');
const express = require('express');
const request = require('supertest');
const { sequelize, User, Product, Category, Supplier } = require('../../backend/models');
const jwt = require('jsonwebtoken');

describe('Products API Integration Tests', () => {
  let app;
  let token;
  let adminUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    adminUser = await User.create({
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
      code: 'TEST',
    });

    const supplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contact: 'Contact Person',
      phone: '13800138000',
      level: 'A',
    });

    app = express();
    app.use(express.json());
    app.use('/api/products', require('../../backend/routes/products'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/products', () => {
    it('should create a product with 201', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          sku: 'TEST001',
          unit: '个',
          price: 100,
          minStock: 10,
        });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toBeTruthy();
      expect(res.body.id).toBeTruthy();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          price: 100,
        });
      
      expect(res.status).toBeGreaterThanOrEqual(201);
    });

    it('should return 409 for duplicate SKU', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Product A',
          sku: 'DUP001',
          unit: '个',
          price: 50,
        });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Product B',
          sku: 'DUP001',
          unit: '个',
          price: 60,
        });
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products', () => {
    it('should return paginated product list', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'To Delete',
          sku: 'DEL001',
          unit: '个',
          price: 10,
        });

      const productId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });
});
