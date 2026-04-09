@echo off
chcp 65001 >nul
echo =====================================
echo 📦 仓库管理系统 - 离线依赖打包脚本
echo =====================================
echo.
echo 💡 此脚本用于在外网机器上打包所有依赖
echo    打包后拷贝整个项目到内网即可离线安装
echo.

REM 检查是否已安装依赖
if not exist "backend\node_modules" (
    echo ❌ 错误: backend\node_modules 不存在
    echo 💡 请先在外网运行 install.bat 安装完依赖后再打包
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ❌ 错误: frontend\node_modules 不存在
    echo 💡 请先在外网运行 install.bat 安装完依赖后再打包
    pause
    exit /b 1
)

echo =====================================
echo 创建packages目录结构
echo =====================================
echo.

if not exist "packages\backend" (
    mkdir packages\backend
    echo ✅ 创建 packages\backend
)
if not exist "packages\frontend" (
    mkdir packages\frontend
    echo ✅ 创建 packages\frontend
)

echo.
echo =====================================
echo 复制后端依赖...
echo =====================================
echo.
xcopy /E /I /Y "backend\node_modules" "packages\backend\node_modules" >nul
if exist "backend\package-lock.json" (
    copy /Y "backend\package-lock.json" "packages\backend\" >nul
)
echo ✅ 后端依赖已复制到 packages\backend\node_modules

echo.
echo =====================================
echo 复制前端依赖...
echo =====================================
echo.
xcopy /E /I /Y "frontend\node_modules" "packages\frontend\node_modules" >nul
if exist "frontend\package-lock.json" (
    copy /Y "frontend\package-lock.json" "packages\frontend\" >nul
)
echo ✅ 前端依赖已复制到 packages\frontend\node_modules

echo.
echo =====================================
echo ✅ 打包完成！
echo =====================================
echo.
echo 📦 离线包位置: packages\ 目录
echo.
echo 🚀 内网部署步骤:
echo    1. 将整个项目目录拷贝到内网机器
echo    2. 确保项目根目录包含 packages\ 目录
echo    3. 运行: install-offline.bat  一键离线安装
echo    4. 运行: start-portable.bat   启动所有服务
echo.
echo 💡 如果需要包含MongoDB便携版:
echo    下载 MongoDB 4.4.25 便携版
echo    解压到项目根目录，重命名为 mongodb
echo    确保 mongodb\bin\mongod.exe 存在
echo    这样整个项目就完全绿色便携，无需安装MongoDB
echo.
pause
