#!/bin/bash
set -e

echo "====================================="
echo "仓库管理系统 环境依赖安装脚本"
echo "支持系统：Ubuntu 20.04+/Debian 11+"
echo "====================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]
  then echo "请使用sudo运行脚本: sudo bash install.sh"
  exit 1
fi

echo "🔧 请选择安装方式："
echo "   1) 安装本地MongoDB（开发模式推荐）"
echo "   2) 使用Docker运行MongoDB（生产推荐）"
echo "   3) 跳过MongoDB安装（已安装MongoDB）"
echo ""
read -p "请输入选择 [1-3]: " -r INSTALL_MONGO_CHOICE
echo ""

if [ -z "$INSTALL_MONGO_CHOICE" ]; then
  INSTALL_MONGO_CHOICE="1"
fi

echo "1/6 更新系统软件源..."
apt update -y

echo "2/6 安装基础系统依赖..."
apt install -y curl git build-essential ca-certificates gnupg lsb-release netcat-openbsd

echo "3/6 安装Node.js 22.x 环境..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g npm@latest
echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装MongoDB（如果选择了）
if [ "$INSTALL_MONGO_CHOICE" = "1" ]; then
  echo ""
  echo "4/6 安装MongoDB服务器..."
  curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/mongodb.gpg
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
  apt update -y
  apt install -y mongodb-org

  echo "启动MongoDB服务..."
  systemctl start mongod
  systemctl enable mongod

  echo "✅ MongoDB 安装完成"
  echo "✅ MongoDB 服务状态: $(systemctl is-active mongod)"
elif [ "$INSTALL_MONGO_CHOICE" = "3" ]; then
  echo ""
  echo "4/6 跳过MongoDB安装..."
  if command -v mongod &> /dev/null; then
    echo "✅ 检测到mongod: $(mongod --version | head -1)"
  else
    echo "⚠️  未检测到mongod命令，请确认MongoDB已安装"
  fi
fi

echo ""
echo "5/6 安装Docker和Docker Compose..."
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "✅ Docker 安装完成: $(docker --version)"
echo "✅ Docker Compose 安装完成"

echo ""
echo "6/6 安装项目前后端依赖..."
cd backend && npm install
cd ../frontend && npm install
cd ..

echo ""
echo "====================================="
echo "✅ 环境依赖安装完成！"
echo "====================================="
echo ""

# 最终状态报告
if command -v mongod &> /dev/null; then
  if systemctl is-active mongod &> /dev/null; then
    echo "💾 MongoDB: 已安装 ✅ 运行中"
  else
    echo "💾 MongoDB: 已安装 ⚠️  未运行，请启动: sudo systemctl start mongod"
  fi
else
  echo "💾 MongoDB: 未本地安装，请使用Docker运行"
fi

echo "🟢 Node.js: $(node --version)"
echo "🐳 Docker: $(docker --version 2>/dev/null || echo '未安装')"
echo ""
echo "🚀 启动方式："
if [ "$INSTALL_MONGO_CHOICE" = "1" ] || [ "$INSTALL_MONGO_CHOICE" = "3" ]; then
  echo "1. 本地开发模式启动："
  echo "   bash start.sh"
  echo "   启动后访问：http://localhost:5173"
  echo ""
fi
echo "2. 容器化一键启动："
echo "   docker compose up -d"
echo "   启动后访问：http://localhost"
echo ""
echo "🛑 停止服务："
echo "   bash stop.sh"
echo "====================================="
