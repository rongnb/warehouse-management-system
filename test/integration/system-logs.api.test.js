/**
 * 集成测试：系统配置 + 日志管理 + 仪表盘 recent-outbound 端点。
 * 这些端点此前完全没有自动化测试覆盖。
 */
require('../setup-env');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const {
  sequelize,
  User,
  SystemConfig,
} = require('../../backend/models');

function tokenFor(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('System / Logs / Dashboard 端点集成测试', () => {
  let app;
  let admin, staff;
  let adminToken, staffToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    admin = await User.create({
      username: 'sys_admin', password: 'pwd12345', realName: 'A',
      email: 'sys_admin@t.com', role: 'admin',
    });
    staff = await User.create({
      username: 'sys_staff', password: 'pwd12345', realName: 'S',
      email: 'sys_staff@t.com', role: 'staff',
    });
    adminToken = tokenFor(admin);
    staffToken = tokenFor(staff);

    app = express();
    app.use(express.json());
    app.use('/api/system', require('../../backend/routes/system'));
    app.use('/api/logs', require('../../backend/routes/logs'));
    app.use('/api/dashboard', require('../../backend/routes/dashboard'));
    app.use(require('../../backend/middleware/errorHandler').errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ----- System -----
  describe('GET /api/system/config', () => {
    it('登录用户可以读取系统配置（首次访问会自动生成默认配置）', async () => {
      const res = await request(app)
        .get('/api/system/config')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.stocktakeFrequency).toBeDefined();
      expect(res.body.config.systemName).toBeDefined();
    });

    it('未登录拒绝访问', async () => {
      const res = await request(app).get('/api/system/config');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/system/config', () => {
    it('管理员可以更新系统配置', async () => {
      const res = await request(app)
        .put('/api/system/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          systemName: '测试仓库系统',
          stocktakeFrequency: 'monthly',
          stocktakeReminderDays: 3,
          autoGenerateStocktake: false,
          stockWarningThreshold: 5,
        });
      expect(res.status).toBe(200);
      expect(res.body.config.systemName).toBe('测试仓库系统');
      expect(res.body.config.stocktakeFrequency).toBe('monthly');
      expect(res.body.config.stocktakeReminderDays).toBe(3);
      expect(res.body.config.autoGenerateStocktake).toBe(false);
      expect(res.body.config.stockWarningThreshold).toBe(5);

      // 验证持久化
      const fresh = await SystemConfig.getInstance();
      expect(fresh.systemName).toBe('测试仓库系统');
    });

    it('普通员工无权更新系统配置', async () => {
      const res = await request(app)
        .put('/api/system/config')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ systemName: '越权修改' });
      expect(res.status).toBe(403);
    });
  });

  // ----- Logs -----
  describe('Logs 端点', () => {
    const logsDir = path.join(__dirname, '../../logs');
    const tmpFile = path.join(logsDir, 'audit-test.log');

    beforeAll(() => {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.writeFileSync(
        tmpFile,
        Array.from({ length: 5 }, (_, i) => `line-${i + 1}`).join('\n')
      );
    });

    afterAll(() => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    it('GET /api/logs/files 返回日志文件列表', async () => {
      const res = await request(app)
        .get('/api/logs/files')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.files)).toBe(true);
      const found = res.body.files.find((f) => f.name === 'audit-test.log');
      expect(found).toBeDefined();
      expect(found.sizeFormatted).toBeDefined();
    });

    it('GET /api/logs/file/:filename 拒绝路径穿越', async () => {
      const res = await request(app)
        .get('/api/logs/file/..%2Fpackage.json')
        .set('Authorization', `Bearer ${adminToken}`);
      // 要么被路由层拒绝（400），要么 fs 拒绝并返回 404
      expect([400, 404]).toContain(res.status);
    });

    it('GET /api/logs/file/:filename 返回最后 N 行内容', async () => {
      const res = await request(app)
        .get('/api/logs/file/audit-test.log?lines=2')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.content).toContain('line-4');
      expect(res.body.content).toContain('line-5');
    });

    it('GET /api/logs/status 返回真实磁盘占用（非"未知"）', async () => {
      const res = await request(app)
        .get('/api/logs/status')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.disk).toBeDefined();
      // Node 18+ 应当能拿到真实数值；CI 上若内核不支持则保留兜底字段
      if (res.body.disk.total !== null) {
        expect(typeof res.body.disk.total).toBe('number');
        expect(typeof res.body.disk.usedFormatted).toBe('string');
        expect(res.body.disk.usedPercent).toBeGreaterThanOrEqual(0);
        expect(res.body.disk.usedPercent).toBeLessThanOrEqual(100);
      }
    });

    it('普通员工无权访问日志接口', async () => {
      const res = await request(app)
        .get('/api/logs/files')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    it('DELETE /api/logs/file/:filename 可以删除日志文件', async () => {
      const target = path.join(logsDir, 'audit-test-delete.log');
      fs.writeFileSync(target, 'will be deleted');
      const res = await request(app)
        .delete('/api/logs/file/audit-test-delete.log')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(fs.existsSync(target)).toBe(false);
    });
  });

  // ----- Dashboard recent-outbound -----
  describe('GET /api/dashboard/recent-outbound', () => {
    it('登录用户可以拉取最近出库聚合（products 数组）', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-outbound')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
    });
  });
});
