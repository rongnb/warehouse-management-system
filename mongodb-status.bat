@echo off
chcp 65001 >nul
echo =====================================
echo MongoDB 状态检查
echo =====================================
echo.

echo =====================================
echo [1/4] 服务状态
echo =====================================
sc query "MongoDB" >nul
if %errorlevel% equ 0 (
    for /f "tokens=3" %%a in ('sc query MongoDB ^| findstr "STATE"') do (
        set "SERVICE_STATE=%%a"
    )
    if "%SERVICE_STATE%" == "RUNNING" (
        echo ✅ MongoDB 服务正在运行
    ) else (
        echo ℹ️  MongoDB 服务已停止 (%SERVICE_STATE%)
    )
) else (
    echo ❌ MongoDB 服务未安装
)

echo.
echo =====================================
echo [2/4] 进程状态
echo =====================================
tasklist | findstr mongod.exe >nul
if %errorlevel% equ 0 (
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq mongod.exe" /FO list ^| findstr /I "PID:"') do (
        set "MONGOD_PID=%%a"
    )
    echo ✅ MongoDB 进程正在运行 (PID: %MONGOD_PID%)
) else (
    echo ℹ️  未找到 MongoDB 进程
)

echo.
echo =====================================
echo [3/4] 端口状态
echo =====================================
netstat -ano | findstr :27017 >nul
if %errorlevel% equ 0 (
    echo ✅ 端口 27017 正在监听
) else (
    echo ❌ 端口 27017 未监听
)

echo.
echo =====================================
echo [4/4] 连接测试
echo =====================================
echo 📡 尝试连接到 MongoDB...
mongodb\bin\mongo.exe --eval "db.runCommand({ping: 1})" 2>nul >nul
if %errorlevel% equ 0 (
    echo ✅ 成功连接到 MongoDB
    for /f "tokens=2" %%a in ('mongodb\bin\mongo.exe --eval "db.version()" ^| findstr [0-9]') do (
        set "VERSION=%%a"
    )
    echo   版本: %VERSION%
) else (
    echo ❌ 无法连接到 MongoDB
)

echo.
echo =====================================
echo [5/5] 文件检查
echo =====================================
if exist "mongodb\bin\mongod.exe" (
    echo ✅ mongod.exe 存在
) else (
    echo ❌ mongod.exe 不存在
)

if exist "mongodb\data" (
    echo ✅ 数据目录存在
) else (
    echo ❌ 数据目录不存在
)

if exist "mongodb\logs" (
    echo ✅ 日志目录存在
) else (
    echo ❌ 日志目录不存在
)

echo.
echo 💡 修复建议:
if not exist "mongodb\bin\mongod.exe" (
    echo   - 缺少 MongoDB 文件，请运行 install-mongodb.bat
)
if "%SERVICE_STATE%" neq "RUNNING" (
    echo   - 启动服务: mongodb-start.bat
)
if "%SERVICE_STATE%" == "RUNNING" (
    for /f %%i in ('tasklist ^| findstr mongod.exe ^| find /c "mongod"') do (
        if %%i equ 0 (
            echo   - 服务状态异常，请重启服务: mongodb-stop.bat ^&^& mongodb-start.bat
        )
    )
)

echo.
pause
