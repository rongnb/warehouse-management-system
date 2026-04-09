@echo off
chcp 65001 >nul
echo.
echo ============================================
echo  Tesseract 语言包下载工具
echo ============================================
echo.

set "DEST_DIR=%~dp0public\tessdata"
set "TMP_DIR=%TEMP%"

echo 下载目录: %DEST_DIR%
echo.

if not exist "%DEST_DIR%" (
    mkdir "%DEST_DIR%"
    echo 创建目录: %DEST_DIR%
)

REM 检查是否已存在语言包
set "MISSING_FILES="
if not exist "%DEST_DIR%\chi_sim.traineddata" (
    set "MISSING_FILES=%MISSING_FILES% chi_sim.traineddata"
)
if not exist "%DEST_DIR%\eng.traineddata" (
    set "MISSING_FILES=%MISSING_FILES% eng.traineddata"
)

if "%MISSING_FILES%"=="" (
    echo 所有语言包已存在！
    echo.
    echo 按任意键退出...
    pause >nul
    exit /b 0
)

echo 需要下载的文件: %MISSING_FILES%
echo.
echo 下载中...
echo.

REM 下载中文语言包
if not exist "%DEST_DIR%\chi_sim.traineddata" (
    echo 下载 chi_sim.traineddata (中文简体)...
    powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata', '%DEST_DIR%\chi_sim.traineddata')"
    if exist "%DEST_DIR%\chi_sim.traineddata" (
        echo 成功下载 chi_sim.traineddata
    ) else (
        echo 下载 chi_sim.traineddata 失败！
    )
    echo.
)

REM 下载英文语言包
if not exist "%DEST_DIR%\eng.traineddata" (
    echo 下载 eng.traineddata (英文)...
    powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata', '%DEST_DIR%\eng.traineddata')"
    if exist "%DEST_DIR%\eng.traineddata" (
        echo 成功下载 eng.traineddata
    ) else (
        echo 下载 eng.traineddata 失败！
    )
    echo.
)

echo ============================================
echo 下载完成！
echo.
echo 文件已保存到: %DEST_DIR%
echo.
echo 使用方法:
echo 1. 确保启动了服务器
echo 2. 访问 /test-ocr 页面
echo 3. Tesseract将自动使用本地语言包
echo.
echo 按任意键退出...
pause >nul
