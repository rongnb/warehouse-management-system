@echo off
chcp 65001 >nul
echo =====================================
echo 仓库管理系统 - 仅启动后端服务
echo =====================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查是否已安装依赖
if not exist "backend\node_modules" (
    echo ⚠️  后端依赖未安装，正在安装...
    cd backend
    call npm install
    cd ..
)

echo 🚀 启动后端服务...
echo 🔧 访问地址: http://localhost:3000
echo 💡 按 Ctrl+C 停止服务
echo.
cd backend
npm run dev
