const bcrypt = require('bcryptjs');

async function debugBcrypt() {
  const password = '123456';
  console.log('原始密码:', password);

  // 生成哈希
  const hash1 = await bcrypt.hash(password, 10);
  console.log('哈希1:', hash1);

  const hash2 = await bcrypt.hash(password, 10);
  console.log('哈希2:', hash2);

  // 验证
  const check1 = await bcrypt.compare(password, hash1);
  console.log('验证1:', check1);

  const check2 = await bcrypt.compare(password, hash2);
  console.log('验证2:', check2);

  // 验证错误的密码
  const check3 = await bcrypt.compare('wrongpassword', hash1);
  console.log('验证3 (错误密码):', check3);
}

debugBcrypt();
