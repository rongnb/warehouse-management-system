@echo off
chcp 65001 >nul
echo ==================================
echo 仓库管理系统一键启动脚本
echo ==================================

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装，请先安装 Node.js ^>= 16.0.0
    pause
    exit /b 1
)

REM 检查 MongoDB 是否运行
echo 🔍 检查 MongoDB 连接...
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
"
if %errorlevel% neq 0 (
    pause
    exit /b 1
)

REM 安装后端依赖
echo 📦 安装后端依赖...
cd backend
if not exist "node_modules" (
    npm install
)

REM 启动后端服务
echo 🚀 启动后端服务...
start /B npm run dev
echo ✅ 后端服务已启动
cd ..

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 安装前端依赖
echo 📦 安装前端依赖...
cd frontend
if not exist "node_modules" (
    npm install
)

REM 启动前端服务
echo 🚀 启动前端服务...
start /B npm run dev
echo ✅ 前端服务已启动
cd ..

echo ==================================
echo ✅ 所有服务启动完成！
echo ==================================
echo 🌐 前端访问地址: http://localhost:5173
echo 🔧 后端接口地址: http://localhost:3000
echo.
echo 默认账号：
echo 管理员: admin / 123456
echo 仓管员A: keeper_a / 123456
echo 仓管员B: keeper_b / 123456
echo.
echo 按任意键停止所有服务
pause >nul

REM 停止服务
echo 🛑 正在停止服务...
taskkill /f /im node.exe >nul 2>&1
echo ✅ 所有服务已停止
