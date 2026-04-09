#!/bin/bash
set -e

echo "====================================="
echo "仓库管理系统 环境依赖安装脚本"
echo "支持系统：Ubuntu 20.04+/Debian 11+，兼容旧CPU"
echo "====================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]
  then echo "请使用sudo运行脚本: sudo bash install.sh"
  exit 1
fi

# 注释掉CDROM源避免错误
echo "🧹 清理APT源配置..."
sed -i "s/^deb cdrom:/# deb cdrom:/" /etc/apt/sources.list || true

echo "🔧 请选择安装方式："
echo "   1) 安装本地MongoDB（自动兼容旧CPU）"
echo "   2) 跳过MongoDB安装（已安装MongoDB）"
echo ""
read -p "请输入选择 [1-2]: " -r INSTALL_MONGO_CHOICE
echo ""

if [ -z "$INSTALL_MONGO_CHOICE" ]; then
  INSTALL_MONGO_CHOICE="1"
fi

echo "1/4 安装基础系统依赖..."
apt install -y curl git build-essential ca-certificates gnupg lsb-release netcat-openbsd wget

echo "2/4 安装Node.js 22.x 环境..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g npm@latest
echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装MongoDB - 自动检测CPU兼容性
if [ "$INSTALL_MONGO_CHOICE" = "1" ]; then
  echo ""
  echo "3/4 检测CPU并安装MongoDB..."

  # 检查是否支持AVX指令集
  if grep -q avx /proc/cpuinfo; then
    echo "ℹ️  CPU支持AVX指令集，安装MongoDB 8.0"
    rm -f /etc/apt/sources.list.d/mongodb*.list
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/mongodb.gpg
    echo "deb [ arch=amd64 signed-by=/etc/apt/trusted.gpg.d/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    apt install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    echo "✅ MongoDB 8.0 安装完成"
    echo "✅ MongoDB 服务状态: $(systemctl is-active mongod)"
  else
    echo "ℹ️  CPU不支持AVX指令集（如Intel J1900等旧CPU），安装MongoDB 4.0.25二进制版本"
    cd /tmp
    if [ ! -f mongodb-linux-x86_64-4.0.25.tgz ]; then
      wget -q https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-4.0.25.tgz
    fi
    tar xzf mongodb-linux-x86_64-4.0.25.tgz
    cp -R mongodb-linux-x86_64-4.0.25/bin/* /usr/local/bin/
    mkdir -p /data/db
    chown -R $SUDO_USER /data/db
    chmod +x /usr/local/bin/mongod /usr/local/bin/mongo
    echo "✅ MongoDB 4.0.25 (兼容旧CPU) 安装完成到 /usr/local/bin/"
    echo "💡 提示：使用 mongod --fork --logpath /tmp/mongodb.log --dbpath /data/db 启动"
  fi
elif [ "$INSTALL_MONGO_CHOICE" = "2" ]; then
  echo ""
  echo "3/4 跳过MongoDB安装..."
  if command -v mongod &> /dev/null; then
    echo "✅ 检测到mongod: $(mongod --version | head -1)"
  else
    echo "⚠️  未检测到mongod命令，请确认MongoDB已安装"
  fi
fi

echo ""
echo "4/4 安装项目前后端依赖..."
cd backend && npm install
# 修复nodemon执行权限
chmod +x node_modules/.bin/nodemon 2>/dev/null || true

cd ../frontend && npm install
# 修复vite执行权限
chmod +x node_modules/.bin/vite 2>/dev/null || true

cd ..

echo ""
echo "🗄️  初始化数据库..."
cd backend

# 等待 MongoDB 就绪
sleep 2

# 运行数据库初始化
node init-db.js

cd ..

# 修复权限：将项目目录所有者改回给运行 sudo 的用户
echo "🔧 修复文件权限..."
chown -R $SUDO_USER:$SUDO_USER .

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
    if [ -f /usr/local/bin/mongod ]; then
      echo "💾 MongoDB: 已安装 ✅ 就绪（手动启动: mongod --fork --logpath /tmp/mongodb.log --dbpath /data/db）"
    else
      echo "💾 MongoDB: 已安装 ⚠️  未运行"
    fi
  fi
else
  echo "💾 MongoDB: 未本地安装，请确认已安装"
fi

echo "🟢 Node.js: $(node --version)"
echo "🟢 npm: $(npm --version)"
echo ""
echo "🚀 启动方式："
echo "   bash start.sh"
echo "   启动后访问：http://localhost:5173"
echo ""
echo "🛑 停止服务："
echo "   bash stop.sh"
echo "====================================="
