@echo off
chcp 65001 >nul
echo ============================================
echo 🚀 仓库管理系统 - 启动脚本
echo ============================================
echo.

echo 🏠 检查运行环境...
call check.bat

:start_mongodb
if exist "mongodb\bin\mongod.exe" (
    echo.
    echo 📦 检查 MongoDB 服务...
    sc query "MongoDB" >nul
    if %errorlevel% equ 0 (
        node -e "
        const net = require('net');
        const client = new net.Socket();
        client.setTimeout(2000);
        client.connect(27017, 'localhost', () => {
          console.log('✅ MongoDB 已在运行');
          client.destroy();
          process.exit(0);
        });
        client.on('error', () => {
          console.log('🚀 启动 MongoDB 服务...');
          client.destroy();
          process.exit(1);
        });
        client.on('timeout', () => {
          console.log('🚀 启动 MongoDB 服务...');
          client.destroy();
          process.exit(1);
        });
        "
        if %errorlevel% equ 1 (
            call mongodb-start.bat
        )
    ) else (
        echo ❌ MongoDB 服务未安装
        echo 💡 运行 install.bat 或 install-mongodb.bat
        pause
        exit /b 1
    )
) else (
    echo ❌ 未找到本地 MongoDB
    echo 💡 运行 install.bat
    pause
    exit /b 1
)

:start_backend
echo.
echo 🚀 启动后端服务...
cd backend
start "仓库管理系统 - 后端" cmd /k "npm run dev"
echo ✅ 后端服务已在新窗口中启动
cd ..

:wait_backend
echo ⏳ 等待后端启动...
timeout /t 3 /nobreak >nul

:start_frontend
echo.
echo 🚀 启动前端服务...
cd frontend
start "仓库管理系统 - 前端" cmd /k "npm run dev"
echo ✅ 前端服务已在新窗口中启动
cd ..

:final
echo.
echo ============================================
echo ✅ 所有服务已启动！
echo ============================================
echo.
echo 📊 访问地址
echo   🌐 前端: http://localhost:5173
echo   🔧 后端: http://localhost:3000
echo   💾 MongoDB: mongodb://localhost:27017/warehouse
echo.
echo 🔑 默认账号
echo   👑 管理员: admin / 123456
echo   🏭 仓管员A: keeper_a / 123456
echo   🏭 仓管员B: keeper_b / 123456
echo.
echo 📋 停止服务
echo   运行 stop.bat 停止所有服务
echo   或在各窗口按 Ctrl+C
echo.
echo 💡 如果无法访问，请检查防火墙
echo.
pause
