#!/usr/bin/env bash
# 生产构建 (Linux/macOS)
# 1. 安装/同步 backend 与 frontend 依赖
# 2. 构建 frontend 静态资源到 frontend/dist/
# 3. 把 backend 的 devDependencies 剪掉，得到精简部署目录
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🏗  生产构建"

echo "[1/3] 安装 backend 依赖（包含 dev，用于可能的预处理）..."
(cd backend && npm install --no-audit --no-fund)

if [ -d frontend ]; then
    echo "[2/3] 构建前端..."
    (cd frontend && npm install --no-audit --no-fund && npm run build)
else
    echo "[2/3] 跳过前端：frontend/ 不存在"
fi

echo "[3/3] 剪掉 backend devDependencies..."
(cd backend && npm prune --omit=dev)

echo "✅ 生产构建完成"
echo "  - 后端入口:  backend/server.js"
echo "  - 前端产物:  frontend/dist/"
echo "  - 启动:      ./start.sh   或   pm2 start backend/server.js --name wms"
