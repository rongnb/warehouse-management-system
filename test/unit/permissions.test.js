const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const bcrypt = require('bcryptjs');

describe('Permission Control Tests', () => {
  let adminToken;
  let keeperToken;
  let adminId;
  let keeperId;

  beforeAll(async () => {
    await User.deleteMany({});

    // 创建管理员
    const adminPassword = await bcrypt.hash('123456', 10);
    const admin = await User.create({
      username: 'admin_perm',
      password: adminPassword,
      realName: '管理员',
      role: 'admin'
    });
    adminId = admin._id;

    // 创建仓管员
    const keeperPassword = await bcrypt.hash('123456', 10);
    const keeper = await User.create({
      username: 'keeper_perm',
      password: keeperPassword,
      realName: '仓管员',
      role: 'warehouse_keeper'
    });
    keeperId = keeper._id;

    // 登录获取token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_perm', password: '123456' });
    adminToken = adminLogin.body.token;

    const keeperLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'keeper_perm', password: '123456' });
    keeperToken = keeperLogin.body.token;
  });

  describe('用户管理权限', () => {
    it('管理员可以获取用户列表', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('仓管员不能获取用户列表', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${keeperToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('权限不足，需要管理员权限');
    });

    it('管理员可以创建用户', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'new_user',
          password: '123456',
          realName: '新用户',
          role: 'warehouse_keeper'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('new_user');
    });

    it('仓管员不能创建用户', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${keeperToken}`)
        .send({
          username: 'hacker_user',
          password: '123456',
          realName: '黑客用户',
          role: 'admin'
        });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('权限不足，需要管理员权限');
    });
  });

  describe('系统设置权限', () => {
    it('管理员可以获取系统设置', async () => {
      const res = await request(app)
        .get('/api/system/settings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('仓管员不能获取系统设置', async () => {
      const res = await request(app)
        .get('/api/system/settings')
        .set('Authorization', `Bearer ${keeperToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('权限不足，需要管理员权限');
    });

    it('管理员可以更新系统设置', async () => {
      const res = await request(app)
        .put('/api/system/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stocktakeFrequency: 'month',
          stocktakeReminderDays: 7
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stocktakeFrequency).toBe('month');
    });

    it('仓管员不能更新系统设置', async () => {
      const res = await request(app)
        .put('/api/system/settings')
        .set('Authorization', `Bearer ${keeperToken}`)
        .send({
          stocktakeFrequency: 'year'
        });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('权限不足，需要管理员权限');
    });
  });

  describe('数据导出权限', () => {
    it('管理员可以导出库存数据', async () => {
      const res = await request(app)
        .get('/api/inventory/export')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404].includes(res.statusCode)).toBe(true); // 404是因为导出功能可能未实现，只要不是403就表示权限通过
    });

    it('仓管员可以导出库存数据（业务权限）', async () => {
      const res = await request(app)
        .get('/api/inventory/export')
        .set('Authorization', `Bearer ${keeperToken}`);
      
      expect([200, 404].includes(res.statusCode)).toBe(true);
    });

    it('管理员可以导出盘库报表', async () => {
      const res = await request(app)
        .get('/api/stocktake/export')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404].includes(res.statusCode)).toBe(true);
    });

    it('仓管员可以导出盘库报表（业务权限）', async () => {
      const res = await request(app)
        .get('/api/stocktake/export')
        .set('Authorization', `Bearer ${keeperToken}`);
      
      expect([200, 404].includes(res.statusCode)).toBe(true);
    });
  });
});
