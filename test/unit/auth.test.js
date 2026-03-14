const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    // 清空用户集合
    await User.deleteMany({});
    
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    await User.create({
      username: 'test_admin',
      password: hashedPassword,
      realName: '测试管理员',
      email: 'test@example.com',
      role: 'admin'
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该返回400错误当用户名或密码为空', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: '' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码不能为空');
    });

    it('应该返回400错误当用户名不存在', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: '123456' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('应该返回400错误当密码错误', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_admin', password: 'wrongpassword' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('应该登录成功并返回token当用户名和密码正确', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_admin', password: '123456' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('登录成功');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('test_admin');
      expect(res.body.user.role).toBe('admin');

      // 验证token有效性
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'your-secret-key');
      expect(decoded.userId).toBeDefined();
      expect(decoded.username).toBe('test_admin');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('应该返回401错误当没有提供token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.statusCode).toBe(401);
    });

    it('应该返回401错误当token无效', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toBe(401);
    });

    it('应该返回用户信息当token有效', async () => {
      // 先登录获取token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_admin', password: '123456' });
      
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user.username).toBe('test_admin');
      expect(res.body.user.realName).toBe('测试管理员');
      expect(res.body.user.email).toBe('test@example.com');
    });
  });
});
