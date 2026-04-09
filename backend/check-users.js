const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// 引入模型
const User = require('./models/User');
const Product = require('./models/Product');

async function checkAndCreateUsers() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    // 检查现有用户
    const existingUsers = await User.find({}, 'username realName role');
    console.log(`\n📊 现有用户 (${existingUsers.length}个):`);
    existingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} - ${user.realName} (${user.role})`);
    });

    // 如果没有用户，创建初始用户
    if (existingUsers.length === 0) {
      console.log('\n🔧 未找到用户，正在创建初始用户...');

      const adminPassword = await bcrypt.hash('123456', 10);

      const admin = new User({
        username: 'admin',
        password: adminPassword,
        realName: '系统管理员',
        email: 'admin@example.com',
        phone: '13800138000',
        role: 'admin',
      });
      await admin.save();
      console.log('✅ 管理员用户创建成功');

      console.log('\n📋 默认账号密码:');
      console.log('   用户名: admin');
      console.log('   密码: 123456');
    } else {
      console.log('\n✅ 用户已存在，无需创建');

      // 检查admin用户密码是否是123456
      const adminUser = await User.findOne({ username: 'admin' });
      if (adminUser) {
        const isCorrectPassword = await bcrypt.compare('123456', adminUser.password);
        console.log(`\n🔐 admin用户密码检查: ${isCorrectPassword ? '是 123456' : '不是 123456'}`);
        if (isCorrectPassword) {
          console.log('✅ 可以使用 admin / 123456 登录');
        } else {
          console.log('⚠️  当前密码不是默认密码');
        }
      }
    }

    // 检查商品数量
    const productCount = await Product.countDocuments();
    console.log(`\n📦 商品数量: ${productCount}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkAndCreateUsers();
