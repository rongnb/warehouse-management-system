@echo off
REM 离线安装脚本 (Windows)
REM 前提：npm 依赖已通过 package-deps.bat 打包为 packages\ 目录。
setlocal

echo =========================================
echo   仓库管理系统 - 离线安装 (SQLite 版本)
echo =========================================

where node >nul 2>nul
if errorlevel 1 (
    echo [X] 未检测到 Node.js，请先安装 Node.js 20 LTS
    exit /b 1
)

set NPM_FLAGS=--no-audit --no-fund
if exist packages (
    echo [i] 使用离线依赖缓存
    set NPM_FLAGS=%NPM_FLAGS% --offline --prefer-offline --cache=%CD%\packages
)

pushd backend
call npm install %NPM_FLAGS%
if errorlevel 1 ( popd & exit /b 1 )
popd

if exist frontend (
    pushd frontend
    call npm install %NPM_FLAGS%
    call npm run build
    popd
)

pushd backend
call node db\init.js
popd

if not exist backend\.env copy backend\.env.example backend\.env >nul

echo [OK] 离线安装完成！
echo 启动: cd backend ^&^& npm start
echo 默认管理员: admin / admin123
endlocal
