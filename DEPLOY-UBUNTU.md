# 部署指南 - Ubuntu 24.04

## 系统要求

- Ubuntu 24.04 LTS (Desktop 或 Server)
- Node.js 18+ (推荐 20 LTS)
- 至少 2GB 内存

## 安装步骤

### 1. 安装 Node.js

```bash
# 使用 NodeSource 安装 LTS 版本
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 10.x.x
```

### 2. 安装构建工具（用于 sqlite3 等原生模块）

```bash
sudo apt-get install -y python3 make g++ build-essential
```

### 3. 上传项目文件

将项目上传到服务器，例如 `/opt/warehouse-management-system/`

```bash
sudo cp -r warehouse-management-system /opt/
cd /opt/warehouse-management-system
```

### 4. 安装依赖

```bash
# 安装后端依赖
cd backend && npm install --no-audit --no-fund

# 安装前端依赖
cd ../frontend && npm install --no-audit --no-fund
```

### 5. 配置

```bash
# 复制环境变量文件
cp backend/.env.example backend/.env

# 编辑配置（可选）
nano backend/.env
```

### 6. 初始化数据库

```bash
cd backend && node db/init.js
```

### 7. 启动服务

**开发模式（前后台同时运行）：**
```bash
./dev.sh
```

**生产模式（后台运行）：**
```bash
./start.sh &
```

**停止服务：**
```bash
./stop.sh
```

## Nginx 反向代理配置（可选）

如果需要通过域名访问，安装 Nginx：

```bash
sudo apt-get install -y nginx
```

创建配置文件 `/etc/nginx/sites-available/warehouse`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/warehouse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 防火墙配置

```bash
# 开放端口（仅限内网访问）
sudo ufw allow 3000/tcp comment 'WMS Backend'
sudo ufw allow 5173/tcp comment 'WMS Frontend'

# 或者仅允许特定 IP 访问
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 5173

# 启用防火墙
sudo ufw enable
```

## 服务管理（systemd）

创建服务文件 `/etc/systemd/system/warehouse.service`:

```ini
[Unit]
Description=Warehouse Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/warehouse-management-system
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable warehouse
sudo systemctl start warehouse

# 查看状态
sudo systemctl status warehouse
```

## 访问地址

- 前端：http://服务器IP:5173
- 后端 API：http://服务器IP:3000

默认管理员账号：`admin` / `admin123`