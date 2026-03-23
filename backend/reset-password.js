const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';

console.log('正在连接数据库...');

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('数据库连接成功');

    const newPassword = '123456';

    const updatePasswords = async () => {
      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const users = await User.find({});
        console.log('找到 ' + users.length + ' 个用户');

        for (const user of users) {
          // 直接使用 updateOne 绕过模型的pre('save')中间件，避免双重加密
          await User.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
          );
          console.log('✅ 用户 ' + user.username + ' (' + user.realName + ') 密码已重置为: ' + newPassword);
        }

        console.log('\n🎉 所有用户密码已成功重置!');
        console.log('\n可用账号:');
        console.log('  - admin / 123456');
        console.log('  - keeper_a / 123456');
        console.log('  - keeper_b / 123456');

      } catch (error) {
        console.error('❌ 密码重置失败:', error);
      } finally {
        mongoose.disconnect();
        process.exit(0);
      }
    };

    updatePasswords();
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err);
    process.exit(1);
  });
