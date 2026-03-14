#!/bin/bash

echo "正在停止仓库管理系统所有服务..."

# 停止后端服务（端口3000）
BACKEND_PID=$(lsof -t -i:3000 2>/dev/null || true)
if [ -n "$BACKEND_PID" ]; then
  kill $BACKEND_PID
  echo "✅ 后端服务（端口3000）已停止"
else
  echo "ℹ️ 未找到运行中的后端服务"
fi

# 停止前端服务（端口5173）
FRONTEND_PID=$(lsof -t -i:5173 2>/dev/null || true)
if [ -n "$FRONTEND_PID" ]; then
  kill $FRONTEND_PID
  echo "✅ 前端服务（端口5173）已停止"
else
  echo "ℹ️ 未找到运行中的前端服务"
fi

echo "====================================="
echo "所有服务已停止完成"
echo "====================================="
