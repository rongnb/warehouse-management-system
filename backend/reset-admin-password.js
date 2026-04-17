require('dotenv').config();
const { sequelize, User } = require('./models');

async function resetAdminPassword() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      console.log('❌ 未找到admin用户');
      return;
    }

    adminUser.password = '123456';
    await adminUser.save();
    console.log('✅ 密码重置成功');

    console.log('\n📋 管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: 123456');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

resetAdminPassword();
