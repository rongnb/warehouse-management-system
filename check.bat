@echo off
chcp 65001 >nul
echo ============================================
echo 🏠 仓库管理系统 - 环境检查脚本
echo ============================================
echo.

set ERROR_COUNT=0
set STATUS="OK"

:check_nodejs
echo.
echo [1/5] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1" %%a in ('node --version') do (
        set "NODE_VERSION=%%a"
    )
    echo ✅ Node.js 已安装 %NODE_VERSION%
) else (
    echo ❌ Node.js 未安装
    echo 💡 下载地址: https://nodejs.org/
    set /a ERROR_COUNT+=1
    set STATUS="FAIL"
)

:check_mongodb_dir
echo.
echo [2/5] 检查本地 MongoDB...
if exist "mongodb\bin\mongod.exe" (
    echo ✅ 本地 MongoDB 文件已存在
    echo 📁 位置: %CD%\mongodb\
) else (
    echo ⚠️  未找到本地 MongoDB
    echo 💡 运行 download-mongodb.bat 下载，或解压到项目根目录
)

:check_mongodb_running
echo.
echo [3/5] 检查 MongoDB 运行状态...
node -e "
const net = require('net');
const client = new net.Socket();
client.setTimeout(2000);
client.connect(27017, 'localhost', () => {
  console.log('✅ MongoDB 服务正在运行');
  client.destroy();
  process.exit(0);
});
client.on('error', () => {
  console.log('ℹ️  MongoDB 未运行');
  client.destroy();
  process.exit(1);
});
client.on('timeout', () => {
  console.log('ℹ️  MongoDB 未响应');
  client.destroy();
  process.exit(1);
});
"
if %errorlevel% equ 0 (
    echo ✅ 服务连接正常
) else (
    if exist "mongodb\bin\mongod.exe" (
        echo ℹ️  MongoDB 未运行，但安装文件已准备好
        echo 💡 运行 start.bat 会自动启动
    ) else (
        echo ❌ MongoDB 未准备好
        set /a ERROR_COUNT+=1
        set STATUS="FAIL"
    )
)

:check_npm_deps
echo.
echo [4/5] 检查 npm 依赖...
if exist "backend\node_modules" (
    echo ✅ 后端依赖已安装
) else (
    if exist "packages\backend\node_modules" (
        echo 📦 后端依赖已打包，待安装
    ) else (
        echo ❌ 后端依赖未下载
        set /a ERROR_COUNT+=1
        set STATUS="FAIL"
    )
)

if exist "frontend\node_modules" (
    echo ✅ 前端依赖已安装
) else (
    if exist "packages\frontend\node_modules" (
        echo 📦 前端依赖已打包，待安装
    ) else (
        echo ❌ 前端依赖未下载
        set /a ERROR_COUNT+=1
        set STATUS="FAIL"
    )
)

:check_database
echo.
echo [5/5] 检查数据库...
if exist "backend\node_modules" (
    echo 🔍 测试数据库连接...
    node -e "
    const net = require('net');
    const client = new net.Socket();
    client.setTimeout(2000);
    client.connect(27017, 'localhost', () => {
      console.log('✅ MongoDB 连接成功');
      client.destroy();
      process.exit(0);
    });
    client.on('error', () => {
      console.log('ℹ️  无法连接到 MongoDB，启动时会创建数据库');
      client.destroy();
      process.exit(1);
    });
    client.on('timeout', () => {
      console.log('ℹ️  MongoDB 连接超时');
      client.destroy();
      process.exit(1);
    });
    "
) else (
    echo ℹ️  等待依赖安装后测试
)

:final_report
echo.
echo ============================================
echo 📊 检查报告
echo ============================================
echo.

if %STATUS% == "OK" (
    echo ✅ 所有检查通过！
    echo.
    echo 💡 下一步：
    echo   1. 运行: install.bat  # 安装（首次运行）
    echo   或
    echo   2. 运行: start.bat   # 直接启动
) else (
    echo ❌ 发现 %ERROR_COUNT% 个问题
    echo.
    echo 💡 修复建议：
    if %ERROR_COUNT% geq 3 (
        echo   建议运行: download-deps.bat 然后 install.bat
    ) else (
        echo   运行有问题的脚本进行修复
    )
)

echo.
echo 💡 详细说明：
echo   check-env.bat 只检查，不修改任何文件
echo   install.bat 会安装所有缺失的依赖
echo.
pause
