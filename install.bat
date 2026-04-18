@echo off
REM 安装脚本 (Windows) - SQLite 版本，无需外部数据库服务。
setlocal

echo ==============================
echo   仓库管理系统 - 安装脚本
echo ==============================

where node >nul 2>nul
if errorlevel 1 (
    echo [X] 未检测到 Node.js，请先安装 Node.js 20 LTS: https://nodejs.org/
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

echo.
echo [1/3] 安装后端依赖...
pushd backend
call npm install --no-audit --no-fund
if errorlevel 1 ( popd & echo [X] 后端依赖安装失败 & exit /b 1 )
popd

if exist frontend (
    echo.
    echo [2/3] 安装前端依赖...
    pushd frontend
    call npm install --no-audit --no-fund
    if errorlevel 1 ( popd & echo [X] 前端依赖安装失败 & exit /b 1 )
    popd
)

echo.
echo [3/3] 初始化 SQLite 数据库...
pushd backend
call node db\init.js
if errorlevel 1 ( popd & echo [X] 数据库初始化失败 & exit /b 1 )
popd

if not exist backend\.env copy backend\.env.example backend\.env >nul

echo.
echo [OK] 安装完成！
echo 启动后端:     cd backend ^&^& npm start
echo 启动前端开发: cd frontend ^&^& npm run dev
echo 默认管理员:   admin / admin123  (首次登录后请立即修改)
endlocal
