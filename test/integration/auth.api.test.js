require('../setup-env');
const express = require('express');
const request = require('supertest');
const { sequelize, User } = require('../../backend/models');

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    await User.create({
      username: 'admin',
      password: 'admin123',
      realName: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../../backend/routes/auth'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with token for correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user).toBeDefined();
      expect(typeof res.body.user.id).toBe('number');
      expect(res.body.user.username).toBe('admin');
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      token = res.body.token;
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });

    it('should return 200 with user info when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('admin');
    });
  });
});
