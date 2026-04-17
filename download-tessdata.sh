#!/bin/bash

# 仓库管理系统 - OCR训练数据下载脚本
# 下载中文和英文的Tesseract训练数据文件
# 用于离线OCR识别功能

set -e

echo "====================================="
echo "📥 OCR训练数据下载脚本"
echo "====================================="
echo ""

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)/backend"
TESSDATA_URL="https://github.com/tesseract-ocr/tessdata/raw/main"
TESSDATA_BEST_URL="https://github.com/tesseract-ocr/tessdata_best/raw/main"

# 默认使用标准版（速度和精度平衡）
QUALITY="${1:-standard}"

if [ "$QUALITY" = "best" ]; then
    echo "📦 下载最高精度版本（文件较大，识别最准确）"
    BASE_URL="$TESSDATA_BEST_URL"
else
    echo "📦 下载标准版本（速度和精度平衡）"
    BASE_URL="$TESSDATA_URL"
fi

echo ""

# 下载中文简体训练数据
CHI_SIM_FILE="$BACKEND_DIR/chi_sim.traineddata"
if [ -f "$CHI_SIM_FILE" ]; then
    echo "✅ chi_sim.traineddata 已存在 ($(du -h "$CHI_SIM_FILE" | cut -f1))"
    read -p "   是否重新下载？[y/N]: " -r REDOWNLOAD
    if [ "$REDOWNLOAD" != "y" ] && [ "$REDOWNLOAD" != "Y" ]; then
        echo "   跳过下载"
    else
        echo "📥 下载 chi_sim.traineddata ..."
        curl -L -o "$CHI_SIM_FILE" "$BASE_URL/chi_sim.traineddata"
        echo "✅ 下载完成 ($(du -h "$CHI_SIM_FILE" | cut -f1))"
    fi
else
    echo "📥 下载 chi_sim.traineddata ..."
    curl -L -o "$CHI_SIM_FILE" "$BASE_URL/chi_sim.traineddata"
    echo "✅ 下载完成 ($(du -h "$CHI_SIM_FILE" | cut -f1))"
fi

echo ""

# 下载英文训练数据
ENG_FILE="$BACKEND_DIR/eng.traineddata"
if [ -f "$ENG_FILE" ]; then
    echo "✅ eng.traineddata 已存在 ($(du -h "$ENG_FILE" | cut -f1))"
    read -p "   是否重新下载？[y/N]: " -r REDOWNLOAD
    if [ "$REDOWNLOAD" != "y" ] && [ "$REDOWNLOAD" != "Y" ]; then
        echo "   跳过下载"
    else
        echo "📥 下载 eng.traineddata ..."
        curl -L -o "$ENG_FILE" "$BASE_URL/eng.traineddata"
        echo "✅ 下载完成 ($(du -h "$ENG_FILE" | cut -f1))"
    fi
else
    echo "📥 下载 eng.traineddata ..."
    curl -L -o "$ENG_FILE" "$BASE_URL/eng.traineddata"
    echo "✅ 下载完成 ($(du -h "$ENG_FILE" | cut -f1))"
fi

echo ""
echo "====================================="
echo "✅ OCR训练数据准备完成！"
echo "====================================="
echo ""
echo "📂 文件位置: backend/"
echo "   chi_sim.traineddata - 中文简体"
echo "   eng.traineddata     - 英文"
echo ""
echo "💡 使用方法:"
echo "   非Docker: 文件已在正确位置，直接启动服务即可"
echo "   Docker:   docker compose up -d --build"
echo "             (Dockerfile会自动COPY训练数据到镜像)"
echo ""
echo "💡 如需最高精度版本:"
echo "   bash download-tessdata.sh best"
echo ""
