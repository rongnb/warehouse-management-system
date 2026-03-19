@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo =====================================
echo MongoDB 离线安装包下载脚本
echo =====================================
echo.
echo 此脚本用于在有网的机器上下载 MongoDB ZIP 安装包
echo.

REM 检查是否已下载
if exist "mongodb.zip" (
    echo 📦 检测到已下载的 mongodb.zip
    echo.
    set /p unzip="是否要解压？(y/N): "
    if /i "!unzip!"=="y" (
        call :unzip_mongodb
        pause
        exit /b 0
    ) else (
        echo 已取消操作
        pause
        exit /b 0
    )
)

echo =====================================
echo 正在下载 MongoDB 4.4.25...
echo =====================================
echo.

set "MONGODB_VERSION=4.4.25"
set "MONGODB_FILE=mongodb-win32-x86_64-%MONGODB_VERSION%.zip"

REM 下载源列表（按速度优先级排序）
set "SOURCE1=https://mirrors.aliyun.com/mongodb/win32/%MONGODB_FILE%"
set "SOURCE2=https://mirrors.huaweicloud.com/mongodb/win32/%MONGODB_FILE%"
set "SOURCE3=https://mirrors.cloud.tencent.com/mongodb/win32/%MONGODB_FILE%"
set "SOURCE4=https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-4.4.30.zip"

echo 📥 正在尝试多源自动下载 MongoDB %MONGODB_VERSION%...
echo.

REM 尝试所有下载源
for %%s in ("%SOURCE1%" "%SOURCE2%" "%SOURCE3%" "%SOURCE4%") do (
    echo 🔄 尝试下载源: %%~s
    echo.

    REM 优先使用bitsadmin下载（Windows系统自带，最稳定）
    where bitsadmin >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用 bitsadmin 下载（系统内置，最稳定）...
        bitsadmin /transfer mongodbDownload /download /priority normal "%%~s" "%CD%\mongodb.zip" >nul 2>&1
        if exist "mongodb.zip" goto download_success
    )

    REM 其次使用curl下载
    where curl >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用 curl 下载...
        curl -fSL --connect-timeout 15 --retry 2 --retry-delay 3 "%%~s" -o mongodb.zip >nul 2>&1
        if %errorlevel% equ 0 goto download_success
    )

    REM 最后使用PowerShell下载
    echo 使用 PowerShell 下载...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; try { (New-Object System.Net.WebClient).DownloadFile('%%~s', 'mongodb.zip') } catch { exit 1 }" >nul 2>&1
    if %errorlevel% equ 0 goto download_success

    echo ❌ 当前源下载失败，尝试下一个源...
    echo.
)

REM 下载失败提示
echo.
echo ❌ 自动下载失败
echo.
echo 💡 解决方案：
echo   1. 手动下载：复制上面的地址到浏览器下载
echo   2. 下载完成后将压缩包放到当前目录，命名为 mongodb.zip
echo   3. 重新运行本脚本
echo.
echo 📌 也可以直接访问阿里云镜像站下载：
echo    https://mirrors.aliyun.com/mongodb/win32/
pause
exit /b 1

:download_success

echo ✅ MongoDB 下载成功！

echo.
set /p unzip="是否要立即解压？(y/N): "
if /i "%unzip%"=="y" (
    call :unzip_mongodb
)

echo.
echo =====================================
echo ✅ 下载完成！
echo =====================================
echo.
echo 💡 部署说明：
echo   1. 将项目（包含 mongodb 文件夹）复制到内网
echo   2. 在内网运行：install-mongodb.bat
echo.
pause
exit /b 0

:unzip_mongodb
echo.
echo 📦 正在解压 mongodb.zip...

REM 检查是否已安装 7-Zip 或 WinRAR
where 7z >nul 2>&1
if %errorlevel% equ 0 (
    echo 使用 7-Zip 解压...
    7z x mongodb.zip -o. >nul
) else (
    where unrar >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用 WinRAR 解压...
        unrar x mongodb.zip . >nul
    ) else (
        echo 使用 PowerShell 解压...
        powershell -Command "Expand-Archive -Path 'mongodb.zip' -DestinationPath '.' -Force"
    )
)

if %errorlevel% neq 0 (
    echo ❌ 解压失败
    echo.
    echo 💡 尝试手动解压：
    echo   1. 右键点击 mongodb.zip
    echo   2. 选择"解压到当前文件夹"
    echo   3. 将解压后的文件夹重命名为 mongodb
    pause
    exit /b 1
)

REM 查找解压后的文件夹
for /f "delims=" %%i in ('dir /ad /b mongodb-win*') do (
    echo 🔄 重命名文件夹...
    rename "%%i" mongodb
    echo ✅ MongoDB 已准备完成！
)

echo.
echo 📁 MongoDB 目录：
echo   位置：%CD%\mongodb\
echo   包含文件：bin\mongod.exe, bin\mongo.exe 等

del mongodb.zip >nul 2>&1
echo ✅ 临时文件已清理
goto :eof
