@echo off
chcp 65001 >nul
echo =====================================
echo 正在停止仓库管理系统所有服务...
echo =====================================

:: 停止后端服务（端口3000）
netstat -ano | findstr :3000 | findstr /I LISTENING >nul
if %errorlevel% equ 0 (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr /I LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo ✅ 后端服务（端口3000）已停止
  )
) else (
  echo ℹ️ 未找到运行中的后端服务
)

:: 停止前端服务（端口5173）
netstat -ano | findstr :5173 | findstr /I LISTENING >nul
if %errorlevel% equ 0 (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr /I LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo ✅ 前端服务（端口5173）已停止
  )
) else (
  echo ℹ️ 未找到运行中的前端服务
)

echo =====================================
echo 所有服务已停止完成
echo =====================================
pause
