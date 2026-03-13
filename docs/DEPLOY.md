# 部署文档

## 环境要求
- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm 或 yarn

## 本地开发部署

### 1. 克隆项目
```bash
git clone https://github.com/rongnb/warehouse-management-system.git
cd warehouse-management-system
```

### 2. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 配置环境变量
复制 `backend/.env` 文件，根据实际情况修改配置：
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/warehouse
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads
```

### 4. 初始化数据库
```bash
cd backend
npm run init-db
```
这会创建测试数据，默认账号：
- 管理员：admin / 123456
- 普通用户：staff / 123456

### 5. 启动服务
```bash
# 启动后端服务 (http://localhost:3000)
cd backend
npm run dev

# 启动前端服务 (http://localhost:5173)
cd frontend
npm run dev
```

### 6. 访问系统
打开浏览器访问 http://localhost:5173，使用默认账号登录。

## 生产环境部署

### 1. 构建前端
```bash
cd frontend
npm run build
```
构建产物会生成在 `dist` 目录。

### 2. 配置 Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件
    location /uploads {
        alias /path/to/backend/uploads;
    }
}
```

### 3. 后端服务管理
使用 PM2 管理 Node.js 进程：
```bash
npm install -g pm2
cd backend
pm2 start server.js --name warehouse-backend
```

设置开机自启：
```bash
pm2 startup
pm2 save
```

## Docker 部署
> 待补充

## 数据库备份
```bash
# 备份
mongodump -d warehouse -o ./backup

# 恢复
mongorestore -d warehouse ./backup/warehouse
```

## 常见问题
### 1. 数据库连接失败
- 检查 MongoDB 服务是否启动
- 检查 `.env` 中的 `MONGODB_URI` 配置是否正确
- 检查数据库账号密码权限

### 2. 前端无法访问后端 API
- 检查后端服务是否正常启动
- 检查 CORS 配置
- 检查前端 `vite.config.ts` 中的代理配置

### 3. 登录失败
- 确认账号密码正确
- 检查 JWT_SECRET 配置是否正确
- 查看后端日志排查错误
