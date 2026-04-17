#!/usr/bin/env bash
# 离线依赖打包 (Linux/macOS)
# 在有网机器上运行：把 backend / frontend 的 npm 依赖缓存到 ./packages/，
# 之后整个项目目录可以拷贝到内网机器配合 install-offline.sh 离线安装。
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OUT_DIR="$SCRIPT_DIR/packages"
mkdir -p "$OUT_DIR"

echo "📦 离线依赖打包"
echo "   缓存目录: $OUT_DIR"

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ 未检测到 npm" && exit 1
fi

echo "📥 缓存后端依赖..."
(cd backend && npm install --no-audit --no-fund --cache="$OUT_DIR")

if [ -d frontend ]; then
    echo "📥 缓存前端依赖..."
    (cd frontend && npm install --no-audit --no-fund --cache="$OUT_DIR")
fi

# 同步 npm 缓存到 verdaccio-style tarball 目录（npm install --offline 需要）
echo "✅ 完成。将整个项目目录（含 packages/ 与各自 node_modules/）拷贝到目标机器后："
echo "   ./install-offline.sh   # 会自动使用 packages/ 缓存"
