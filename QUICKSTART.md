# 快速开始

## 前置条件
- Node.js 20 LTS（https://nodejs.org/）

## 步骤

### Linux / macOS
```bash
./install.sh      # 安装依赖 + 初始化 SQLite（首次）
./start.sh        # 启动后端
# 开发模式前端：
cd frontend && npm run dev
```

### Windows
```cmd
install.bat
start.bat
```

## 登录
- 地址：前端开发 http://localhost:5173 或生产 http://localhost:3000
- 默认账号：**admin / admin123**（首次登录请立刻修改）

## 数据与备份
所有业务数据存于 `data/warehouse.db`。备份只需复制该文件：
```bash
cp data/warehouse.db data/warehouse-$(date +%F).db
```

## 重置数据库
```bash
cd backend && RESET=true node db/init.js
```
**注意：会清空所有业务数据并重新种子 admin/默认仓库/3 个默认分类。**

## 常见问题

**Q: 初始化时报 `SQLITE_CANTOPEN`？**
A: 检查 `data/` 目录是否存在且可写。`install.sh` / `install.bat` 会自动创建。

**Q: sqlite3 安装失败？**
A: 需要 C/C++ 编译工具链。Ubuntu: `sudo apt-get install -y build-essential python3`；Windows: 安装 "Build Tools for Visual Studio"。或使用 prebuilt：`npm install sqlite3 --build-from-source=false`。

**Q: 端口 3000 被占用？**
A: 编辑 `backend/.env` 修改 `PORT=xxxx`。

**Q: 离线内网部署没有 npm 私服？**
A: 在有网机器上运行 `npm install` 之后把 `backend/node_modules` 和 `frontend/node_modules` 一起 tar 到目标机器；或者走 Release 离线包（tag `v*` 触发）。

**Q: 之前用 MongoDB，数据怎么办？**
A: 本次迁移不自动转换。参考 DEPLOY_INSTRUCTION.md 的"历史数据迁移"章节（需手写导出/导入脚本）。
