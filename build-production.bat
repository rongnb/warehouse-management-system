@echo off
REM 生产构建 (Windows)
setlocal

echo ==============================
echo   生产构建
echo ==============================

echo [1/3] 安装 backend 依赖...
pushd backend
call npm install --no-audit --no-fund
if errorlevel 1 ( popd & exit /b 1 )
popd

if exist frontend (
    echo [2/3] 构建前端...
    pushd frontend
    call npm install --no-audit --no-fund
    if errorlevel 1 ( popd & exit /b 1 )
    call npm run build
    if errorlevel 1 ( popd & exit /b 1 )
    popd
) else (
    echo [2/3] 跳过前端：frontend\ 不存在
)

echo [3/3] 剪掉 backend devDependencies...
pushd backend
call npm prune --omit=dev
popd

echo [OK] 生产构建完成
echo   后端入口:  backend\server.js
echo   前端产物:  frontend\dist\
echo   启动:      start.bat
endlocal
