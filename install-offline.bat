@echo off
chcp 65001 >nul
echo =====================================
echo 仓库管理系统 - 离线安装脚本
echo =====================================
echo.

echo 此脚本用于在内网环境中安装依赖
echo 需要 packages 目录中的离线依赖包
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查是否有 packages 目录
if not exist "packages" (
    echo ❌ 错误: 未找到 packages 目录
    echo.
    echo 💡 如果有 node_modules 备份，可以直接恢复:
    echo   1. 将后端 node_modules 复制到 backend\
    echo   2. 将前端 node_modules 复制到 frontend\
    echo.
    pause
    exit /b 1
)

echo =====================================
echo [1/4] 安装后端依赖
echo =====================================
echo.

if exist "packages\backend\node_modules" (
    if exist "backend\node_modules" (
        echo ⚠️  后端 node_modules 已存在，跳过复制
    ) else (
        echo 📦 复制后端依赖...
        xcopy /E /I /Y "packages\backend\node_modules" "backend\node_modules" >nul
        echo ✅ 后端依赖已复制
    )
) else (
    echo ⚠️  packages\backend\node_modules 不存在
    echo 📦 尝试从 npm 安装后端依赖...
    cd backend
    call npm ci
    cd ..
)

echo.
echo =====================================
echo [2/4] 安装前端依赖
echo =====================================
echo.

if exist "packages\frontend\node_modules" (
    if exist "frontend\node_modules" (
        echo ⚠️  前端 node_modules 已存在，跳过复制
    ) else (
        echo 📦 复制前端依赖...
        xcopy /E /I /Y "packages\frontend\node_modules" "frontend\node_modules" >nul
        echo ✅ 前端依赖已复制
    )
) else (
    echo ⚠️  packages\frontend\node_modules 不存在
    echo 📦 尝试从 npm 安装前端依赖...
    cd frontend
    call npm ci
    cd ..
)

echo.
echo =====================================
echo [3/4] 复制配置文件
echo =====================================
echo.

if exist "packages\backend\package-lock.json" (
    copy /Y "packages\backend\package-lock.json" "backend\" >nul 2>&1
)

if exist "packages\frontend\package-lock.json" (
    copy /Y "packages\frontend\package-lock.json" "frontend\" >nul 2>&1
)

echo ✅ 配置文件已同步

REM 创建后端.env配置文件（如果不存在）
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy /Y "backend\.env.example" "backend\.env" >nul
        echo ✅ 创建了 backend\.env 配置文件
    )
)

echo.
echo =====================================
echo [4/4] 初始化数据库
echo =====================================
echo.

echo 🗄️  正在初始化数据库...
node database/init.js
if %errorlevel% neq 0 (
    echo ⚠️  数据库初始化失败，请确认MongoDB服务已启动
) else (
    echo ✅ 数据库初始化完成
)

echo.
echo =====================================
echo ✅ 离线安装完成！
echo =====================================
echo.
echo 💡 启动服务:
echo   一键启动: start.bat
echo   或分别启动:
echo     后端: backend-start.bat
echo     前端: frontend-start.bat
echo.
pause
