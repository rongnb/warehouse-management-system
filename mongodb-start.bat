@echo off
chcp 65001 >nul
echo =====================================
echo MongoDB 启动脚本
echo =====================================
echo.

REM 检查是否已安装
if not exist "mongodb\bin\mongod.exe" (
    echo ❌ 未找到 MongoDB
    echo 💡 请先运行 install-mongodb.bat
    pause
    exit /b 1
)

echo 🚀 启动 MongoDB 服务...
net start MongoDB
if %errorlevel% equ 0 (
    echo ✅ MongoDB 服务启动成功
) else (
    echo ❌ 无法启动 MongoDB 服务
    echo 💡 可能的原因:
    echo   1. 服务未安装，请运行 install-mongodb.bat
    echo   2. 需要管理员权限
    echo   3. 端口被占用 (27017)
    echo.
    echo 尝试直接运行 MongoDB (非服务模式):
    start "MongoDB" cmd /k "mongodb\bin\mongod.exe --dbpath mongodb\data --logpath mongodb\logs\mongod.log --port 27017 --bind_ip 127.0.0.1"
    echo ✅ MongoDB 已在新窗口中启动
)

echo.
echo 🔍 连接测试...
timeout /t 2 /nobreak >nul

echo.
echo 💡 如何使用:
echo   - 连接: mongodb\bin\mongo.exe
echo   - 查看日志: type mongodb\logs\mongod.log
echo.
pause
