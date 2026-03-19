@echo off
chcp 65001 >nul
echo =====================================
echo 仓库管理系统 数据库初始化脚本
echo =====================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo 🔍 检查 MongoDB 连接...
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
  console.log('❌ MongoDB 连接失败');
  console.log('💡 请确保 MongoDB 服务已启动');
  client.destroy();
  process.exit(1);
});
client.on('timeout', () => {
  console.log('❌ MongoDB 连接超时');
  console.log('💡 请确保 MongoDB 服务已启动');
  client.destroy();
  process.exit(1);
});
"
if %errorlevel% neq 0 (
    echo.
    echo 💡 MongoDB 启动提示：
    echo   - 如果已安装 MongoDB，可在服务管理器中启动 MongoDB
    echo   - 或在命令行中运行: net start MongoDB
    pause
    exit /b 1
)

echo.
echo ⚠️  警告：初始化数据库将清空所有现有数据！
echo.
set /p confirm="确认要初始化数据库吗？(y/N): "
if /i not "%confirm%"=="y" (
    echo 已取消初始化
    pause
    exit /b 0
)

echo.
echo 🗑️  正在清空并重新初始化数据库...
node database/init.js
if %errorlevel% neq 0 (
    echo ❌ 数据库初始化失败
    pause
    exit /b 1
)

echo.
echo =====================================
echo ✅ 数据库初始化完成！
echo =====================================
echo.
echo 已创建测试账号：
echo   管理员:    admin / 123456
echo   仓管员A:   keeper_a / 123456
echo   仓管员B:   keeper_b / 123456
echo.
pause
