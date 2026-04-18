# 部署说明 (v1.0 · SQLite 版本)

## 与 v0.x 的差异

v0.x 使用 MongoDB；v1.0 改用 SQLite 单文件数据库，离线部署不再需要安装、启动、维护 mongod。

## 部署模式

### 模式 1：从源码部署（有网）
```bash
git clone <repo>
cd warehouse-management-system
./install.sh          # 或 install.bat
./start.sh            # 或 start.bat
```

### 模式 2：离线包部署（无网）
1. 在有网机器上为目标平台拉 Release 包：
   - Linux: `wms-offline-vX.Y.Z-linux.tar.gz`
   - Windows: `wms-offline-vX.Y.Z-win.zip`
2. 目标机器先安装 Node.js 20 LTS（从官网下载离线安装包）。
3. 解压到目标路径：
   ```bash
   tar xzf wms-offline-vX.Y.Z-linux.tar.gz
   cd wms
   ./install-offline.sh    # 利用包内 node_modules，零网络
   ./start.sh
   ```
   Windows：`install-offline.bat` 然后 `start.bat`
4. 浏览器访问 `http://<服务器IP>:3000`，用 `admin / admin123` 登录。

### 模式 3：Docker
```bash
cd backend
docker build -t wms .
docker run -d --name wms \
  -p 3000:3000 \
  -v $(pwd)/../data:/app/../data \
  -v $(pwd)/uploads:/app/uploads \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  wms
```
宿主机的 `data/` 目录即 SQLite 数据文件所在目录，直接 `cp` 即可备份。

## 生产环境建议

- 使用 `pm2` 常驻：`pm2 start backend/server.js --name wms`，开机自启 `pm2 startup && pm2 save`
- 前端由 nginx 或后端静态服务，构建：`cd frontend && npm run build`（产出 `frontend/dist/`）
- **务必修改 `backend/.env` 中的 `JWT_SECRET`**（默认值仅供开发）
- 反向代理加 HTTPS：nginx 或 caddy 均可

## 数据备份

SQLite 最大优势：单文件直接 copy。
```bash
# 手动备份
cp data/warehouse.db "data/warehouse-$(date +%Y%m%d-%H%M%S).db"

# cron 每天 3:00 自动备份并保留 30 天
0 3 * * * cd /path/to/wms && cp data/warehouse.db data/backup-$(date +\%F).db && find data/backup-*.db -mtime +30 -delete
```
推荐配合 rsync 到异地：`rsync -avz data/*.db user@backup:/backup/wms/`

**注意**：如果后端正在运行，为了数据一致性建议使用 SQLite 原生 `.backup` 命令或先停服再 cp：
```bash
sqlite3 data/warehouse.db ".backup data/warehouse-live-$(date +%F).db"
```

## 升级

```bash
git pull
npm install --prefix backend
npm install --prefix frontend && npm run build --prefix frontend
# 重启服务（pm2 restart wms 或 docker restart wms）
```

本 PR 未引入迁移框架；后续 schema 变化会附 migration 脚本。

## 历史数据迁移（MongoDB → SQLite）

**本项目 v1.0 不自动迁移**。若需要把旧 MongoDB 数据导入 SQLite，建议：

1. 在旧环境执行 `mongoexport --db warehouse --collection <name> --out <name>.json` 把每个集合导出为 JSON。
2. 编写一次性脚本（Node.js 环境下）：
   ```js
   const data = require('./users.json'); // 旧 _id: ObjectId, 新 id: integer
   const { User } = require('./backend/models');
   await User.bulkCreate(data.map(({ _id, ...rest }) => rest));
   ```
3. ID 类型从 ObjectId 变成 integer：外键引用需要用 old `_id` → new `id` 的映射表重写。建议按 "先建用户/仓库/分类/供应商（无外部依赖） → 建商品（依赖前述） → 建库存/流水/盘点" 的顺序导入。
4. 导入完成后务必跑一遍 `npm test` 或手动核对报表输出。

如数据量大，可联系维护者获取专用迁移脚本（不在本代码仓内）。

## 常见问题排查

| 症状 | 排查 |
|------|------|
| 服务启动 SQLITE_BUSY | 其他进程占用 db 文件；确认只有一个后端进程 |
| sqlite3 模块报 `could not locate the bindings` | Node 版本与预编译二进制不匹配，重新 `npm rebuild sqlite3` |
| 登录 401 而密码正确 | 检查 `backend/.env` 中的 `JWT_SECRET` 是否与创建 token 时一致 |
| Excel 导出下载是乱码 | 用 Excel 打开 CSV 时选 UTF-8；本项目 CSV 已带 BOM 兼容 Excel |
| OCR 识别失败 | 检查 `backend/chi_sim.traineddata` 和 `backend/eng.traineddata` 是否存在 |

## 端口 / 环境变量

见 `backend/.env.example`。核心变量：
- `PORT`：HTTP 端口，默认 3000
- `SQLITE_PATH`：数据库文件路径，默认 `./data/warehouse.db`
- `JWT_SECRET`：JWT 签名密钥，**生产环境必改**
- `NODE_ENV`：`development` / `production` / `test`
- `LOG_LEVEL`：`error` / `warn` / `info` / `http` / `debug`
