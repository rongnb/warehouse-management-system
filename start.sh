#!/usr/bin/env bash
# 启动脚本 — SQLite 版本，无需启动外部数据库服务
set -e
cd "$(dirname "$0")"

if [ ! -d backend/node_modules ]; then
    echo "⚠️  后端依赖未安装，先执行 ./install.sh"
    exit 1
fi

[ -f data/warehouse.db ] || (cd backend && node db/init.js)

exec node backend/server.js
