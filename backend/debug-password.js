const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';

async function debugPasswordVerification() {
  try {
    console.log('🚀 调试密码验证问题...');

    // 连接数据库
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');

    // 查找admin用户
    const user = await User.findOne({ username: 'admin' });
    if (!user) {
      console.log('❌ 未找到admin用户');
      return;
    }

    console.log('📋 用户信息:');
    console.log(`   用户名: ${user.username}`);
    console.log(`   密码字段类型: ${typeof user.password}`);
    console.log(`   密码长度: ${user.password.length}`);

    // 调试密码比较
    const testPasswords = [
      '123456',
      '1234567',
      'admin123',
      ''
    ];

    console.log('\n🔍 密码验证测试:');
    for (const password of testPasswords) {
      const startTime = Date.now();
      try {
        const isMatch = await user.comparePassword(password);
        const duration = Date.now() - startTime;
        console.log(`   ${password} → ${isMatch ? '✅' : '❌'} (${duration}ms)`);

        if (isMatch) {
          console.log(`✅ 密码验证成功！可以使用 "${password}" 登录`);
          console.log(`📦 密码哈希值: ${user.password}`);
        }
      } catch (error) {
        console.log(`   ${password} → ❌ 比较时出错: ${error}`);
      }
    }

    // 测试密码重新加密
    console.log('\n🔐 测试密码重新加密...');
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`新密码哈希值: ${hashedPassword}`);
    console.log(`存储的哈希值: ${user.password}`);

    // 直接比较哈希值
    const hashMatch = user.password === hashedPassword;
    console.log(`哈希值直接比较: ${hashMatch}`);

  } catch (error) {
    console.error('❌ 调试过程出错:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

debugPasswordVerification();
