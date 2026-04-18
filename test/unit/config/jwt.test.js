describe('config/jwt - JWT secret enforcement', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = ORIGINAL_SECRET;
    }
    delete global.__JWT_SECRET_WARNED__;
    jest.resetModules();
  });

  it('使用 process.env.JWT_SECRET 当其存在', () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    const { getJwtSecret } = require('../../../backend/config/jwt');
    expect(getJwtSecret()).toBe('unit-test-secret');
  });

  it('在 production 环境下若未设置 JWT_SECRET 必须抛错（拒绝启动）', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    const { getJwtSecret } = require('../../../backend/config/jwt');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('在非 production 环境下未设置 JWT_SECRET 时回退到默认值并打印告警（仅一次）', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const { getJwtSecret } = require('../../../backend/config/jwt');
    const v1 = getJwtSecret();
    const v2 = getJwtSecret();
    expect(typeof v1).toBe('string');
    expect(v1.length).toBeGreaterThan(20);
    expect(v2).toBe(v1);
    expect(global.__JWT_SECRET_WARNED__).toBe(true);
  });
});
