@echo off
chcp 65001 >nul
echo =====================================
echo MongoDB 离线安装脚本
echo =====================================
echo.
echo 此脚本用于在内网服务器上安装和配置 MongoDB
echo 支持 Windows 7/8/10/11 和 Server 2008-2022
echo.

REM 检查系统架构
set "MONGODB_ARCH=x64"
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    set "MONGODB_ARCH=x86"
)

echo =====================================
echo [1/4] 系统信息
echo =====================================
echo 系统架构: %MONGODB_ARCH%
echo 操作系统: %OS%

echo.
echo =====================================
echo [2/4] 检查文件
echo =====================================

REM 检查是否有 MongoDB 文件
if exist "mongodb\bin\mongod.exe" (
    echo ✅ MongoDB 文件已存在
    set "MONGODB_INSTALLED=true"
) else (
    echo ❌ 未找到 MongoDB 安装文件
    echo.
    echo 💡 如何获取 MongoDB:
    echo   1. 从 MongoDB 官网下载 ZIP 包
    echo      下载地址: https://www.mongodb.com/try/download/community
    echo      版本: 4.4.x 或 5.x (LTS)
    echo.
    echo   2. 将下载的 zip 解压到项目根目录，重命名为 "mongodb"
    echo      目录结构:
    echo      e:\warehouse-management-system\mongodb\
    echo      └─bin\
    echo         ├─mongod.exe
    echo         ├─mongo.exe
    echo         └─...
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo [3/4] 配置 MongoDB
echo =====================================

REM 创建数据和日志目录
if not exist "mongodb\data" (
    echo 📁 创建数据目录: mongodb\data
    mkdir "mongodb\data"
)

if not exist "mongodb\logs" (
    echo 📁 创建日志目录: mongodb\logs
    mkdir "mongodb\logs"
)

REM 创建配置文件
if not exist "mongodb\mongod.cfg" (
    echo ⚙️  创建配置文件: mongodb\mongod.cfg
    echo systemLog: > mongodb\mongod.cfg
    echo   destination: file >> mongodb\mongod.cfg
    echo   path: "%CD%\mongodb\logs\mongod.log" >> mongodb\mongod.cfg
    echo   logAppend: true >> mongodb\mongod.cfg
    echo storage: >> mongodb\mongod.cfg
    echo   dbPath: "%CD%\mongodb\data" >> mongodb\mongod.cfg
    echo   journal: >> mongodb\mongod.cfg
    echo     enabled: true >> mongodb\mongod.cfg
    echo net: >> mongodb\mongod.cfg
    echo   port: 27017 >> mongodb\mongod.cfg
    echo   bindIp: 127.0.0.1 >> mongodb\mongod.cfg
    echo processManagement: >> mongodb\mongod.cfg
    echo   fork: false >> mongodb\mongod.cfg
    echo security: >> mongodb\mongod.cfg
    echo   authorization: disabled >> mongodb\mongod.cfg
) else (
    echo ⚙️  配置文件已存在
)

echo.
echo =====================================
echo [4/4] 安装 Windows 服务
echo =====================================

REM 检查服务是否已安装
sc query "MongoDB" >nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB 服务已安装
) else (
    echo 📦 正在安装 MongoDB 服务...
    echo 执行命令: sc create MongoDB binPath= ""%CD%\mongodb\bin\mongod.exe" --service --config="%CD%\mongodb\mongod.cfg""
    sc create MongoDB binPath= "%CD%\mongodb\bin\mongod.exe --service --config=%CD%\mongodb\mongod.cfg" DisplayName= "MongoDB" start= "auto"
    if %errorlevel% equ 0 (
        echo ✅ MongoDB 服务安装成功
    ) else (
        echo ❌ MongoDB 服务安装失败
        echo 💡 可能需要管理员权限，请右键点击脚本选择"以管理员身份运行"
        echo.
        pause
        exit /b 1
    )
)

REM 启动服务
echo 🚀 启动 MongoDB 服务...
net start MongoDB
if %errorlevel% equ 0 (
    echo ✅ MongoDB 服务启动成功
) else (
    echo ❌ MongoDB 服务启动失败
    pause
    exit /b 1
)

echo.
echo =====================================
echo ✅ MongoDB 安装完成！
echo =====================================
echo.
echo 💡 连接测试:
echo   运行: mongodb\bin\mongo.exe
echo   或使用工具如 Robo 3T 连接
echo.
echo 💡 后续操作:
echo   - 运行数据库初始化: init-db.bat
echo   - 启动系统: start.bat
echo.
pause
