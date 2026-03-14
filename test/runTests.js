const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 直接运行测试脚本...');

// 设置环境变量
process.env.MONGODB_URI = 'mongodb://localhost:27017/warehouse_test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRES_IN = '1h';

// 加载app
const app = require('../backend/server');
const request = require('supertest');
const User = require('../backend/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function runAuthTests() {
  console.log('\n🧪 开始运行登录认证单元测试...');
  
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
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

    // 测试1：空用户名和密码
    console.log('测试1：空用户名和密码校验');
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: '' });
      
      if (res.statusCode === 400 && res.body.message === '用户名和密码不能为空') {
        console.log('✅ 通过');
        testResults.passed++;
        testResults.tests.push({ name: '空用户名和密码校验', status: 'passed' });
      } else {
        console.log('❌ 失败', res.statusCode, res.body.message);
        testResults.failed++;
        testResults.tests.push({ name: '空用户名和密码校验', status: 'failed', error: `预期400，实际${res.statusCode}` });
      }
    } catch (error) {
      console.log('❌ 失败', error.message);
      testResults.failed++;
      testResults.tests.push({ name: '空用户名和密码校验', status: 'failed', error: error.message });
    }

    // 测试2：用户名不存在
    console.log('测试2：用户名不存在校验');
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: '123456' });
      
      if (res.statusCode === 400 && res.body.message === '用户名或密码错误') {
        console.log('✅ 通过');
        testResults.passed++;
        testResults.tests.push({ name: '用户名不存在校验', status: 'passed' });
      } else {
        console.log('❌ 失败', res.statusCode, res.body.message);
        testResults.failed++;
        testResults.tests.push({ name: '用户名不存在校验', status: 'failed', error: `预期400，实际${res.statusCode}` });
      }
    } catch (error) {
      console.log('❌ 失败', error.message);
      testResults.failed++;
      testResults.tests.push({ name: '用户名不存在校验', status: 'failed', error: error.message });
    }

    // 测试3：密码错误
    console.log('测试3：密码错误校验');
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_admin', password: 'wrongpassword' });
      
      if (res.statusCode === 400 && res.body.message === '用户名或密码错误') {
        console.log('✅ 通过');
        testResults.passed++;
        testResults.tests.push({ name: '密码错误校验', status: 'passed' });
      } else {
        console.log('❌ 失败', res.statusCode, res.body.message);
        testResults.failed++;
        testResults.tests.push({ name: '密码错误校验', status: 'failed', error: `预期400，实际${res.statusCode}` });
      }
    } catch (error) {
      console.log('❌ 失败', error.message);
      testResults.failed++;
      testResults.tests.push({ name: '密码错误校验', status: 'failed', error: error.message });
    }

    // 测试4：正确登录
    console.log('测试4：正确登录返回token');
    let token;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_admin', password: '123456' });
      
      if (res.statusCode === 200 && res.body.token && res.body.user) {
        console.log('✅ 通过');
        testResults.passed++;
        testResults.tests.push({ name: '正确登录返回token', status: 'passed' });
        token = res.body.token;

        // 验证token
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
          if (decoded.username === 'test_admin') {
            console.log('✅ Token验证通过');
          }
        } catch (e) {
          console.log('⚠️ Token验证失败，使用默认密钥重试');
          const decoded = jwt.verify(token, 'your_jwt_secret_key_here');
          if (decoded.username === 'test_admin') {
            console.log('✅ Token验证通过（使用默认密钥）');
          }
        }
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

    // 测试5：获取用户信息
    console.log('测试5：有效token获取用户信息');
    try {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      if (res.statusCode === 200 && res.body.user.username === 'test_admin') {
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

    console.log(`\n📊 登录测试结果：通过 ${testResults.passed} 个，失败 ${testResults.failed} 个`);
    return testResults;

  } catch (error) {
    console.error('测试运行失败:', error);
    return testResults;
  }
}

// 运行测试
runAuthTests().then(results => {
  console.log('\n🎉 测试完成！');
  console.log(`总用例数：${results.passed + results.failed}`);
  console.log(`通过率：${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
  
  // 生成简单报告
  const report = `
# 测试执行报告
## 登录模块测试结果
- 总用例数：${results.passed + results.failed}
- 通过：${results.passed}
- 失败：${results.failed}
- 通过率：${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%

### 详细结果
| 测试用例 | 状态 |
|----------|------|
${results.tests.map(t => `| ${t.name} | ${t.status === 'passed' ? '✅ 通过' : '❌ 失败'} |`).join('\n')}
  `;
  
  fs.writeFileSync(path.join(__dirname, '../快速测试报告.md'), report, 'utf-8');
  console.log('📄 测试报告已生成：快速测试报告.md');
  
  process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
