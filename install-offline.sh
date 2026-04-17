#!/bin/bash

# 仓库管理系统 - 离线安装脚本（Linux版）
# 此脚本用于在内网环境中安装依赖，无需联网
# 需要 packages 目录中的离线依赖包

echo "====================================="
echo "仓库管理系统 - 离线安装脚本"
echo "====================================="
echo ""
echo "此脚本用于在内网环境中安装依赖"
echo "需要 packages 目录中的离线依赖包"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装，请先安装 Node.js >= 16.0.0"
    exit 1
fi
echo "✅ Node.js 已安装: $(node --version)"

# 检查是否有 packages 目录
if [ ! -d "packages" ]; then
    echo "❌ 错误: 未找到 packages 目录"
    echo ""
    echo "💡 如果有 node_modules 备份，可以直接恢复:"
    echo "   1. 将后端 node_modules 复制到 backend/"
    echo "   2. 将前端 node_modules 复制到 frontend/"
    echo ""
    echo "💡 或在外网机器上运行 bash package-deps.sh 打包依赖"
    exit 1
fi

echo "====================================="
echo "[1/4] 安装后端依赖"
echo "====================================="
echo ""

if [ -d "packages/backend/node_modules" ]; then
    if [ -d "backend/node_modules" ]; then
        echo "⚠️  后端 node_modules 已存在，跳过复制"
    else
        echo "📦 复制后端依赖..."
        cp -r packages/backend/node_modules backend/
        # 修复可执行文件权限
        chmod +x backend/node_modules/.bin/* 2>/dev/null || true
        echo "✅ 后端依赖已复制"
    fi
else
    echo "⚠️  packages/backend/node_modules 不存在"
    echo "📦 尝试从 npm 安装后端依赖..."
    cd backend && npm ci && cd ..
fi

echo ""
echo "====================================="
echo "[2/4] 安装前端依赖"
echo "====================================="
echo ""

if [ -d "packages/frontend/node_modules" ]; then
    if [ -d "frontend/node_modules" ]; then
        echo "⚠️  前端 node_modules 已存在，跳过复制"
    else
        echo "📦 复制前端依赖..."
        cp -r packages/frontend/node_modules frontend/
        # 修复可执行文件权限
        chmod +x frontend/node_modules/.bin/* 2>/dev/null || true
        echo "✅ 前端依赖已复制"
    fi
else
    echo "⚠️  packages/frontend/node_modules 不存在"
    echo "📦 尝试从 npm 安装前端依赖..."
    cd frontend && npm ci && cd ..
fi

echo ""
echo "====================================="
echo "[3/4] 配置文件"
echo "====================================="
echo ""

# 复制 lock 文件
if [ -f "packages/backend/package-lock.json" ]; then
    cp packages/backend/package-lock.json backend/ 2>/dev/null
fi
if [ -f "packages/frontend/package-lock.json" ]; then
    cp packages/frontend/package-lock.json frontend/ 2>/dev/null
fi

# 创建后端 .env（如果不存在）
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ 创建了 backend/.env 配置文件"
    fi
fi

echo "✅ 配置文件已同步"

echo ""
echo "====================================="
echo "[4/4] 初始化数据库"
echo "====================================="
echo ""

echo "🗄️  正在初始化数据库..."
node database/init.js
if [ $? -ne 0 ]; then
    echo "⚠️  数据库初始化失败，请确认MongoDB服务已启动"
else
    echo "✅ 数据库初始化完成"
fi

echo ""
echo "====================================="
echo "✅ 离线安装完成！"
echo "====================================="
echo ""
echo "💡 启动服务:"
echo "   一键启动: bash start.sh"
echo ""
echo "💡 停止服务:"
echo "   bash stop.sh"
echo ""
