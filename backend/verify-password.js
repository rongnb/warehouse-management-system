require('dotenv').config();
const { sequelize, User } = require('./models');

async function verifyPassword() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      console.log('❌ 未找到admin用户');
      return;
    }

    const isCorrect = await adminUser.comparePassword('123456');
    console.log(`🔐 密码验证: ${isCorrect ? '✅ 密码正确' : '❌ 密码错误'}`);

    if (isCorrect) {
      console.log('\n📋 可登录信息:');
      console.log('   用户名: admin');
      console.log('   密码: 123456');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifyPassword();
