#!/bin/bash

# 仓库管理系统 - 离线依赖打包脚本（Linux版）
# 此脚本用于在外网机器上打包所有npm依赖
# 打包后拷贝整个项目到内网即可离线安装

echo "====================================="
echo "📦 仓库管理系统 - 离线依赖打包脚本"
echo "====================================="
echo ""
echo "💡 此脚本用于在外网机器上打包所有依赖"
echo "   打包后拷贝整个项目到内网即可离线安装"
echo ""

# 检查是否已安装依赖
if [ ! -d "backend/node_modules" ]; then
    echo "❌ 错误: backend/node_modules 不存在"
    echo "💡 请先运行 bash install.sh 安装完依赖后再打包"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "❌ 错误: frontend/node_modules 不存在"
    echo "💡 请先运行 bash install.sh 安装完依赖后再打包"
    exit 1
fi

echo "====================================="
echo "创建 packages 目录结构"
echo "====================================="
echo ""

mkdir -p packages/backend
mkdir -p packages/frontend
echo "✅ packages 目录已创建"

echo ""
echo "====================================="
echo "复制后端依赖..."
echo "====================================="
echo ""
cp -r backend/node_modules packages/backend/
if [ -f "backend/package-lock.json" ]; then
    cp backend/package-lock.json packages/backend/
fi
echo "✅ 后端依赖已复制到 packages/backend/node_modules"

echo ""
echo "====================================="
echo "复制前端依赖..."
echo "====================================="
echo ""
cp -r frontend/node_modules packages/frontend/
if [ -f "frontend/package-lock.json" ]; then
    cp frontend/package-lock.json packages/frontend/
fi
echo "✅ 前端依赖已复制到 packages/frontend/node_modules"

# 计算打包大小
TOTAL_SIZE=$(du -sh packages/ 2>/dev/null | cut -f1)
echo ""
echo "====================================="
echo "✅ 打包完成！"
echo "====================================="
echo ""
echo "📦 离线包位置: packages/ 目录"
echo "📦 总大小: ${TOTAL_SIZE}"
echo ""
echo "🚀 内网部署步骤:"
echo "   1. 将整个项目目录拷贝到内网机器"
echo "   2. 确保项目根目录包含 packages/ 目录"
echo "   3. 运行: bash install-offline.sh  一键离线安装"
echo "   4. 运行: bash start.sh   启动所有服务"
echo ""
echo "💡 如果需要压缩打包:"
echo "   tar czf warehouse-system-offline.tar.gz --exclude='.git' ."
echo ""
