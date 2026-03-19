@echo off
chcp 65001 >nul
echo =====================================
echo MongoDB 停止脚本
echo =====================================
echo.

echo 🛑 停止 MongoDB 服务...
net stop MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB 服务已停止
) else (
    echo ℹ️  MongoDB 服务未运行
)

REM 查找并终止直接运行的 mongod 进程
echo.
echo 🔍 检查并终止 MongoDB 进程...
tasklist | findstr mongod.exe >nul
if %errorlevel% equ 0 (
    taskkill /F /IM mongod.exe >nul
    echo ✅ MongoDB 进程已终止
) else (
    echo ℹ️  未找到 MongoDB 进程
)

echo.
echo 🌐 验证端口...
netstat -ano | findstr :27017 >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :27017') do (
        taskkill /F /PID %%a >nul
    )
    echo ✅ 端口 27017 已释放
) else (
    echo ✅ 端口 27017 已空闲
)

echo.
echo =====================================
echo ✅ MongoDB 停止完成
echo =====================================
pause
