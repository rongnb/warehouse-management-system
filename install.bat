@echo off
chcp 65001 >nul
echo =====================================
echo 仓库管理系统 环境依赖安装脚本 (Windows)
echo =====================================

echo 1/3 正在安装后端依赖...
cd backend
call npm install
if %errorlevel% neq 0 (
  echo ❌ 后端依赖安装失败，请检查Node.js是否正确安装
  pause
  exit /b 1
)
echo ✅ 后端依赖安装完成

echo 2/3 正在安装前端依赖...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
  echo ❌ 前端依赖安装失败，请检查Node.js是否正确安装
  pause
  exit /b 1
)
echo ✅ 前端依赖安装完成

echo 3/3 正在初始化数据库...
cd ..
node database/init.js
if %errorlevel% neq 0 (
  echo ⚠️  数据库初始化失败，请确认MongoDB服务已启动
) else (
  echo ✅ 数据库初始化完成
)

echo =====================================
echo ✅ 所有依赖安装完成！
echo =====================================
echo 启动方式：
echo 一键启动所有服务：双击 start.bat
echo 手动启动：
echo   后端：cd backend && npm start
echo   前端：cd frontend && npm run dev
echo 停止服务：双击 stop.bat
echo =====================================
pause
