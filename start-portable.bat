@echo off
chcp 65001 >nul
echo =====================================
echo 🚀 仓库管理系统便携版启动脚本
echo =====================================
echo 💡 完全离线可用，无需安装任何软件
echo.

REM 检查MongoDB是否存在
if not exist "mongodb\bin\mongod.exe" (
    echo ❌ 错误：未找到MongoDB便携版
    echo.
    echo 💡 解决方法：
    echo 1. 下载MongoDB 4.4.25便携版
    echo 2. 解压到当前目录，重命名为 mongodb
    echo 3. 确保路径：mongodb\bin\mongod.exe 存在
    echo.
    pause
    exit /b 1
)

REM 检查node_modules是否存在
if not exist "backend\node_modules" (
    echo ❌ 错误：后端依赖未安装
    echo 💡 请先运行 install-offline.bat 安装依赖
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ❌ 错误：前端依赖未安装
    echo 💡 请先运行 install-offline.bat 安装依赖
    pause
    exit /b 1
)

REM 创建数据目录
if not exist "data\db" (
    mkdir data\db
    echo 📁 创建数据目录：data\db
)

echo.
echo 🟢 正在启动MongoDB数据库...
start "MongoDB" /min mongodb\bin\mongod.exe --dbpath=data\db --port=27017 --bind_ip=127.0.0.1 --quiet

timeout /t 3 /nobreak >nul

echo 🟢 正在启动后端API服务...
start "Backend" /min cmd /k "cd backend && node server.js"

timeout /t 2 /nobreak >nul

echo 🟢 正在启动前端页面服务...
start "Frontend" /min cmd /k "cd frontend && npm run dev"

echo.
echo =====================================
echo ✅ 所有服务已成功启动！
echo =====================================
echo.
echo 🌐 访问地址：http://localhost:5173
echo 🔑 默认账号：admin / 123456
echo.
echo 💡 停止服务：直接关闭三个弹出的窗口即可
echo 💡 数据存储：所有数据库数据保存在 data\db 目录
echo.
pause
