#!/usr/bin/env bash
# 安装脚本 (Linux/macOS) — SQLite 版本，无需外部数据库服务。
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 仓库管理系统 - 安装脚本"
echo "=============================="

# 1. 检查 Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ 未检测到 Node.js。请先安装 Node.js >= 18 (推荐 20 LTS)。"
    echo "   下载: https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v)
echo "✅ Node.js $NODE_VER"

# 2. 安装后端依赖
echo "📥 安装后端依赖..."
(cd backend && npm install --no-audit --no-fund)

# 3. 安装前端依赖（可选：若无 frontend 或只部署接口服务，可跳过）
if [ -d frontend ]; then
    echo "📥 安装前端依赖..."
    (cd frontend && npm install --no-audit --no-fund)
fi

# 4. 初始化 SQLite 数据库（幂等：已存在则跳过种子，结构通过 sync 对齐）
echo "🗄  初始化 SQLite 数据库..."
(cd backend && node db/init.js)

# 5. 创建 .env（如果不存在）
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "📝 已生成 backend/.env，请根据需要修改（JWT_SECRET、PORT 等）"
fi

echo ""
echo "✅ 安装完成！"
echo "下一步："
echo "  启动后端:     cd backend && npm start"
echo "  启动前端开发: cd frontend && npm run dev"
echo "  默认管理员:   admin / admin123  (首次登录后请立即修改)"
