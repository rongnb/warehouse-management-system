@echo off
chcp 65001 >nul
echo ============================================
echo 🏗️  仓库管理系统 - 生产版本构建脚本
echo ============================================
echo.

REM 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo 💡 请先安装 Node.js 18.0 或更高版本
    pause
    exit /b 1
)
echo ✅ Node.js 环境正常

echo.
echo =====================================
echo [1/4] 安装后端依赖
echo =====================================
cd backend
if not exist "node_modules" (
    echo 📦 安装后端依赖...
    npm install --production
) else (
    echo ✅ 后端依赖已安装
)

REM 创建 .env
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo ✅ 创建了 .env 配置文件
    )
)
cd ..

echo.
echo =====================================
echo [2/4] 安装前端依赖
echo =====================================
cd frontend
if not exist "node_modules" (
    echo 📦 安装前端依赖...
    npm install
)
echo ✅ 前端依赖已安装

echo.
echo =====================================
echo [3/4] 构建前端静态文件
echo =====================================
echo 📦 正在构建...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 前端构建失败
    cd ..
    pause
    exit /b 1
)
echo ✅ 前端构建完成
cd ..

echo.
echo =====================================
echo [4/4] 准备生产部署目录
echo =====================================
set DIST_DIR=dist-production

if exist "%DIST_DIR%" rmdir /S /Q "%DIST_DIR%"
mkdir "%DIST_DIR%\backend"
mkdir "%DIST_DIR%\frontend"
mkdir "%DIST_DIR%\database"

REM 复制后端文件
xcopy /E /I /Y "backend\server.js" "%DIST_DIR%\backend\" >nul
xcopy /E /I /Y "backend\routes" "%DIST_DIR%\backend\routes" >nul
xcopy /E /I /Y "backend\models" "%DIST_DIR%\backend\models" >nul
xcopy /E /I /Y "backend\middleware" "%DIST_DIR%\backend\middleware" >nul
xcopy /E /I /Y "backend\utils" "%DIST_DIR%\backend\utils" >nul
copy /Y "backend\package.json" "%DIST_DIR%\backend\" >nul
copy /Y "backend\package-lock.json" "%DIST_DIR%\backend\" >nul 2>&1
copy /Y "backend\.env" "%DIST_DIR%\backend\" >nul 2>&1
if exist "backend\node_modules" (
    xcopy /E /I /Y "backend\node_modules" "%DIST_DIR%\backend\node_modules" >nul
)

REM 复制OCR训练数据
copy /Y "backend\*.traineddata" "%DIST_DIR%\backend\" >nul 2>&1

REM 复制前端构建产物
xcopy /E /I /Y "frontend\dist" "%DIST_DIR%\frontend" >nul

REM 复制数据库初始化脚本
xcopy /E /I /Y "database" "%DIST_DIR%\database" >nul

echo ✅ 生产部署目录已准备: %DIST_DIR%\

echo.
echo ============================================
echo ✅ 生产版本构建完成！
echo ============================================
echo.
echo 📁 部署目录: %DIST_DIR%\
echo    backend\     - 后端Node.js应用
echo    frontend\    - 前端静态文件
echo    database\    - 数据库初始化脚本
echo.
echo 💡 部署方式：
echo    1. 将 %DIST_DIR%\ 复制到生产服务器
echo    2. 使用 Nginx 托管 frontend\ 静态文件
echo    3. cd backend ^&^& node server.js
echo.
echo 💡 或使用 Docker：
echo    docker compose up -d --build
echo.
pause
