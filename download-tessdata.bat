@echo off
chcp 65001 >nul
echo ============================================
echo 📥 OCR训练数据下载脚本
echo ============================================
echo.

set BACKEND_DIR=%~dp0backend
set TESSDATA_URL=https://github.com/tesseract-ocr/tessdata/raw/main

echo 📦 下载标准版本（速度和精度平衡）
echo.

REM 检查curl是否可用
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到curl命令
    echo 💡 Windows 10及以上版本自带curl
    echo    如果没有，请手动下载以下文件到 backend\ 目录:
    echo    %TESSDATA_URL%/chi_sim.traineddata
    echo    %TESSDATA_URL%/eng.traineddata
    pause
    exit /b 1
)

REM 下载中文简体训练数据
if exist "%BACKEND_DIR%\chi_sim.traineddata" (
    echo ✅ chi_sim.traineddata 已存在
    set /p REDOWNLOAD="   是否重新下载？[y/N]: "
    if /i "%REDOWNLOAD%"=="y" (
        echo 📥 下载 chi_sim.traineddata ...
        curl -L -o "%BACKEND_DIR%\chi_sim.traineddata" "%TESSDATA_URL%/chi_sim.traineddata"
        echo ✅ 下载完成
    ) else (
        echo    跳过下载
    )
) else (
    echo 📥 下载 chi_sim.traineddata ...
    curl -L -o "%BACKEND_DIR%\chi_sim.traineddata" "%TESSDATA_URL%/chi_sim.traineddata"
    echo ✅ 下载完成
)

echo.

REM 下载英文训练数据
if exist "%BACKEND_DIR%\eng.traineddata" (
    echo ✅ eng.traineddata 已存在
    set /p REDOWNLOAD="   是否重新下载？[y/N]: "
    if /i "%REDOWNLOAD%"=="y" (
        echo 📥 下载 eng.traineddata ...
        curl -L -o "%BACKEND_DIR%\eng.traineddata" "%TESSDATA_URL%/eng.traineddata"
        echo ✅ 下载完成
    ) else (
        echo    跳过下载
    )
) else (
    echo 📥 下载 eng.traineddata ...
    curl -L -o "%BACKEND_DIR%\eng.traineddata" "%TESSDATA_URL%/eng.traineddata"
    echo ✅ 下载完成
)

echo.
echo ============================================
echo ✅ OCR训练数据准备完成！
echo ============================================
echo.
echo 📂 文件位置: backend\
echo    chi_sim.traineddata - 中文简体
echo    eng.traineddata     - 英文
echo.
echo 💡 使用方法:
echo    非Docker: 文件已在正确位置，直接启动服务即可
echo    Docker:   docker compose up -d --build
echo.
pause
