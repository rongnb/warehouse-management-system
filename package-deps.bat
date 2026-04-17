@echo off
REM 离线依赖打包 (Windows)
REM 在有网机器上运行：把 backend / frontend 的 npm 依赖缓存到 .\packages\，
REM 之后整个项目目录可以拷贝到内网机器配合 install-offline.bat 离线安装。
setlocal
set OUT_DIR=%~dp0packages
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

echo ==============================
echo   离线依赖打包
echo   缓存目录: %OUT_DIR%
echo ==============================

where npm >nul 2>nul
if errorlevel 1 ( echo [X] 未检测到 npm & exit /b 1 )

echo [1/2] 缓存后端依赖...
pushd backend
call npm install --no-audit --no-fund --cache="%OUT_DIR%"
if errorlevel 1 ( popd & exit /b 1 )
popd

if exist frontend (
    echo [2/2] 缓存前端依赖...
    pushd frontend
    call npm install --no-audit --no-fund --cache="%OUT_DIR%"
    if errorlevel 1 ( popd & exit /b 1 )
    popd
)

echo [OK] 完成。拷贝整个项目目录到目标机器后，运行 install-offline.bat 即可离线安装。
endlocal
