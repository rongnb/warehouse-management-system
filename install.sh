#!/bin/bash
set -e

echo "====================================="
echo "仓库管理系统 环境依赖安装脚本"
echo "支持系统：Ubuntu 20.04+/Debian 11+"
echo "====================================="

# 检查是否为root用户
if [ "$EUID" -ne 0 ]
  then echo "请使用sudo运行脚本: sudo bash install.sh"
  exit 1
fi

echo "1/7 更新系统软件源..."
apt update -y

echo "2/7 安装基础系统依赖..."
apt install -y curl git build-essential ca-certificates gnupg lsb-release

echo "3/7 安装Node.js 22.x 环境..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g npm@latest

echo "4/7 添加Docker官方GPG密钥..."
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "5/7 配置Docker软件源..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "6/7 安装Docker和Docker Compose..."
apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "7/7 安装项目前后端依赖..."
cd backend && npm install
cd ../frontend && npm install
cd ..

echo "====================================="
echo "✅ 环境依赖安装完成！"
echo "====================================="
echo "启动方式："
echo "1. 容器化一键启动（推荐）："
echo "   docker compose up -d"
echo "   启动后访问：http://localhost"
echo ""
echo "2. 本地开发模式启动："
echo "   # 启动后端"
echo "   cd backend && npm start"
echo "   # 启动前端（新开终端）"
echo "   cd frontend && npm run dev"
echo "   前端访问：http://localhost:5173"
echo "====================================="
