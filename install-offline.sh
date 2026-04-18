#!/usr/bin/env bash
# 离线安装脚本 (Linux/macOS)
# 前提：npm 依赖已通过 package-deps.sh 打包为 packages/ 目录。
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 仓库管理系统 - 离线安装 (SQLite 版本)"
echo "=========================================="

if ! command -v node >/dev/null 2>&1; then
    echo "❌ 未检测到 Node.js，请先手动安装 Node.js >= 18 (推荐 20 LTS)"
    exit 1
fi

# 若存在离线依赖包缓存，则使用离线缓存；否则尝试普通安装
OFFLINE_CACHE="$SCRIPT_DIR/packages"
NPM_FLAGS="--no-audit --no-fund"
if [ -d "$OFFLINE_CACHE" ]; then
    echo "📂 使用离线依赖缓存: $OFFLINE_CACHE"
    NPM_FLAGS="$NPM_FLAGS --offline --prefer-offline --cache=$OFFLINE_CACHE"
fi

echo "📥 安装后端依赖..."
(cd backend && npm install $NPM_FLAGS)

if [ -d frontend ]; then
    echo "📥 安装前端依赖..."
    (cd frontend && npm install $NPM_FLAGS)
    echo "🏗  构建前端..."
    (cd frontend && npm run build)
fi

echo "🗄  初始化 SQLite 数据库..."
(cd backend && node db/init.js)

[ -f backend/.env ] || cp backend/.env.example backend/.env

echo ""
echo "✅ 离线安装完成！"
echo "启动: cd backend && npm start"
echo "默认管理员: admin / admin123"
