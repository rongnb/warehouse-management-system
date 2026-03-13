# 仓库管理系统 (Warehouse Management System)

## 功能概述
一个功能完善的仓库管理网站，支持：
- 📦 商品管理：商品入库、出库、库存查询
- 👥 用户管理：角色权限分配、用户注册登录
- 📊 数据统计：库存统计报表、出入库记录
- 🔧 系统设置：仓库管理、分类管理、供应商管理
- 📱 响应式设计，支持PC和移动端访问

## 技术栈
### 前端
- Vue 3 + Vite
- Element Plus UI组件库
- Axios 网络请求
- ECharts 数据可视化
- Vue Router 路由管理
- Pinia 状态管理

### 后端
- Node.js + Express
- MongoDB 数据库
- JWT 身份验证
- bcrypt 密码加密
- 文件上传支持

### 数据库设计
- 用户表 (users)：存储用户信息和权限
- 商品表 (products)：商品信息
- 库存表 (inventory)：库存信息
- 出入库记录表 (transactions)：出入库记录
- 分类表 (categories)：商品分类
- 供应商表 (suppliers)：供应商信息
- 仓库表 (warehouses)：仓库信息

## 项目结构
```
warehouse-management/
├── frontend/          # 前端代码
├── backend/           # 后端代码
├── database/         # 数据库脚本
└── docs/             # 文档
```

## 快速启动
### 后端启动
```bash
cd backend
npm install
npm run dev
```
后端服务运行在 http://localhost:3000

### 前端启动
```bash
cd frontend
npm install
npm run dev
```
前端服务运行在 http://localhost:5173
