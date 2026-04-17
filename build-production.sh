#!/bin/bash

# 仓库管理系统 - 生产版本构建脚本
# 用于构建前端静态文件和准备后端生产部署

set -e

echo "====================================="
echo "🏗️  仓库管理系统 - 生产版本构建"
echo "====================================="
echo ""

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# 选择构建方式
echo ""
echo "请选择构建方式："
echo "   1) 本地构建（构建前端静态文件 + 准备后端）"
echo "   2) Docker 构建（使用 docker-compose）"
echo ""
read -p "请输入选择 [1-2]: " -r BUILD_CHOICE
echo ""

if [ "$BUILD_CHOICE" = "2" ]; then
    # Docker 构建
    echo "====================================="
    echo "🐳 Docker 构建模式"
    echo "====================================="

    if ! command -v docker &> /dev/null; then
        echo "❌ 错误: Docker 未安装"
        exit 1
    fi

    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo "❌ 错误: Docker Compose 未安装"
        exit 1
    fi

    echo "📦 构建并启动所有服务..."
    if command -v docker compose &> /dev/null; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi

    echo ""
    echo "====================================="
    echo "✅ Docker 部署完成！"
    echo "====================================="
    echo ""
    echo "🌐 访问地址: http://localhost"
    echo "🔧 后端接口: http://localhost:3000"
    echo ""
    echo "💡 管理命令："
    echo "   查看状态: docker compose ps"
    echo "   查看日志: docker compose logs -f"
    echo "   停止服务: docker compose down"
    echo "   重启服务: docker compose restart"
    echo ""
    exit 0
fi

# 本地构建
echo "====================================="
echo "[1/4] 安装后端生产依赖"
echo "====================================="
cd backend
if [ ! -d "node_modules" ]; then
    npm install --production
else
    echo "✅ 后端依赖已安装"
fi

# 创建 .env
if [ ! -f ".env" ]; then
    cp .env.example .env
    # 更新为生产模式
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    echo "✅ 创建了生产环境配置 .env"
else
    echo "✅ .env 配置已存在"
fi
cd ..

echo ""
echo "====================================="
echo "[2/4] 安装前端依赖"
echo "====================================="
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ 前端依赖已安装"

echo ""
echo "====================================="
echo "[3/4] 构建前端静态文件"
echo "====================================="
echo "📦 正在构建..."
npm run build
echo "✅ 前端构建完成，输出目录: frontend/dist/"
cd ..

echo ""
echo "====================================="
echo "[4/4] 准备生产部署目录"
echo "====================================="
DIST_DIR="dist-production"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/backend"
mkdir -p "$DIST_DIR/frontend"
mkdir -p "$DIST_DIR/database"

# 复制后端文件
cp -r backend/server.js "$DIST_DIR/backend/"
cp -r backend/routes "$DIST_DIR/backend/"
cp -r backend/models "$DIST_DIR/backend/"
cp -r backend/middleware "$DIST_DIR/backend/"
cp -r backend/utils "$DIST_DIR/backend/"
cp backend/package.json "$DIST_DIR/backend/"
cp backend/package-lock.json "$DIST_DIR/backend/" 2>/dev/null || true
cp backend/.env "$DIST_DIR/backend/"
if [ -d "backend/node_modules" ]; then
    cp -r backend/node_modules "$DIST_DIR/backend/"
fi

# 复制OCR训练数据
cp backend/*.traineddata "$DIST_DIR/backend/" 2>/dev/null || true

# 复制前端构建产物
cp -r frontend/dist/* "$DIST_DIR/frontend/"

# 复制数据库初始化脚本
cp -r database/* "$DIST_DIR/database/"

# 复制启动脚本
cp start.sh "$DIST_DIR/" 2>/dev/null || true
cp stop.sh "$DIST_DIR/" 2>/dev/null || true
cp start.bat "$DIST_DIR/" 2>/dev/null || true
cp stop.bat "$DIST_DIR/" 2>/dev/null || true

# 创建生产启动脚本
cat > "$DIST_DIR/start-production.sh" << 'SCRIPT'
#!/bin/bash
echo "====================================="
echo "🚀 仓库管理系统 - 生产模式启动"
echo "====================================="

# 启动后端
cd backend
NODE_ENV=production node server.js &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
cd ..

echo ""
echo "🌐 后端接口地址: http://localhost:3000"
echo "📁 前端静态文件: frontend/ (需要Nginx或其他Web服务器)"
echo ""
echo "💡 推荐使用Nginx托管前端静态文件并反向代理后端API"
echo "按 Ctrl+C 停止服务"

trap "kill $BACKEND_PID; exit 0" INT
wait
SCRIPT
chmod +x "$DIST_DIR/start-production.sh"

echo "✅ 生产部署目录已准备: $DIST_DIR/"

echo ""
echo "====================================="
echo "✅ 生产版本构建完成！"
echo "====================================="
echo ""
echo "📁 部署目录: $DIST_DIR/"
echo "   backend/     - 后端Node.js应用"
echo "   frontend/    - 前端静态文件"
echo "   database/    - 数据库初始化脚本"
echo ""
echo "💡 部署方式："
echo "   1. 将 $DIST_DIR/ 复制到生产服务器"
echo "   2. 使用 Nginx 托管 frontend/ 静态文件"
echo "   3. 运行 bash start-production.sh 启动后端"
echo ""
echo "💡 或使用 Docker："
echo "   docker compose up -d --build"
echo ""
