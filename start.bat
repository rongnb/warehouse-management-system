@echo off
REM 启动脚本 - SQLite 版本
cd /d %~dp0
if not exist backend\node_modules (
    echo [X] 后端依赖未安装，先运行 install.bat
    exit /b 1
)
if not exist data\warehouse.db (
    pushd backend & call node db\init.js & popd
)
node backend\server.js
