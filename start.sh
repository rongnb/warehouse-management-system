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
echo "✅ Node.js 已安装: $(node --version)"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi
echo "✅ npm 已安装: $(npm --version)"

# 检查后端目录
if [ ! -d "backend" ]; then
    echo "❌ 错误: backend 目录不存在，请在项目根目录运行此脚本"
    exit 1
fi
echo "✅ 后端目录存在"

# 检查前端目录
if [ ! -d "frontend" ]; then
    echo "❌ 错误: frontend 目录不存在，请在项目根目录运行此脚本"
    exit 1
fi
echo "✅ 前端目录存在"

# 检查 MongoDB 是否运行
echo ""
echo "🔍 检查 MongoDB 连接..."

# 先检查 mongod 命令是否存在
if command -v mongod &> /dev/null; then
    echo "ℹ️  MongoDB 已安装在系统"
else
    echo "ℹ️  mongod 命令未找到，如果使用Docker MongoDB请忽略此消息"
fi

# 测试端口连接
if command -v nc &> /dev/null; then
    nc -z localhost 27017
    if [ $? -ne 0 ]; then
        echo "❌ MongoDB 端口 27017 无法连接"
        echo "💡 请确保 MongoDB 已启动："
        echo "   - Docker: docker run -d -p 27017:27017 mongo:4.4"
        echo "   - 本地: sudo systemctl start mongod"
        exit 1
    else
        echo "✅ MongoDB 端口 27017 可达"
    fi
fi

# 使用 mongoose 测试连接
node -e "
const mongoose = require('mongoose');
const fs = require('fs');

const envPath = './backend/.env';
let mongoUri = 'mongodb://localhost:27017/warehouse';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/MONGODB_URI\\s*=\\s*(.+)/);
  if (match) {
    mongoUri = match[1].trim();
  }
}

console.log('🔗 连接字符串:', mongoUri);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000,
})
.then(() => {
  console.log('✅ MongoDB 连接成功');
  mongoose.disconnect();
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB 连接失败:', err.message);
  console.log('💡 请检查：');
  console.log('   1. MongoDB 服务是否启动');
  console.log('   2. 连接地址是否正确 (backend/.env 中 MONGODB_URI)');
  console.log('   3. 端口 27017 是否被防火墙阻挡');
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
