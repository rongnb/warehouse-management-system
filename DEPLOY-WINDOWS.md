# 部署指南 - Windows

## 系统要求

- Windows 10/11 或 Windows Server 2019+
- Node.js 18+ (推荐 20 LTS)

## 安装步骤

### 1. 安装 Node.js

从 https://nodejs.org/ 下载并安装 Node.js 20 LTS

验证安装：
```cmd
node -v
npm -v
```

### 2. 下载并解压项目

将项目解压到 `C:\warehouse-management-system` 或其他目录

### 3. 安装依赖并初始化数据库

双击运行 `install.bat`，或打开命令提示符执行：

```cmd
cd C:\warehouse-management-system
install.bat
```

`install.bat` 会自动完成：
- 安装后端和前端依赖
- 初始化 SQLite 数据库（生成 `data\warehouse.db`）
- 从 `.env.example` 复制生成 `backend\.env`

### 4. 配置

编辑 `backend\.env` 文件，根据需要调整以下配置：

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
```

> 生产环境务必将 `JWT_SECRET` 修改为强随机字符串。

### 5. 启动服务

**方式一：双击 `dev.bat`（开发模式）**
- 同时启动后端（nodemon 热重载）和前端（Vite 开发服务器）
- 脚本会自动检测端口占用，等待服务就绪后输出访问地址
- 适用于开发测试

**方式二：双击 `start.bat`（生产模式）**
- 在独立窗口中启动后端服务
- 脚本会自动检测端口占用，等待后端就绪后输出访问地址
- 适用于仅需后端的部署场景

**方式三：命令行启动**
```cmd
REM 后端（端口 3000）
cd backend
npm start

REM 前端（端口 5173，另开一个窗口）
cd frontend
npm run dev
```

## 防火墙配置

以**管理员身份**打开命令提示符，执行：

```cmd
netsh advfirewall firewall add rule name="WMS-Backend-3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="WMS-Frontend-5173" dir=in action=allow protocol=TCP localport=5173
```

**仅允许局域网访问：**
```cmd
netsh advfirewall firewall add rule name="WMS-Backend-3000" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.0.0/16
netsh advfirewall firewall add rule name="WMS-Frontend-5173" dir=in action=allow protocol=TCP localport=5173 remoteip=192.168.0.0/16
```

**删除规则：**
```cmd
netsh advfirewall firewall delete rule name="WMS-Backend-3000"
netsh advfirewall firewall delete rule name="WMS-Frontend-5173"
```

## 停止服务

**停止后端：** 运行 `stop.bat`，自动查找并终止 `node server.js` 进程

**停止前端：** 关闭 `WMS-Frontend` 命令行窗口

**全部停止：** 关闭 `WMS-Backend` 和 `WMS-Frontend` 命令行窗口

## 生产部署

### 构建前端

```cmd
cd frontend
npm run build
```

前端构建产物在 `frontend/dist/`，可使用 Nginx 或 IIS 部署

### IIS 部署

1. 安装 IIS 和 URL Rewrite 模块
2. 将 `frontend/dist` 复制到 `C:\inetpub\wwwroot\wms`
3. 配置反向代理到后端 `http://localhost:3000`

### Nginx for Windows

1. 从 https://nginx.org/en/download.html 下载 Nginx
2. 修改 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root C:\warehouse-management-system\frontend\dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

## 访问地址

- 前端：http://localhost:5173 或 http://本机IP:5173
- 后端 API：http://localhost:3000

默认管理员账号：`admin` / `admin123`（首次登录后请立即修改密码）

## 常见问题

### 端口被占用

检查端口占用：
```cmd
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
```

结束占用进程：
```cmd
taskkill /F /PID <进程ID>
```

或直接运行 `stop.bat` 停止后端。

### 数据库初始化失败

删除数据库文件后重新初始化：
```cmd
del data\warehouse.db
pushd backend && node db\init.js && popd
```

### 重置数据库（清空所有数据）

```cmd
pushd backend && node db\init.js --reset && popd
```
