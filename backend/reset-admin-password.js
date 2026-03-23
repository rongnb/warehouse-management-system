const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// 引入模型
const User = require('./models/User');

async function resetAdminPassword() {
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

    // 重置密码为123456
    const newPassword = await bcrypt.hash('123456', 10);
    adminUser.password = newPassword;
    await adminUser.save();
    console.log('✅ 密码重置成功');

    console.log('\n📋 管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: 123456');
    console.log('   邮箱: admin@example.com');
    console.log('   电话: 13800138000');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

resetAdminPassword();
