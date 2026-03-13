#!/bin/bash

# 仓库管理系统数据库初始化脚本
# 支持 MongoDB 数据初始化

echo "=================================="
echo "仓库管理系统数据库初始化脚本"
echo "=================================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装，请先安装 Node.js >= 16.0.0"
    exit 1
fi

# 检查 MongoDB 是否运行
echo "🔍 检查 MongoDB 连接..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB 连接成功');
  mongoose.disconnect();
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB 连接失败:', err.message);
  console.log('💡 请确保 MongoDB 服务已启动，并且连接配置正确');
  process.exit(1);
});
" || exit 1

echo "📦 安装数据库依赖..."
cd "$(dirname "$0")"
npm install mongoose bcryptjs dotenv --no-save

echo "🚀 开始初始化数据..."
node init.js

echo "=================================="
echo "✅ 数据库初始化完成！"
echo "=================================="
echo "默认账号："
echo "管理员: admin / 123456"
echo "仓管员A: keeper_a / 123456"
echo "仓管员B: keeper_b / 123456"
echo ""
echo "您现在可以启动后端和前端服务了！"
