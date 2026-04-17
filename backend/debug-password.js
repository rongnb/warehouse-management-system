require('dotenv').config();
const { sequelize, User } = require('./models');

async function debugPasswordVerification() {
  try {
    console.log('🚀 调试密码验证问题...');

    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const user = await User.findOne({ where: { username: 'admin' } });
    if (!user) {
      console.log('❌ 未找到admin用户');
      return;
    }

    console.log('📋 用户信息:');
    console.log(`   用户名: ${user.username}`);
    console.log(`   密码字段类型: ${typeof user.password}`);
    console.log(`   密码长度: ${user.password.length}`);

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
        console.log(`   ${password} → ❌ 比较时出错: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 调试过程出错:', error);
  } finally {
    await sequelize.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

debugPasswordVerification();
