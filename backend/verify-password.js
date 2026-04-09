const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// 引入模型
const User = require('./models/User');

async function verifyPassword() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    // 查找admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('❌ 未找到admin用户');
      return;
    }

    // 验证密码
    const isCorrect = await bcrypt.compare('123456', adminUser.password);
    console.log(`🔐 密码验证: ${isCorrect ? '✅ 密码正确' : '❌ 密码错误'}`);

    if (isCorrect) {
      console.log('\n📋 可登录信息:');
      console.log('   用户名: admin');
      console.log('   密码: 123456');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifyPassword();
