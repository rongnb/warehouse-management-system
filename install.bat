@echo off
chcp 65001 >nul
echo ============================================
echo 📦 仓库管理系统 - 全自动安装脚本
echo ============================================
echo.
echo 💡 全程自动执行，无需人工干预
echo 请稍候，安装过程可能需要3-10分钟...
echo.

timeout /t 2 /nobreak >nul

echo =====================================
echo [1/7] 环境检查
echo =====================================
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo 💡 请先安装 Node.js 18.0 或更高版本
    echo 下载地址：https://nodejs.org/zh-cn/
    pause
    exit /b 1
)
echo ✅ Node.js 环境正常：%node_version%

echo.
echo =====================================
echo [2/7] 检查MongoDB
echo =====================================
if exist "mongodb\bin\mongod.exe" (
    echo ✅ MongoDB 已存在，跳过下载
    goto :install_mongodb
)

if exist "mongodb.zip" (
    echo 📦 检测到已下载的mongodb.zip，自动解压...
    call :unzip_mongodb
) else (
    echo 📥 自动从多源下载MongoDB...
    call download-mongodb.bat
    if %errorlevel% neq 0 (
        echo.
        echo ⚠️  自动下载失败，将使用本地MongoDB服务
        echo 如果本地没有MongoDB，请手动下载：
        echo https://mirrors.aliyun.com/mongodb/win32/mongodb-win32-x86_64-4.4.25.zip
        echo 下载后放到项目根目录，命名为 mongodb.zip
        echo.
    )
)

:install_mongodb
if exist "mongodb\bin\mongod.exe" (
    echo.
    echo =====================================
    echo [3/7] 安装MongoDB服务
    echo =====================================
    call install-mongodb.bat >nul 2>&1
    echo ✅ MongoDB 服务安装完成
) else (
    echo ⚠️  未检测到MongoDB，将使用系统已安装的MongoDB服务
    echo 请确保MongoDB服务已启动，端口27017
)

echo.
echo =====================================
echo [4/7] 安装后端依赖
echo =====================================
cd backend
if exist "node_modules" (
    echo ✅ 后端依赖已存在，跳过
) else (
    if exist "../packages/backend/node_modules" (
        echo 📦 离线安装后端依赖...
        xcopy /E /I /Y "../packages/backend/node_modules" "node_modules" >nul
        copy /Y "../packages/backend/package-lock.json" . >nul
    ) else (
        echo 📦 在线安装后端依赖...
        npm install
        if %errorlevel% neq 0 (
            echo ❌ 后端依赖安装失败
            cd ..
            pause
            exit /b 1
        )
    )
)
cd ..
echo ✅ 后端依赖安装完成

echo.
echo =====================================
echo [5/7] 安装前端依赖
echo =====================================
cd frontend
if exist "node_modules" (
    echo ✅ 前端依赖已存在，跳过
) else (
    if exist "../packages/frontend/node_modules" (
        echo 📦 离线安装前端依赖...
        xcopy /E /I /Y "../packages/frontend/node_modules" "node_modules" >nul
        copy /Y "../packages/frontend/package-lock.json" . >nul
    ) else (
        echo 📦 在线安装前端依赖...
        npm install
        if %errorlevel% neq 0 (
            echo ❌ 前端依赖安装失败
            cd ..
            pause
            exit /b 1
        )
    )
)
cd ..
echo ✅ 前端依赖安装完成

echo.
echo =====================================
echo [6/7] 初始化数据库
echo =====================================
echo 🗄️ 正在初始化数据库和默认数据...
node database/init.js
if %errorlevel% neq 0 (
    echo ⚠️  数据库初始化失败
    echo 💡 可能原因：
    echo   1. MongoDB服务未启动
    echo   2. 端口27017被占用
    echo   3. 数据库连接配置错误
) else (
    echo ✅ 数据库初始化完成
)

echo.
echo =====================================
echo [7/7] 完成安装
echo =====================================
echo.
echo ============================================
echo ✅ 安装成功完成！
echo ============================================
echo.
echo 🚀 启动命令：
echo   一键启动所有服务：start.bat
echo   仅启动后端：backend-start.bat
echo   仅启动前端：frontend-start.bat
echo.
echo 🌐 访问地址：
echo   前端页面：http://localhost:5173
echo   后端接口：http://localhost:3000
echo.
echo 🔑 默认账号：
echo   管理员：admin / 123456
echo   仓管员A：keeper_a / 123456
echo   仓管员B：keeper_b / 123456
echo.
echo 💡 内网部署提示：
echo   如需打包离线依赖包，运行：package-deps.bat
echo.
pause
exit /b 0

:unzip_mongodb
echo 🔧 正在解压MongoDB压缩包...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Expand-Archive -Path 'mongodb.zip' -DestinationPath '.' -Force" >nul
for /f "delims=" %%i in ('dir /ad /b mongodb-win* 2^>nul') do (
    rename "%%i" mongodb
)
if exist "mongodb.zip" del mongodb.zip >nul 2>&1
echo ✅ MongoDB 解压完成
goto :eof

