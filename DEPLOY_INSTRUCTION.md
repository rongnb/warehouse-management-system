# 仓库管理系统 - 内网部署说明

---

## 💾 第一部分：MongoDB 安装指南

### 1.1 MongoDB 安装方式选择

我们提供 **3 种 MongoDB 安装方式**，按优先级排序：

| 方式 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方式A：ZIP 离线安装（推荐）** | 不需要管理员权限，完全可控 | 需要手动配置 | ⭐⭐⭐⭐⭐ |
| **方式B：MSI 安装包** | 官方安装向导，简单 | 需要管理员权限 | ⭐⭐⭐ |
| **方式C：Docker 容器** | 快速部署，隔离性好 | 需要 Docker 环境 | ⭐⭐ |

---

### 1.2 方式A：ZIP 离线安装（推荐）

#### 第1步：下载 MongoDB

在**有网的机器**上下载 MongoDB：

1. **访问官网**：
   - 打开: https://www.mongodb.com/try/download/community

2. **选择版本**：
   - Version: 选择 **4.4.x** 或 **6.0.x** (LTS版本，稳定可靠)
   - Platform: **Windows**
   - Package: **ZIP** (不是 MSI)

3. **下载 ZIP 文件**：
   - 下载后文件名类似：`mongodb-windows-x86_64-4.4.25.zip`

#### 第2步：准备文件

1. **解压 ZIP 文件**：
   - 解压到任意目录
   - 解压后会有一个类似 `mongodb-win32-x86_64-4.4.25` 的文件夹

2. **重命名文件夹**：
   - 将文件夹重命名为 `mongodb`

3. **移动到项目根目录**：
   - 将 `mongodb` 文件夹移动到项目根目录
   - 确保位置：`e:\warehouse-management-system\mongodb`

#### 第3步：验证目录结构

确认以下目录结构：

```
e:\warehouse-management-system\
├── mongodb\
│   └── bin\
│       ├── mongod.exe        <-- 重要
│       ├── mongo.exe         <-- 重要
│       └── ...(其他文件)...
├── backend\
├── frontend\
├── database\
└── ...(其他文件)...
```

#### 第4步：安装服务

在内网服务器上，**右键点击 `install-mongodb.bat`，选择"以管理员身份运行"**：

```batch
# 管理员方式运行
install-mongodb.bat
```

**脚本功能：**
- ✅ 自动创建数据目录
- ✅ 自动创建日志目录
- ✅ 自动生成配置文件
- ✅ 安装为 Windows 服务
- ✅ 启动 MongoDB 服务

#### 第5步：验证安装

```batch
# 检查状态
mongodb-status.bat
```

如果看到：
- ✅ MongoDB 服务正在运行
- ✅ 成功连接到 MongoDB
- ✅ 版本号显示

说明 MongoDB 安装成功！

---

### 1.3 方式B：MSI 安装包

如果你有 MSI 安装包：

1. **运行安装程序**：
   - 双击 `mongodb-windows-x86_64-4.4.25.msi`
   - 选择 "Complete" (完全安装)

2. **安装时选择**：
   - 服务名: `MongoDB`
   - 数据目录: `C:\data\db` 或自定义

3. **安装后配置**：
   - 确认 MongoDB 服务已启动
   - 或运行：`mongodb-start.bat`

---

### 1.4 MongoDB 管理脚本

| 脚本名 | 功能 | 说明 |
|--------|------|------|
| **install-mongodb.bat** | 安装 MongoDB | 首次安装使用（需要管理员） |
| **mongodb-start.bat** | 启动 MongoDB | 启动 MongoDB 服务 |
| **mongodb-stop.bat** | 停止 MongoDB | 停止 MongoDB 服务 |
| **mongodb-status.bat** | 检查状态 | 查看 MongoDB 运行状态 |

---

## 🏠 部署前准备

### 1. 环境检查

请确认内网服务器已具备以下环境：

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | >= 16.0.0 | 下载地址: https://nodejs.org/ |
| **MongoDB** | >= 4.4 (LTS) | 下载地址: https://www.mongodb.com/try/download/community |
| **Windows** | 7 及以上 | 支持 Windows Server 2008/2012/2016/2019/2022 |

### 2. 端口占用

确保以下端口未被占用：
- 前端: **5173**
- 后端: **3000**
- MongoDB: **27017**

### 3. MongoDB 离线安装包准备

如果你没有 MongoDB 安装包，可以使用我们提供的脚本自动下载：

```batch
# 在有网的机器上
运行: download-mongodb.bat
```

或者手动下载：
1. 访问: https://www.mongodb.com/try/download/community
2. 选择 **Windows** → **ZIP** (不是 MSI)
3. 下载后解压到项目根目录，重命名为 `mongodb`
4. 确保目录结构: `e:\warehouse-management-system\mongodb\bin\mongod.exe`

---

## 🚀 部署方式

### 方式一：离线一键部署（推荐）

#### 第1步：在有网机器下载依赖
在可以访问互联网的机器上：

1. **下载项目**：获取完整的仓库管理系统代码
2. **下载依赖**：运行 `download-deps.bat`，自动下载 npm 依赖
3. **打包依赖**：运行 `package-deps.bat`，将依赖打包到 `packages\` 目录

#### 第2步：传输到内网
将整个项目（包含 `packages\` 目录）复制到内网服务器。

#### 第3步：在内网安装
在内网服务器上：

```batch
# 运行离线安装脚本
双击运行: install-offline.bat
```

**脚本功能：**
- ✅ 自动检测并安装依赖（优先使用本地 packages）
- ✅ 初始化 MongoDB 数据库
- ✅ 配置默认账号
- ✅ 验证安装结果

---

### 方式二：传统部署（需要内网 npm 源）

如果内网有 npm 源（如 Nexus 或 Verdaccio），可以使用传统方式：

```batch
# 安装依赖
双击运行: install.bat

