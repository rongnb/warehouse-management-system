const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const baseUrl = 'http://localhost:3000';

console.log('🚀 开始API测试...');

async function runApiTests() {
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  let adminToken;

  // 测试1：登录接口 - 空用户名密码
  console.log('\n测试1：登录接口 - 空用户名密码');
  try {
    const res = await request(baseUrl)
      .post('/api/auth/login')
      .send({ username: '', password: '' });
    
    if (res.statusCode === 400 && res.body.message === '用户名和密码不能为空') {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '空用户名密码校验', status: 'passed' });
    } else {
      console.log('❌ 失败', res.statusCode, res.body.message);
      testResults.failed++;
      testResults.tests.push({ name: '空用户名密码校验', status: 'failed', error: `预期400，实际${res.statusCode}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '空用户名密码校验', status: 'failed', error: error.message });
  }

  // 测试2：登录接口 - 错误密码
  console.log('\n测试2：登录接口 - 错误密码');
  try {
    const res = await request(baseUrl)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    
    if (res.statusCode === 400 && res.body.message === '用户名或密码错误') {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '错误密码校验', status: 'passed' });
    } else {
      console.log('❌ 失败', res.statusCode, res.body.message);
      testResults.failed++;
      testResults.tests.push({ name: '错误密码校验', status: 'failed', error: `预期400，实际${res.statusCode}: ${res.body.message}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '错误密码校验', status: 'failed', error: error.message });
  }

  // 测试3：登录接口 - 正确登录
  console.log('\n测试3：登录接口 - 正确登录');
  try {
    const res = await request(baseUrl)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    
    if (res.statusCode === 200 && res.body.token && res.body.user) {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '正确登录返回token', status: 'passed' });
      adminToken = res.body.token;
      console.log('👤 登录用户:', res.body.user.realName, '角色:', res.body.user.role);
    } else {
      console.log('❌ 失败', res.statusCode, res.body);
      testResults.failed++;
      testResults.tests.push({ name: '正确登录返回token', status: 'failed', error: `预期200和token，实际${res.statusCode}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '正确登录返回token', status: 'failed', error: error.message });
  }

  // 测试4：获取用户信息
  console.log('\n测试4：获取用户信息接口');
  try {
    const res = await request(baseUrl)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (res.statusCode === 200 && res.body.user.username === 'admin') {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '有效token获取用户信息', status: 'passed' });
    } else {
      console.log('❌ 失败', res.statusCode, res.body);
      testResults.failed++;
      testResults.tests.push({ name: '有效token获取用户信息', status: 'failed', error: `预期200和用户信息，实际${res.statusCode}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '有效token获取用户信息', status: 'failed', error: error.message });
  }

  // 测试5：权限控制 - 管理员获取用户列表
  console.log('\n测试5：权限控制 - 管理员获取用户列表');
  try {
    const res = await request(baseUrl)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (res.statusCode === 200) {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '管理员获取用户列表', status: 'passed' });
      console.log('👥 用户数量:', Array.isArray(res.body.data) ? res.body.data.length : '未知');
    } else {
      console.log('❌ 失败', res.statusCode, res.body.message);
      testResults.failed++;
      testResults.tests.push({ name: '管理员获取用户列表', status: 'failed', error: `预期200，实际${res.statusCode}: ${res.body.message}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '管理员获取用户列表', status: 'failed', error: error.message });
  }

  // 测试6：盘库列表接口
  console.log('\n测试6：盘库列表接口');
  try {
    const res = await request(baseUrl)
      .get('/api/stocktake')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (res.statusCode === 200) {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '获取盘库列表', status: 'passed' });
    } else {
      console.log('❌ 失败', res.statusCode, res.body.message);
      testResults.failed++;
      testResults.tests.push({ name: '获取盘库列表', status: 'failed', error: `预期200，实际${res.statusCode}: ${res.body.message}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '获取盘库列表', status: 'failed', error: error.message });
  }

  // 测试7：库存列表接口
  console.log('\n测试7：库存列表接口');
  try {
    const res = await request(baseUrl)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (res.statusCode === 200) {
      console.log('✅ 通过');
      testResults.passed++;
      testResults.tests.push({ name: '获取库存列表', status: 'passed' });
    } else {
      console.log('❌ 失败', res.statusCode, res.body.message);
      testResults.failed++;
      testResults.tests.push({ name: '获取库存列表', status: 'failed', error: `预期200，实际${res.statusCode}: ${res.body.message}` });
    }
  } catch (error) {
    console.log('❌ 失败', error.message);
    testResults.failed++;
    testResults.tests.push({ name: '获取库存列表', status: 'failed', error: error.message });
  }

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果统计');
  console.log('='.repeat(50));
  console.log(`总测试用例: ${testResults.passed + testResults.failed}`);
  console.log(`通过: ${testResults.passed} 个 ✅`);
  console.log(`失败: ${testResults.failed} 个 ❌`);
  console.log(`通过率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  console.log('='.repeat(50));

  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试用例:');
    testResults.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`- ${t.name}: ${t.error}`);
    });
  }

  // 生成测试报告
  const report = `# 仓库管理系统API测试报告
## 📅 测试时间: ${new Date().toLocaleString('zh-CN')}
## 🌐 测试环境: 本地环境 (后端3000端口，前端5176端口)

## 📈 测试概览
| 指标 | 数值 |
|------|------|
| 总测试用例 | ${testResults.passed + testResults.failed} |
| 通过用例 | ${testResults.passed} |
| 失败用例 | ${testResults.failed} |
| 通过率 | ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}% |

## 🧪 详细测试结果
| 测试用例 | 状态 | 错误信息 |
|----------|------|----------|
${testResults.tests.map(t => `| ${t.name} | ${t.status === 'passed' ? '✅ 通过' : '❌ 失败'} | ${t.error || ''} |`).join('\n')}

## 🎯 测试结论
${testResults.failed === 0 ? '✅ 所有API测试通过，核心功能正常运行' : `⚠️ 存在${testResults.failed}个测试失败，需要进一步排查`}
`;

  require('fs').writeFileSync('/home/lam/.openclaw/workspace/warehouse-management/API测试报告.md', report, 'utf-8');
  console.log('\n📄 API测试报告已生成: API测试报告.md');

  return testResults;
}

// 执行测试
runApiTests()
  .then(results => process.exit(results.failed === 0 ? 0 : 1))
  .catch(error => {
    console.error('测试执行异常:', error);
    process.exit(1);
  });
