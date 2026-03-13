#!/bin/bash

# 仓库管理系统一键启动脚本
# 支持 Linux/macOS 平台

echo "=================================="
echo "仓库管理系统一键启动脚本"
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
require('dotenv').config({ path: './backend/.env' });

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

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 启动后端服务
echo "🚀 启动后端服务..."
npm run dev &
BACKEND_PID=$!
echo "✅ 后端服务已启动，PID: $BACKEND_PID"
cd ..

# 等待后端启动
sleep 3

# 安装前端依赖
echo "📦 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 启动前端服务
echo "🚀 启动前端服务..."
npm run dev &
FRONTEND_PID=$!
echo "✅ 前端服务已启动，PID: $FRONTEND_PID"
cd ..

echo "=================================="
echo "✅ 所有服务启动完成！"
echo "=================================="
echo "🌐 前端访问地址: http://localhost:5173"
echo "🔧 后端接口地址: http://localhost:3000"
echo ""
echo "默认账号："
echo "管理员: admin / 123456"
echo "仓管员A: keeper_a / 123456"
echo "仓管员B: keeper_b / 123456"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT

wait
