# 仓库管理系统 (Warehouse Management System)

一个专注于盘库管理的企业级仓库管理系统，支持双人盘库核实流程，默认季度盘库机制。

## ✨ 功能特性

### 📦 核心功能（仅保留登录和盘库功能）
- **用户登录**：JWT身份认证，密码加密存储，多角色权限控制
- **盘库管理**：支持双人盘库流程，自动计算盘盈盘亏，生成盘库报表
- **双人核实**：盘库录入和复核必须由不同用户操作，确保数据准确性
- **盘库频率**：默认一季度一次，管理员可配置为月度/季度/半年度/年度
- **权限管理**：多角色权限控制（管理员/仓管员）
- **数据导出**：支持盘库报表和库存数据导出

### 🔒 安全特性
- JWT身份认证
- 密码加密存储
- 接口权限校验
- 操作日志记录

### 📱 用户体验
- 响应式设计，支持PC和移动端
- Element Plus UI组件库，界面美观
- 操作简单易用，符合仓库管理实际流程

## 🛠️ 技术栈

### 前端
- Vue 3 + Vite + TypeScript
- Element Plus UI组件库
- Axios 网络请求
- Vue Router 路由管理
- Pinia 状态管理

### 后端
- Node.js + Express
- MongoDB 数据库
- JWT 身份验证
- bcrypt 密码加密

## 🚀 快速启动

### 方式一：Docker Compose 一键部署（推荐）
```bash
# 克隆项目
git clone <仓库地址>
cd warehouse-management

# 一键启动所有服务
docker-compose up -d
```
- 前端访问地址：http://localhost
- 服务会自动初始化数据库和默认数据

---

### 方式二：一键启动脚本
#### Linux/macOS
```bash
# 确保 MongoDB 服务已启动
chmod +x start.sh
./start.sh
```

#### Windows
```bash
# 确保 MongoDB 服务已启动
start.bat
```
- 前端访问地址：http://localhost:5173
- 后端接口地址：http://localhost:3000

---

### 方式三：手动启动

#### 环境要求
- Node.js >= 16.0.0
- MongoDB >= 4.0

#### 1. 数据库初始化
```bash
# Linux/macOS
cd database
chmod +x init.sh
./init.sh

# Windows
cd database
init.bat
```

#### 2. 后端启动
```bash
cd backend
npm install
npm run dev
```
后端服务运行在 http://localhost:3000

#### 3. 前端启动
```bash
cd frontend
npm install
npm run dev
```
前端服务运行在 http://localhost:5173

---

### 默认账号
| 角色 | 账号 | 密码 | 权限说明 |
|------|------|------|----------|
| 系统管理员 | `admin` | `123456` | 系统配置、用户管理、盘库复核、数据查看 |
| 仓管员A | `keeper_a` | `123456` | 发起盘库、录入盘点数据 |
| 仓管员B | `keeper_b` | `123456` | 盘库复核、录入盘点数据 |

## 📋 业务流程

### 盘库流程
1. 仓管员A发起盘库，选择盘库仓库
2. 系统自动拉取当前库存数据
3. 仓管员A录入实际盘点数量
4. 系统自动计算盘盈盘亏数据
5. 仓管员B（或管理员）进行复核确认
6. 复核通过后系统自动更新库存，生成盘盈盘亏记录
7. 支持导出盘库报表

### 盘库频率配置
- 默认一季度一次
- 管理员可在系统设置中调整为：月度/季度/半年度/年度
- 支持配置盘库提醒提前天数

## 📁 项目结构
```
warehouse-management/
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── api/           # 接口封装
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 公共组件
│   │   ├── router/        # 路由配置
│   │   └── stores/        # 状态管理
│   ├── Dockerfile         # 前端 Docker 配置
│   ├── nginx.conf         # Nginx 配置
│   └── package.json
├── backend/               # 后端代码
│   ├── models/            # 数据模型
│   ├── routes/            # 接口路由
│   ├── middleware/        # 中间件
│   ├── server.js          # 入口文件
│   ├── Dockerfile         # 后端 Docker 配置
│   └── package.json
├── database/              # 数据库脚本
│   ├── init.js            # 数据初始化脚本
│   ├── init.sh            # Linux/macOS 初始化脚本
│   └── init.bat           # Windows 初始化脚本
├── docs/                  # 项目文档
│   ├── 部署指南.md        # 详细部署说明
│   ├── 使用说明.md        # 系统使用手册
│   └── 常见问题解答.md    # 常见问题排查
├── docker-compose.yml     # Docker Compose 配置
├── start.sh               # Linux/macOS 一键启动脚本
├── start.bat              # Windows 一键启动脚本
└── README.md
```

## 📚 文档说明
- [部署指南](./docs/部署指南.md)：详细的部署步骤和配置说明
- [使用说明](./docs/使用说明.md)：系统功能介绍和操作指南
- [常见问题解答](./docs/常见问题解答.md)：常见问题排查和解决方案

## 🤝 贡献
欢迎提交Issue和Pull Request！

## 📄 许可证
MIT License
