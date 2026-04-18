require('dotenv').config();
const { sequelize, User, Product } = require('./models');

async function checkUsers() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const existingUsers = await User.findAll({
      attributes: ['id', 'username', 'realName', 'role'],
    });
    
    console.log(`\n📊 现有用户 (${existingUsers.length}个):`);
    existingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} - ${user.realName} (${user.role})`);
    });

    if (existingUsers.length === 0) {
      console.log('\n🔧 未找到用户，正在创建初始用户...');
      
      const admin = await User.create({
        username: 'admin',
        password: '123456',
        realName: '系统管理员',
        email: 'admin@example.com',
        phone: '13800138000',
        role: 'admin',
      });
      
      console.log('✅ 管理员用户创建成功');
      console.log('\n📋 默认账号密码:');
      console.log('   用户名: admin');
      console.log('   密码: 123456');
    } else {
      console.log('\n✅ 用户已存在，无需创建');

      const adminUser = await User.findOne({ where: { username: 'admin' } });
      if (adminUser) {
        const isCorrectPassword = await adminUser.comparePassword('123456');
        console.log(`\n🔐 admin用户密码检查: ${isCorrectPassword ? '是 123456' : '不是 123456'}`);
        if (isCorrectPassword) {
          console.log('✅ 可以使用 admin / 123456 登录');
        } else {
          console.log('⚠️  当前密码不是默认密码');
        }
      }
    }

    const productCount = await Product.count();
    console.log(`\n📦 商品数量: ${productCount}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkUsers();
