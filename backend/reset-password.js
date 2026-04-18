require('dotenv').config();
const { sequelize, User } = require('./models');

async function resetPasswords() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const newPassword = '123456';
    const users = await User.findAll();
    console.log('找到 ' + users.length + ' 个用户');

    for (const user of users) {
      user.password = newPassword;
      await user.save();
      console.log('✅ 用户 ' + user.username + ' (' + user.realName + ') 密码已重置为: ' + newPassword);
    }

    console.log('\n🎉 所有用户密码已成功重置!');
    console.log('\n可用账号:');
    console.log('  - admin / 123456');

  } catch (error) {
    console.error('❌ 密码重置失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

resetPasswords();
