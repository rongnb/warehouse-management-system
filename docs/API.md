# API 接口文档

## 基础信息
- 基础 URL：`http://localhost:3000/api`
- 认证方式：JWT Token，放在请求头 `Authorization: Bearer <token>`
- 请求格式：JSON
- 响应格式：JSON

## 公共响应码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未登录或 token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 接口列表

### 1. 认证相关
#### 登录
```
POST /auth/login
```
请求参数：
```json
{
  "username": "admin",
  "password": "123456"
}
```
响应：
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "xxx",
    "username": "admin",
    "realName": "系统管理员",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### 获取当前用户信息
```
GET /auth/profile
```
响应：同上登录接口的 user 信息。

#### 修改密码
```
PUT /auth/change-password
```
请求参数：
```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

### 2. 用户管理
#### 获取用户列表
```
GET /users?page=1&limit=10&keyword=&role=&status=
```
响应：
```json
{
  "users": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### 创建用户
```
POST /users
```
请求参数：
```json
{
  "username": "test",
  "password": "123456",
  "realName": "测试用户",
  "email": "test@example.com",
  "phone": "13800138000",
  "role": "staff"
}
```

#### 更新用户
```
PUT /users/:id
```

#### 删除用户
```
DELETE /users/:id
```

### 3. 商品管理
#### 获取商品列表
```
GET /products?page=1&limit=10&keyword=&category=&supplier=&status=
```

#### 创建商品
```
POST /products
```
请求参数：
```json
{
  "name": "商品名称",
  "sku": "PROD001",
  "category": "分类ID",
  "supplier": "供应商ID",
  "description": "商品描述",
  "specification": "规格",
  "unit": "个",
  "price": 99.99,
  "costPrice": 50.00,
  "minStock": 10,
  "maxStock": 100,
  "status": true
}
```

#### 更新商品
```
PUT /products/:id
```

#### 删除商品
```
DELETE /products/:id
```

### 4. 库存管理
#### 获取库存列表
```
GET /inventory?page=1&limit=10&keyword=&category=&warehouse=&lowStock=false
```

#### 库存调整
```
POST /inventory/adjust
```
请求参数：
```json
{
  "product": "商品ID",
  "warehouse": "仓库ID",
  "quantity": 100,
  "remark": "调整备注"
}
```

#### 库存盘点
```
POST /inventory/check
```
请求参数：
```json
{
  "product": "商品ID",
  "warehouse": "仓库ID",
  "actualQuantity": 95,
  "remark": "盘点备注"
}
```

### 5. 出入库管理
#### 获取出入库记录
```
GET /transactions?page=1&limit=10&keyword=&type=&warehouse=&startDate=&endDate=
```

#### 入库
```
POST /transactions/in
```
请求参数：
```json
{
  "product": "商品ID",
  "warehouse": "仓库ID",
  "quantity": 50,
  "price": 50.00,
  "supplier": "供应商ID",
  "remark": "采购入库",
  "batchNumber": "BATCH20240101",
  "productionDate": "2024-01-01",
  "expiryDate": "2025-01-01"
}
```

#### 出库
```
POST /transactions/out
```
请求参数：
```json
{
  "product": "商品ID",
  "warehouse": "仓库ID",
  "quantity": 10,
  "price": 99.99,
  "customer": "客户名称",
  "remark": "销售出库"
}
```

#### 取消交易
```
PUT /transactions/:id/cancel
```

### 6. 分类管理
#### 获取分类列表
```
GET /categories?status=true
```

#### 获取分类下拉列表（树形）
```
GET /categories/options/list
```

#### 创建分类
```
POST /categories
```
请求参数：
```json
{
  "name": "分类名称",
  "code": "CATE001",
  "parentId": "父分类ID（可选）",
  "description": "分类描述",
  "sort": 1
}
```

#### 更新分类
```
PUT /categories/:id
```

#### 删除分类
```
DELETE /categories/:id
```

### 7. 供应商管理
#### 获取供应商列表
```
GET /suppliers?page=1&limit=10&keyword=&level=&status=
```

#### 获取供应商下拉列表
```
GET /suppliers/options/list
```

#### 创建供应商
```
POST /suppliers
```
请求参数：
```json
{
  "name": "供应商名称",
  "code": "SUP001",
  "contact": "联系人",
  "phone": "13800138000",
  "email": "contact@example.com",
  "address": "联系地址",
  "level": "B",
  "remark": "备注"
}
```

#### 更新供应商
```
PUT /suppliers/:id
```

#### 删除供应商
```
DELETE /suppliers/:id
```

### 8. 仓库管理
#### 获取仓库列表
```
GET /warehouses?page=1&limit=10&keyword=&status=
```

#### 获取仓库下拉列表
```
GET /warehouses/options/list
```

#### 创建仓库
```
POST /warehouses
```
请求参数：
```json
{
  "name": "仓库名称",
  "code": "WH001",
  "location": "仓库位置",
  "manager": "管理员ID（可选）",
  "phone": "联系电话",
  "description": "仓库描述",
  "sort": 1
}
```

#### 更新仓库
```
PUT /warehouses/:id
```

#### 删除仓库
```
DELETE /warehouses/:id
```

### 9. 仪表盘
#### 获取统计数据
```
GET /dashboard/stats
```
响应：
```json
{
  "productCount": 100,
  "productGrowth": 8.2,
  "inventoryValue": 125000.00,
  "inventoryGrowth": 12.5,
  "todayIn": 50,
  "inRate": 12,
  "todayOut": 30,
  "outRate": 8
}
```

#### 低库存预警
```
GET /dashboard/low-stock
```

#### 最近交易记录
```
GET /dashboard/recent-transactions?limit=10
```

#### 近7天出入库趋势
```
GET /dashboard/trend
```
