#!/usr/bin/env bash
# 停止后端服务 (Linux/macOS)
set -e
PIDS=$(pgrep -f "node .*backend/server.js" || true)
if [ -z "$PIDS" ]; then
    echo "ℹ️  未发现运行中的后端进程"
    exit 0
fi
echo "🛑 停止进程: $PIDS"
for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
done
sleep 2
# 强制清理仍在运行的
PIDS=$(pgrep -f "node .*backend/server.js" || true)
if [ -n "$PIDS" ]; then
    for pid in $PIDS; do kill -9 "$pid" 2>/dev/null || true; done
fi
echo "✅ 已停止"
