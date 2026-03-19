@echo off
chcp 65001 >nul
echo ============================================
echo 🛑 仓库管理系统 - 停止脚本
echo ============================================
echo.

:stop_backend
echo 🚪 停止后端服务...
tasklist /FI "WINDOWTITLE eq 仓库管理系统 - 后端*" | find /I "cmd.exe" >nul
if %errorlevel% equ 0 (
    echo 🔍 查找后端窗口...
    for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq 仓库管理系统 - 后端*" /FO list ^| findstr /I "PID:"') do (
        taskkill /F /PID %%a >nul 2>&1
        echo ✅ 后端服务已停止 (PID: %%a)
    )
) else (
    echo ℹ️  后端服务未运行
)

:stop_frontend
echo 🚪 停止前端服务...
tasklist /FI "WINDOWTITLE eq 仓库管理系统 - 前端*" | find /I "cmd.exe" >nul
if %errorlevel% equ 0 (
    echo 🔍 查找前端窗口...
    for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq 仓库管理系统 - 前端*" /FO list ^| findstr /I "PID:"') do (
        taskkill /F /PID %%a >nul 2>&1
        echo ✅ 前端服务已停止 (PID: %%a)
    )
) else (
    echo ℹ️  前端服务未运行
)

:stop_mongodb
echo 🚪 停止 MongoDB 服务...
call mongodb-stop.bat

:check_ports
echo.
echo 📊 检查端口状态...
echo.

netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo ⚠️  端口 3000 仍在占用 (PID: %%a)
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo ✅ 端口 3000 已释放
)

netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
        echo ⚠️  端口 5173 仍在占用 (PID: %%a)
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo ✅ 端口 5173 已释放
)

:final
echo.
echo ============================================
echo ✅ 所有服务已停止！
echo ============================================
echo.
echo 💡 所有服务窗口已关闭
echo 💡 MongoDB 已停止
echo.
echo 💡 重新启动请运行: start.bat
echo.
pause