# 如果需要指定 npm 源
npm config set registry http://your-internal-registry/
npm install --registry=http://your-internal-registry/
```

---

## 🔧 启动服务

### 1. 一键启动

```batch
# 启动所有服务（推荐）
双击运行: start.bat
```

**服务启动后：**
- 浏览器访问：http://localhost:5173
- 后端接口：http://localhost:3000
- 默认账号：`admin` / `123456`

### 2. 单独启动

```batch
# 仅启动后端
双击运行: backend-start.bat

# 仅启动前端
双击运行: frontend-start.bat
```

### 3. 停止服务

```batch
# 停止所有服务
双击运行: stop.bat
```

---

## 📋 默认账号

| 角色 | 用户名 | 密码 | 权限说明 |
|------|--------|------|----------|
| 管理员 | `admin` | `123456` | 所有功能，包括系统设置 |
| 仓管员A | `keeper_a` | `123456` | 商品、库存、盘点 |
| 仓管员B | `keeper_b` | `123456` | 商品、库存、盘点 |

---

## 🛠️ 常见问题

### 1. MongoDB 连接失败

**症状：**
- 数据库初始化失败
- `init-db.bat` 显示连接错误

**解决方案：**

#### 检查 MongoDB 服务是否启动

```batch
# 检查 MongoDB 服务状态
sc query MongoDB

# 如果未启动，尝试启动
net start MongoDB
```

#### 如果未安装 MongoDB 服务

```batch
# 以服务方式安装 MongoDB
mongod --install --dbpath "D:\MongoDB\data" --logpath "D:\MongoDB\logs\mongod.log"
net start MongoDB
```

#### 检查防火墙设置

```batch
# 检查防火墙是否阻止端口
netstat -an | findstr :27017
```

### 2. 端口被占用

**症状：**
- 服务启动失败
- 提示 "Address already in use"

**解决方案：**

#### 检查端口占用

```batch
# 检查 27017 端口（MongoDB）
netstat -ano | findstr :27017

# 检查 3000 端口（后端）
netstat -ano | findstr :3000

# 检查 5173 端口（前端）
netstat -ano | findstr :5173
```

#### 终止占用端口的进程

```batch
# 找到 PID 后（如 1234）
taskkill /F /PID 1234
```

### 3. 内网访问

**症状：**
- 本机可以访问，但其他机器无法访问

**解决方案：**

#### 检查防火墙

```batch
# 允许访问 5173 端口（前端）
netsh advfirewall firewall add rule name="仓库管理系统-前端" dir=in action=allow protocol=TCP localport=5173

# 允许访问 3000 端口（后端）
netsh advfirewall firewall add rule name="仓库管理系统-后端" dir=in action=allow protocol=TCP localport=3000
```

#### 配置监听地址

修改配置文件以支持外部访问。

---

## 🔄 数据备份与恢复

### 备份数据

```batch
# 备份数据
mongodump --db warehouse --out "备份路径"

# 或使用脚本
node scripts/backup.js
```

### 恢复数据

```batch
# 恢复数据
mongorestore --db warehouse "备份路径\warehouse"

# 或使用脚本
node scripts/restore.js
```

---

## 📊 监控与维护

### 查看日志

- **后端日志：** `backend\logs\app.log`（需配置）
- **前端日志：** 浏览器控制台
- **MongoDB 日志：** 默认为 MongoDB 安装目录的 logs 目录

### 定期维护

#### 清理日志

```batch
# 清理日志脚本（示例）
forfiles -p "C:\path\to\logs" -s -m *.log -d -7 -c "cmd /c del @path"
```

#### 备份数据

建议每日自动备份数据。

---

## 📞 技术支持

如遇到无法解决的问题，请检查：

1. **运行环境**：Node.js 和 MongoDB 版本是否符合要求
2. **网络配置**：端口和防火墙设置
3. **数据存储**：MongoDB 数据目录权限
4. **日志分析**：查看项目日志和系统事件查看器

---

## 📝 配置说明

### 环境变量

创建 `.env` 文件配置环境变量：

```env
# MongoDB 连接字符串
MONGODB_URI=mongodb://localhost:27017/warehouse

# 后端端口
PORT=3000

# JWT 密钥
JWT_SECRET=your-secret-key

# 前端配置
VITE_API_BASE_URL=http://localhost:3000
```

### 数据库配置

初始化数据库后，可以通过管理界面修改：

1. 登录系统（`admin` / `123456`）
2. 进入 **系统设置** → **参数配置**
3. 修改仓库地址、联系人等信息

---

## 📚 版本更新

### 手动更新

```batch
# 1. 备份数据
node scripts/backup.js

# 2. 停止服务
stop.bat

# 3. 替换文件
替换项目文件（保留 node_modules 和 packages）

# 4. 恢复数据
node scripts/restore.js

# 5. 启动服务
start.bat
```

### 自动更新

建议使用 CI/CD 工具（如 GitLab CI 或 Jenkins）实现自动化部署。

---

## 🏆 部署成功标志

✅ 浏览器可以访问：http://localhost:5173
✅ 可以正常登录系统
✅ 可以查看商品列表
✅ 可以查询库存信息
✅ 可以进行库存盘点

---

## 🔐 安全建议

1. **修改默认密码**：登录后立即修改 `admin` 密码
2. **限制访问**：使用防火墙限制访问 IP
3. **定期备份**：每日自动备份数据库
4. **监控日志**：定期查看访问和错误日志
