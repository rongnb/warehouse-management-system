# 仓库管理系统 (Warehouse Management System) v0.0.2

专注于仓库物品管理的企业级系统，支持墨盒、硒鼓、色带、纸张、电子产品等多种物品类型的库存管理。

## ✨ 功能特性

### 📦 核心功能
- **用户登录**：JWT身份认证，密码加密存储，多角色权限控制
- **产品管理**：支持墨盒、硒鼓、色带、各类规格纸张、电子产品等物品的录入、编辑、分类
- **库存管理**：实时库存查询、库存预警、出入库记录追踪
- **盘库功能**：支持双人盘库流程，自动计算盘盈盘亏，生成盘库报表
- **出入库管理**：完整的入库/出库流程，支持批次追踪
- **数据导出**：支持库存报表、盘库报表导出

### 🔒 安全特性
- JWT身份认证
- 密码bcrypt加密存储
- 接口权限校验

### 📱 用户体验
- 响应式设计，支持PC和移动端
- Element Plus UI组件库
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
- MongoDB 数据库 (Mongoose ODM)
- JWT 身份验证
- bcrypt 密码加密

## 🚀 快速启动

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 6.0 (本地安装)

### 方式一：一键安装脚本

#### Linux/macOS
```bash
# 安装所有依赖
chmod +x install.sh
./install.sh

# 一键启动
./start.sh

# 停止服务
./stop.sh
```

#### Windows
```bash
# 安装所有依赖
install.bat

# 一键启动
start.bat

# 停止服务
stop.bat
```

### 方式二：手动启动

#### 1. 启动MongoDB
确保本地MongoDB服务已启动（默认端口27017）

#### 2. 后端启动
```bash
cd backend
npm install
npm start
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

## 📋 主要业务流程

### 入库流程
1. 创建入库单，选择供应商和物品
2. 录入入库数量和批次信息
3. 审核通过后系统自动更新库存

### 出库流程
1. 创建出库单，选择出库物品
2. 录入出库数量和用途
3. 审核通过后系统自动扣减库存

### 盘库流程
1. 仓管员A发起盘库，选择盘库仓库
2. 系统自动拉取当前库存数据
3. 仓管员A录入实际盘点数量
4. 系统自动计算盘盈盘亏数据
5. 仓管员B进行复核确认
6. 复核通过后系统自动更新库存，生成盘盈盘亏记录

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
│   └── package.json       # 版本 0.0.2
├── backend/               # 后端代码
│   ├── models/            # 数据模型
│   ├── routes/            # 接口路由
│   ├── middleware/        # 中间件
│   ├── server.js          # 入口文件
│   └── package.json       # 版本 0.0.2
├── database/              # 数据库脚本
│   └── init.js            # 数据初始化脚本
├── install.sh             # Linux安装脚本
├── install.bat            # Windows安装脚本
├── start.sh               # Linux启动脚本
├── start.bat              # Windows启动脚本
├── stop.sh                # Linux停止脚本
├── stop.bat               # Windows停止脚本
└── README.md              # 本文档
```

## 🤝 贡献
欢迎提交Issue和Pull Request！

## 📄 许可证
MIT License
