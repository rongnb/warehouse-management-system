# 仓库管理系统 (Warehouse Management System)

基于 **Node.js + Express + SQLite + Vue 3** 的局域网仓库管理系统。零外部数据库依赖，数据完全保存在单个 SQLite 文件中，适合内网离线部署。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [用户角色与权限](#用户角色与权限)
- [API 接口概览](#api-接口概览)
- [数据库模型](#数据库模型)
- [配置说明](#配置说明)
- [测试](#测试)
- [部署](#部署)
- [常见问题](#常见问题)

---

## 功能特性

| 模块 | 说明 |
|------|------|
| **主数据管理** | 商品、分类（树形多级）、供应商、仓库 |
| **库存管理** | 多仓库实时库存、预警阈值（低库存/超储）、库存状态过滤 |
| **出入库流水** | 单据号自动生成、金额自动计算、审批流、操作员与审核员审计字段 |
| **双重确认盘点** | 草稿 → 初盘 → 复盘 → 完成；盘盈/盘亏自动生成库存调整流水 |
| **报表与导出** | 6 类报表（库存/出入库/盘点/供应商/预警/操作日志），Excel + CSV 流式导出 |
| **OCR 图像识别** | Tesseract.js 离线 OCR，支持中英文混合识别，无需外部 API |
| **RBAC 权限控制** | 4 种角色（admin / manager / staff / warehouse_keeper） |
| **错误处理与日志** | 统一 AppError 体系、Winston 结构化日志、每请求 requestId 追踪 |
| **安全防护** | JWT 鉴权、bcrypt 密码哈希、频率限制（登录 20 次/15min，写操作 50 次/15min） |
| **跨平台支持** | Windows、Linux、macOS；提供一键安装脚本 |
| **Docker 就绪** | 后端/前端各有 Dockerfile，多阶段构建，最小镜像 |

---

## 技术栈

### 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| Express | 4.18 | HTTP 框架 |
| Sequelize | 6.37 | ORM |
| sqlite3 | 5.1 | 数据库驱动（单文件，无需独立服务） |
| jsonwebtoken | 9.0 | JWT 鉴权 |
| bcryptjs | 2.4 | 密码哈希 |
| multer | 2.0 | 文件上传 |
| tesseract.js | 5.0 | 离线 OCR |
| exceljs | 4.4 | Excel 流式导出 |
| winston | 3.19 | 结构化日志 |
| express-rate-limit | 7.4 | 频率限制 |

### 前端

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 框架（Composition API） |
| Vite | 8.0 | 构建工具 |
| TypeScript | 5.9 | 类型安全 |
| Element Plus | 2.13 | UI 组件库 |
| Pinia | 3.0 | 状态管理 |
| Vue Router | 4.6 | 路由（含导航守卫） |
| Axios | 1.13 | HTTP 客户端 |
| ECharts | 6.0 | 数据可视化 |
| tesseract.js | 7.0 | 浏览器端 OCR |
| exceljs | 4.4 | 客户端 Excel 生成 |

### 测试 / 工具

- **Jest** 29 + **supertest** 7：后端单元测试与集成测试（SQLite `:memory:`）
- **nodemon**：开发热重载

---

## 快速开始

### 环境要求

- **Node.js >= 18**（推荐 20 LTS）
- Git（可选，用于克隆仓库）

### Linux / macOS

```bash
# 1. 克隆仓库
git clone <repo-url> warehouse-management-system
cd warehouse-management-system

# 2. 安装依赖 + 初始化数据库（含种子数据）
./install.sh

# 3a. 开发模式（后端热重载 + 前端 Vite 开发服务器）
./dev.sh

# 3b. 生产模式（仅启动后端；前端需单独构建并部署到 Nginx）
./start.sh
```

### Windows

```cmd
# 1. 安装依赖 + 初始化数据库
install.bat

# 2a. 开发模式
dev.bat

# 2b. 生产模式
start.bat

# 停止服务
stop.bat
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:3000 |
| 前端开发服务器 | http://localhost:5173 |
| 前端生产（Nginx） | http://localhost:80 |

### 默认管理员账号

```
用户名: admin
密码:   admin123
```

> **首次登录后请立即修改密码！**

### 数据文件

- 数据库：`data/warehouse.db`（SQLite 单文件）
- **备份只需复制该文件**，即完整备份所有业务数据。

---

## 项目结构

```
warehouse-management-system/
├── backend/                        # Express 后端
│   ├── db/
│   │   ├── index.js               # Sequelize 连接配置
│   │   └── init.js                # 建表脚本 + 种子数据
│   ├── models/                    # 10 个 Sequelize 模型
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Category.js
│   │   ├── Supplier.js
│   │   ├── Warehouse.js
│   │   ├── Inventory.js
│   │   ├── Transaction.js
│   │   ├── Stocktake.js
│   │   ├── StocktakeItem.js
│   │   ├── SystemConfig.js
│   │   └── index.js               # 模型初始化与关联
│   ├── routes/                    # 14 个路由模块
│   │   ├── auth.js, users.js
│   │   ├── products.js, inventory.js, transactions.js
│   │   ├── categories.js, suppliers.js, warehouses.js
│   │   ├── stocktake.js, dashboard.js
│   │   ├── reports.js, system.js, logs.js, ocr.js
│   ├── services/
│   │   ├── ocr.js                 # Tesseract OCR 服务
│   │   └── reports/               # 报表生成（CSV / Excel）
│   ├── middleware/
│   │   ├── auth.js                # JWT 鉴权 + requireRole
│   │   └── errorHandler.js        # 统一错误响应
│   ├── errors/
│   │   └── AppError.js            # 自定义错误体系
│   ├── utils/
│   │   └── logger.js              # Winston 日志配置
│   ├── uploads/                   # 上传文件目录
│   ├── server.js                  # Express 入口
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                       # Vue 3 前端
│   ├── src/
│   │   ├── api/                   # 11 个 API 调用模块（TypeScript）
│   │   ├── components/            # 可复用组件
│   │   │   ├── Layout.vue
│   │   │   ├── CameraComponent.vue
│   │   │   ├── ImageRecognitionComponent.vue
│   │   │   └── ExcelImportComponent.vue
│   │   ├── views/                 # 12 个页面组件
│   │   ├── router/index.ts        # 路由 + 导航守卫
│   │   ├── stores/index.ts        # Pinia 全局状态
│   │   └── utils/
│   │       ├── request.ts         # Axios 实例（含拦截器）
│   │       └── imageRecognition.ts
│   ├── vite.config.ts
│   ├── nginx.conf                 # 生产 Nginx 配置
│   └── Dockerfile
│
├── data/                           # SQLite 数据库（.gitignore）
│   └── warehouse.db
├── test/
│   ├── unit/                      # 单元测试
│   ├── integration/               # 集成测试（:memory: SQLite）
│   └── fixtures/
├── .github/workflows/             # CI + 离线包 Release 自动化
│
├── install.sh / install.bat       # 依赖安装 + 数据库初始化
├── install-offline.sh / .bat      # 离线安装（预下载依赖包）
├── dev.sh / dev.bat               # 开发模式启动
├── start.sh / start.bat           # 生产模式启动
├── stop.sh / stop.bat             # 停止服务
├── build-production.sh / .bat     # 前端生产构建
├── jest.config.js                 # 测试配置
└── README.md
```

---

## 用户角色与权限

| 角色 | 说明 |
|------|------|
| `admin` | 超级管理员，拥有所有权限（含用户管理、系统配置） |
| `manager` | 仓库经理，可审核流水、查看报表、管理主数据 |
| `staff` | 普通员工，可创建出入库流水、查看库存 |
| `warehouse_keeper` | 仓库保管员，专注于本仓库的盘点与出入库操作 |

鉴权机制：HTTP Header `Authorization: Bearer <JWT>`，Token 有效期 24 小时（可配置）。

---

## API 接口概览

所有接口前缀：`/api`。除登录接口外，均需携带 JWT Token。

| 路由前缀 | 功能 |
|----------|------|
| `POST /api/auth/login` | 登录，返回 JWT |
| `GET /api/auth/profile` | 获取当前用户信息 |
| `PUT /api/auth/change-password` | 修改密码 |
| `/api/users` | 用户 CRUD |
| `/api/products` | 商品 CRUD，支持 Excel 批量导入 |
| `/api/categories` | 分类树 CRUD |
| `/api/suppliers` | 供应商 CRUD |
| `/api/warehouses` | 仓库 CRUD，支持仓库管理员分配 |
| `/api/inventory` | 库存查询、手动调整、低库存过滤 |
| `/api/transactions` | 出入库流水 CRUD + 审核 |
| `/api/stocktake` | 盘点单创建、初盘确认、复盘确认、完成 |
| `/api/dashboard` | 统计汇总、图表数据、预警列表 |
| `/api/reports` | 6 类报表，支持 Excel/CSV 流式下载 |
| `/api/ocr` | 图片上传 + Tesseract 离线文字识别 |
| `/api/logs` | 操作审计日志查询 |
| `/api/system` | 系统配置、健康检查 |

### 统一错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "requestId": "trace-id",
  "details": {}
}
```

| HTTP 状态码 | 含义 |
|-------------|------|
| 400 | 参数错误 |
| 401 | 未鉴权（Token 缺失/无效） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 数据冲突（重复键等） |
| 422 | 字段校验失败 |
| 500 | 服务器内部错误 |

---

## 数据库模型

共 10 个 Sequelize 模型，数据库为 SQLite 单文件（`data/warehouse.db`）。

```
User          → 用户账号（角色、状态、最后登录）
Product       → 商品 / SKU（含 categoryId, supplierId）
Category      → 分类（自关联树形，支持多级）
Supplier      → 供应商
Warehouse     → 仓库（含负责人 managerId）
Inventory     → 库存（productId + warehouseId 唯一约束）
Transaction   → 出入库流水（type: 'in'|'out'，含审核字段）
Stocktake     → 盘点单（4 状态：draft/firstChecked/secondChecked/completed）
StocktakeItem → 盘点明细（系统数量 vs 实际数量 vs 差异）
SystemConfig  → 系统配置（key-value，单例模式）
```

### 重要业务规则

- **出入库单据号**：系统自动生成（不可手动填写）
- **库存调整**：盘点完成后，系统自动为每条差异记录生成 Transaction 流水
- **分类树**：通过 `parentId` 自关联，支持无限层级
- **库存唯一约束**：同一商品在同一仓库只有一条库存记录，数量累加

---

## 配置说明

### 后端 `.env`

复制 `backend/.env.example` 为 `backend/.env`，根据需要修改：

```env
# 数据库（相对于 backend/ 目录）
SQLITE_PATH=../data/warehouse.db

# 服务端口
PORT=3000

# 运行环境
NODE_ENV=development     # development | production | test

# JWT 配置
JWT_SECRET=change-me-in-production   # 生产环境必须修改！
JWT_EXPIRES_IN=24h

# 日志级别
LOG_LEVEL=info           # error | warn | info | http | debug
```

### 前端 `.env`

复制 `frontend/.env.example` 为 `frontend/.env`（开发模式通常不需要修改，Vite 代理会自动转发 `/api`）：

```env
VITE_BACKEND_HOST=localhost
VITE_BACKEND_URL=http://localhost:3000
```

---

## 测试

```bash
# 在项目根目录执行
npm test

# 仅跑单元测试
npm run test:unit

# 仅跑集成测试（使用 SQLite :memory:，无需启动服务）
npm run test:integration
```

当前测试状态：**47 passed / 4 skipped**
- skipped：Excel 流式导出 × 2，OCR 真实 Tesseract × 2

---

## 部署

### 开发模式

```bash
# Linux/macOS
./install.sh && ./dev.sh

# Windows
install.bat && dev.bat
```

开发模式下，后端使用 `nodemon` 热重载，前端使用 Vite 开发服务器，修改代码后自动刷新。

### 生产模式（推荐 pm2）

```bash
# 安装 pm2
npm install -g pm2

# 构建前端
cd frontend && npm run build && cd ..

# 启动后端
cd backend
npm ci --omit=dev
node db/init.js          # 初始化/迁移数据库
pm2 start server.js --name wms
pm2 save && pm2 startup  # 设置开机自启

# 将 frontend/dist/ 部署到 Nginx
```

### Docker

```bash
# 构建镜像
docker build -t wms-backend backend/
docker build -t wms-frontend frontend/

# 启动后端（挂载数据目录以持久化数据库）
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/../data \
  -e JWT_SECRET=your-secret \
  --name wms-backend \
  wms-backend

# 启动前端（Nginx，代理到后端）
docker run -d -p 80:80 --name wms-frontend wms-frontend
```

### 离线部署

Tag `v*` 会触发 GitHub Actions，自动打包 `wms-offline-vX.Y.Z-linux.tar.gz` / `-win.zip`，包含所有 node_modules，可在无网环境部署。详见 [DEPLOY_INSTRUCTION.md](DEPLOY_INSTRUCTION.md)。

### 平台专项指南

- Ubuntu/Linux 生产部署（含 systemd + Nginx）：[DEPLOY-UBUNTU.md](DEPLOY-UBUNTU.md)
- Windows 生产部署（含 IIS / Nginx for Windows）：[DEPLOY-WINDOWS.md](DEPLOY-WINDOWS.md)

---

## 常见问题

**Q: 数据库文件在哪里？如何备份？**
A: `data/warehouse.db`。直接复制该文件即为完整备份。恢复时替换回原位置即可。

**Q: 忘记管理员密码怎么办？**
A: 运行 `node backend/db/init.js --reset` 重置数据库（**注意：会清空所有数据**），或使用项目根目录的 `reset-password.js` 脚本仅重置密码。

**Q: 如何重置数据库（清空所有数据）？**
A: `cd backend && npm run reset-db`

**Q: 前端访问提示网络错误？**
A: 检查后端是否正常运行（`http://localhost:3000/api/system`），以及前端的 API 代理配置是否正确（`frontend/vite.config.ts` 或 `frontend/.env`）。

**Q: OCR 识别准确率低？**
A: Tesseract.js 对清晰、高对比度图片效果最佳。建议上传分辨率 ≥ 300dpi、背景干净的图片。中文识别依赖 `chi_sim.traineddata` 语言包，首次运行会自动下载。

**Q: 如何修改端口？**
A: 后端端口：修改 `backend/.env` 中的 `PORT`。前端代理：修改 `frontend/vite.config.ts` 中的 proxy 目标地址。

---

## 历史说明

v1.0 之前系统使用 MongoDB。v1.0 迁移到 SQLite 以简化离线部署，不再需要 mongod 服务。若有历史 MongoDB 数据需导入，请参考 [DEPLOY_INSTRUCTION.md](DEPLOY_INSTRUCTION.md) 中的迁移章节。

---

## 许可证

ISC
