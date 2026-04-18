# 仓库管理系统 (Warehouse Management System)

基于 Node.js + Express + **SQLite** + Vue 3 的局域网仓库管理系统。零外部数据库依赖，数据完全保存在单个 SQLite 文件中，适合内网离线部署。

## 特性

- 商品 / 分类 / 供应商 / 仓库 主数据管理
- 库存管理（多仓库、批次、库位、预警阈值）
- 出入库流水（单据号自动生成，金额自动计算，审计字段）
- 双重确认盘点（盘盈/盘亏自动生成库存调整流水）
- 6 类报表（库存 / 出入库流水 / 盘点 / 供应商供货 / 库存预警 / 操作日志），支持 Excel + CSV 流式导出
- OCR 图像识别（Tesseract，中英混合，离线）
- RBAC：admin / manager / staff / warehouse_keeper
- 统一的错误处理与结构化日志（winston）

## 技术栈

- **后端**: Node.js 20 · Express 4 · Sequelize v6 · sqlite3
- **前端**: Vue 3 · Vite · Element Plus · Pinia
- **测试**: Jest + supertest（sqlite `:memory:` 集成测试）

## 快速开始

### 环境要求
- Node.js >= 18（推荐 20 LTS）

### Linux / macOS
```bash
./install.sh   # 安装后端/前端依赖 + 初始化 SQLite
./start.sh     # 启动后端（默认 http://localhost:3000）
# 前端开发服务器另开终端：
cd frontend && npm run dev
```

### Windows
```cmd
install.bat
start.bat
```

### 默认管理员账号
```
用户名: admin
密码:   admin123
```
**首次登录后请立即修改密码。**

### 数据文件位置
`data/warehouse.db`（SQLite 单文件）— 备份该文件即完整备份。

## 目录结构

```
.
├── backend/
│   ├── db/             # Sequelize 连接 + 初始化脚本（含种子数据）
│   ├── models/         # 9 个 Sequelize 模型 + 关联
│   ├── routes/         # HTTP 路由（Express）
│   ├── services/       # 业务逻辑（reports, ocr）
│   ├── middleware/     # auth, errorHandler, asyncHandler
│   ├── errors/         # AppError 及子类（统一错误体系）
│   ├── utils/          # logger
│   └── server.js       # 入口
├── frontend/           # Vue 3 + Vite
├── data/               # SQLite 数据库文件目录（.gitignore）
├── test/
│   ├── unit/
│   ├── integration/    # sqlite :memory: 集成测试
│   └── fixtures/
├── .github/workflows/  # CI + Release offline package
├── install.sh / install.bat
├── install-offline.sh / install-offline.bat
└── start.sh / start.bat
```

## 测试

```bash
cd backend && npm install
cd .. && npm test           # 等价 npx jest --config jest.config.js
```
当前：47 passed / 4 skipped（skipped：Excel 流式 × 2，OCR 真 tesseract × 2）。

## 部署

- 开发：`./install.sh && ./start.sh`
- 生产（推荐 pm2）：`cd backend && npm ci --omit=dev && node db/init.js && pm2 start server.js --name wms`
- Docker：`docker build -t wms backend/ && docker run -p 3000:3000 -v $(pwd)/data:/app/../data wms`
- 离线包：Tag `v*` 触发 `.github/workflows/release.yml`，产出 `wms-offline-vX.Y.Z-linux.tar.gz` / `-win.zip`（详见 DEPLOY_INSTRUCTION.md）

## 历史说明

v1.0 之前系统使用 MongoDB。v1.0 迁移到 SQLite 以简化离线部署，不再需要 mongod 服务。若有历史 MongoDB 数据需导入，请参考 DEPLOY_INSTRUCTION.md 中的迁移章节（需手写一次性导出导入脚本）。

## 许可证

ISC
