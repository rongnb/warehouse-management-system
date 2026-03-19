# 仓库管理系统 - 快速开始指南

## 🚀 5分钟快速开始（在有网的电脑上）

### 第1步：检查环境
```batch
双击运行: check-env.bat
```

### 第2步：下载MongoDB
```batch
双击运行: download-mongodb.bat
```
脚本会自动下载 MongoDB ZIP 并解压。

### 第3步：下载依赖
```batch
双击运行: download-deps.bat
```
脚本会下载所有 npm 依赖到本地。

### 第4步：打包依赖
```batch
双击运行: package-deps.bat
```
脚本会把依赖打包到 `packages\` 目录。

### 第5步：传输到内网
将整个项目文件夹复制到内网服务器。

---

## 🖥️ 内网部署步骤（在内网服务器上）

### 第1步：安装MongoDB
```batch
右键点击，选择"以管理员身份运行"
运行: install-mongodb.bat
```

### 第2步：安装系统
```batch
双击运行: install-offline.bat
```

### 第3步：启动系统
```batch
双击运行: start.bat
```

### 第4步：访问系统
打开浏览器访问: **http://localhost:5173**

---

## 📋 脚本功能速查表

### 🟢 环境检查类
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **check-env.bat** | 检查所有环境 | 部署前运行 |
| **mongodb-status.bat** | 检查MongoDB状态 | 随时检查 |

### 🔵 下载类（在有网电脑）
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **download-mongodb.bat** | 下载MongoDB | 首次部署 |
| **download-deps.bat** | 下载npm依赖 | 首次部署或更新依赖 |

### 🟡 打包类（在有网电脑）
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **package-deps.bat** | 打包依赖 | 准备传输前 |
| **backup-deps.bat** | 备份node_modules | 更新前备份 |

### 🔴 安装类（在内网服务器）
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **install-mongodb.bat** | 安装MongoDB服务 | 首次部署 |
| **install-offline.bat** | 离线安装系统 | 首次部署 |
| **restore-deps.bat** | 恢复node_modules | 需要恢复时 |
| **init-db.bat** | 初始化数据库 | 需要重置数据时 |

### 🟢 启动类
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **start.bat** | 一键启动所有 | 日常启动 |
| **mongodb-start.bat** | 仅启动MongoDB | MongoDB未运行时 |
| **backend-start.bat** | 仅启动后端 | 单独启动后端 |
| **frontend-start.bat** | 仅启动前端 | 单独启动前端 |

### 🔴 停止类
| 脚本 | 功能 | 何时运行 |
|------|------|----------|
| **stop.bat** | 停止所有服务 | 关闭系统时 |
| **mongodb-stop.bat** | 仅停止MongoDB | 需要重启MongoDB时 |

---

## 🔐 默认账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | `admin` | `123456` | 所有功能 |
| 仓管员A | `keeper_a` | `123456` | 商品、库存、盘点 |
| 仓管员B | `keeper_b` | `123456` | 商品、库存、盘点 |

---

## 📚 文档说明

| 文档 | 内容 | 目标读者 |
|------|------|----------|
| **README.md** | 项目概述、功能介绍 | 所有人 |
| **QUICKSTART.md** | 本文档，快速开始 | 部署和运维人员 |
| **DEPLOY_INSTRUCTION.md** | 详细部署指南 | 部署和运维人员 |

---

## ⚠️ 常见问题

### Q: 需要管理员权限吗？
A: 安装MongoDB时需要（install-mongodb.bat），其他脚本不需要。

### Q: MongoDB下载失败怎么办？
A: 可以手动下载：https://www.mongodb.com/try/download/community

### Q: 如何只更新依赖不重新安装？
A: 在有网电脑上运行 download-deps.bat → package-deps.bat → 传输到内网 → 运行 restore-deps.bat

### Q: MongoDB服务启动失败？
A: 检查27017端口是否被占用，或运行 mongodb-status.bat 查看状态

### Q: 系统可以同时在多台机器运行吗？
A: 可以！但需要共用一个MongoDB数据库，修改 backend/.env 中的 MONGODB_URI

---

## 🆘 获取帮助

如遇问题，请按顺序检查：
1. 运行 check-env.bat
2. 运行 mongodb-status.bat
3. 查看 DEPLOY_INSTRUCTION.md 文档
4. 查看日志文件

---

## 📊 完整部署流程总结

### 有网电脑上
```
1. check-env.bat          → 检查环境
2. download-mongodb.bat    → 下载MongoDB
3. download-deps.bat       → 下载npm依赖
4. package-deps.bat        → 打包依赖
5. 复制整个项目到U盘/网盘
```

### 内网服务器上
```
1. install-mongodb.bat     → 安装MongoDB (管理员)
2. install-offline.bat     → 安装系统
3. start.bat              → 启动所有
4. 浏览器访问 http://localhost:5173
```

---

**完成！** 祝你使用愉快！ 🎉
