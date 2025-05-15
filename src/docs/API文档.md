# SNCRM API文档

本文档详细描述了SNCRM系统提供的所有API端点、请求参数和响应格式。

## 目录
1. [认证相关API](#认证相关api)
2. [会员管理API](#会员管理api)
3. [平台管理API](#平台管理api)
4. [收支管理API](#收支管理api)
5. [系统设置API](#系统设置api)

## 通用响应格式

系统所有API遵循统一的响应格式：

### 成功响应：

```json
{
  "status": "success",
  "data": {...},  // 返回的数据
  "message": "操作成功提示"  // 可选
}
```

### 错误响应：

```json
{
  "status": "error",
  "error": "错误信息",
  "code": "错误代码"  // 可选
}
```

### HTTP状态码：

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 认证相关API

### 用户登录

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **权限**: 公开
- **描述**: 用户登录并获取Token

#### 请求参数

```json
{
  "email": "user@example.com",
  "password": "password123",
  "remember": true  // 可选，是否记住登录状态
}
```

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "张三",
      "role": "admin",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "token": "eyJhbGciOiJ...",  // JWT Token
    "expiresAt": 1672531199  // Token过期时间戳
  },
  "message": "登录成功"
}
```

#### 错误响应 (401)

```json
{
  "status": "error",
  "error": "邮箱或密码错误"
}
```

### 获取当前会话

- **URL**: `/api/auth/session`
- **方法**: `GET`
- **权限**: 公开
- **描述**: 获取当前用户的会话信息

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "张三",
      "role": "admin",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  }
}
```

#### 未登录响应 (200)

```json
{
  "status": "success",
  "data": null
}
```

### 用户登出

- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **权限**: 已认证用户
- **描述**: 用户登出，清除会话信息

#### 成功响应 (200)

```json
{
  "status": "success",
  "message": "已成功登出"
}
```

---

## 会员管理API

### 获取会员列表

- **URL**: `/api/members`
- **方法**: `GET`
- **权限**: 用户及以上
- **描述**: 获取会员列表，支持分页和筛选

#### 请求参数 (Query String)

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| search | string | 否 | 搜索关键词 |
| status | number | 否 | 会员状态 (1=有效,0=禁用) |
| sortBy | string | 否 | 排序字段 |
| sortOrder | string | 否 | 排序方向 (asc/desc) |

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "李四",
        "phone": "13800138000",
        "email": "lisi@example.com",
        "status": 1,
        "created_at": "2023-01-01T12:00:00Z",
        "updated_at": "2023-01-10T15:30:00Z"
      },
      // 更多会员...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 105,
      "totalPages": 6
    }
  }
}
```

### 获取会员详情

- **URL**: `/api/members/{id}`
- **方法**: `GET`
- **权限**: 用户及以上
- **描述**: 获取单个会员的详细信息

#### 路径参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 会员ID |

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "李四",
    "phone": "13800138000",
    "email": "lisi@example.com",
    "address": "北京市朝阳区...",
    "status": 1,
    "remark": "重要客户",
    "match_count": 5,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-01-10T15:30:00Z"
  }
}
```

### 创建会员

- **URL**: `/api/members`
- **方法**: `POST`
- **权限**: 用户及以上
- **描述**: 创建新会员

#### 请求参数

```json
{
  "name": "王五",
  "phone": "13900139000",
  "email": "wangwu@example.com",
  "address": "上海市浦东新区...",
  "status": 1,
  "remark": "潜在客户"
}
```

#### 成功响应 (201)

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "name": "王五",
    "phone": "13900139000",
    "email": "wangwu@example.com",
    "address": "上海市浦东新区...",
    "status": 1,
    "remark": "潜在客户",
    "match_count": 0,
    "created_at": "2023-02-15T09:20:00Z",
    "updated_at": "2023-02-15T09:20:00Z"
  },
  "message": "会员创建成功"
}
```

### 更新会员

- **URL**: `/api/members/{id}`
- **方法**: `PUT`
- **权限**: 用户及以上
- **描述**: 更新会员信息

#### 路径参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 会员ID |

#### 请求参数

```json
{
  "name": "王五",
  "phone": "13900139001",  // 更新的手机号
  "email": "wangwu@example.com",
  "address": "上海市浦东新区...",
  "status": 1,
  "remark": "重要客户"  // 更新的备注
}
```

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "name": "王五",
    "phone": "13900139001",
    "email": "wangwu@example.com",
    "address": "上海市浦东新区...",
    "status": 1,
    "remark": "重要客户",
    "match_count": 0,
    "created_at": "2023-02-15T09:20:00Z",
    "updated_at": "2023-02-15T10:30:00Z"
  },
  "message": "会员更新成功"
}
```

### 删除会员

- **URL**: `/api/members/{id}`
- **方法**: `DELETE`
- **权限**: 管理员及以上
- **描述**: 删除会员

#### 路径参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 会员ID |

#### 成功响应 (200)

```json
{
  "status": "success",
  "message": "会员删除成功"
}
```

---

## 平台管理API

### Banner管理

#### 获取Banner列表

- **URL**: `/api/platform/banner`
- **方法**: `GET`
- **权限**: 经理及以上
- **描述**: 获取Banner列表

#### 请求参数 (Query String)

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| category_id | number | 否 | 分类ID (1-最新 2-热门 3-弹窗) |
| status | number | 否 | 状态 (1-显示 0-隐藏) |

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "title": "最新活动",
      "image_url": "https://example.com/images/banner1.jpg",
      "link_url": "https://example.com/activity",
      "sort_order": 1,
      "status": 1,
      "start_time": "2023-01-01T00:00:00Z",
      "end_time": "2023-12-31T23:59:59Z",
      "remark": "首页顶部Banner",
      "created_at": "2023-01-01T10:00:00Z",
      "updated_at": "2023-01-01T10:00:00Z"
    },
    // 更多Banner...
  ]
}
```

#### 新增/更新Banner

- **URL**: `/api/platform/banner`
- **方法**: `POST`
- **权限**: 经理及以上
- **描述**: 新增或更新Banner

#### 请求参数

```json
{
  "id": 1,  // 更新时提供，新增时不提供
  "category_id": 1,
  "title": "最新活动",
  "image_url": "https://example.com/images/banner1.jpg",
  "link_url": "https://example.com/activity",
  "sort_order": 1,
  "status": 1,
  "start_time": "2023-01-01T00:00:00Z",
  "end_time": "2023-12-31T23:59:59Z",
  "remark": "首页顶部Banner"
}
```

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "category_id": 1,
    "title": "最新活动",
    "image_url": "https://example.com/images/banner1.jpg",
    "link_url": "https://example.com/activity",
    "sort_order": 1,
    "status": 1,
    "start_time": "2023-01-01T00:00:00Z",
    "end_time": "2023-12-31T23:59:59Z",
    "remark": "首页顶部Banner",
    "created_at": "2023-01-01T10:00:00Z",
    "updated_at": "2023-01-02T15:30:00Z"
  },
  "message": "Banner保存成功"
}
```

#### 更新Banner状态

- **URL**: `/api/platform/banner/{id}/status`
- **方法**: `PUT`
- **权限**: 经理及以上
- **描述**: 更新Banner状态

#### 路径参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | Banner ID |

#### 请求参数

```json
{
  "status": 0  // 0-隐藏 1-显示
}
```

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "status": 0
  },
  "message": "Banner状态已更新"
}
```

#### 删除Banner

- **URL**: `/api/platform/banner/{id}`
- **方法**: `DELETE`
- **权限**: 经理及以上
- **描述**: 删除Banner

#### 路径参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | Banner ID |

#### 成功响应 (200)

```json
{
  "status": "success",
  "message": "Banner删除成功"
}
```

---

## 收支管理API

### 获取收支列表

- **URL**: `/api/finance/transactions`
- **方法**: `GET`
- **权限**: 经理及以上
- **描述**: 获取收支记录列表

#### 请求参数 (Query String)

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| type | string | 否 | 类型 (income-收入, expense-支出) |
| start_date | string | 否 | 开始日期 (YYYY-MM-DD) |
| end_date | string | 否 | 结束日期 (YYYY-MM-DD) |

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "type": "income",
        "amount": 1000.00,
        "category": "会员费",
        "description": "李四会员年费",
        "transaction_date": "2023-01-15",
        "created_by": "admin",
        "created_at": "2023-01-15T14:30:00Z",
        "updated_at": "2023-01-15T14:30:00Z"
      },
      // 更多记录...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "summary": {
      "total_income": 15000.00,
      "total_expense": 5000.00,
      "balance": 10000.00
    }
  }
}
```

### 添加收支记录

- **URL**: `/api/finance/transactions`
- **方法**: `POST`
- **权限**: 经理及以上
- **描述**: 添加收支记录

#### 请求参数

```json
{
  "type": "expense",
  "amount": 500.00,
  "category": "办公用品",
  "description": "购买打印纸和墨盒",
  "transaction_date": "2023-02-10"
}
```

#### 成功响应 (201)

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "type": "expense",
    "amount": 500.00,
    "category": "办公用品",
    "description": "购买打印纸和墨盒",
    "transaction_date": "2023-02-10",
    "created_by": "admin",
    "created_at": "2023-02-10T09:15:00Z",
    "updated_at": "2023-02-10T09:15:00Z"
  },
  "message": "收支记录添加成功"
}
```

---

## 系统设置API

### 获取系统配置

- **URL**: `/api/settings`
- **方法**: `GET`
- **权限**: 管理员及以上
- **描述**: 获取系统配置

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "site_name": "SNCRM系统",
    "site_logo": "https://example.com/logo.png",
    "contact_email": "admin@example.com",
    "contact_phone": "010-12345678",
    "enable_member_registration": true,
    "enable_notifications": true,
    "maintenance_mode": false
  }
}
```

### 更新系统配置

- **URL**: `/api/settings`
- **方法**: `PUT`
- **权限**: 管理员及以上
- **描述**: 更新系统配置

#### 请求参数

```json
{
  "site_name": "SNCRM客户关系管理系统",
  "site_logo": "https://example.com/new-logo.png",
  "contact_email": "support@example.com",
  "contact_phone": "010-87654321",
  "enable_member_registration": false,
  "enable_notifications": true,
  "maintenance_mode": false
}
```

#### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "site_name": "SNCRM客户关系管理系统",
    "site_logo": "https://example.com/new-logo.png",
    "contact_email": "support@example.com",
    "contact_phone": "010-87654321",
    "enable_member_registration": false,
    "enable_notifications": true,
    "maintenance_mode": false
  },
  "message": "系统配置已更新"
}
```

---

## 错误处理

所有API都使用统一的错误处理机制，常见错误包括：

### 验证错误 (400)

```json
{
  "status": "error",
  "error": "输入数据验证失败",
  "details": {
    "name": "名称不能为空",
    "email": "邮箱格式不正确"
  }
}
```

### 认证错误 (401)

```json
{
  "status": "error",
  "error": "认证失败，请重新登录"
}
```

### 权限错误 (403)

```json
{
  "status": "error",
  "error": "您没有权限执行此操作"
}
```

### 资源不存在 (404)

```json
{
  "status": "error",
  "error": "找不到会员"
}
```

### 服务器错误 (500)

```json
{
  "status": "error",
  "error": "服务器内部错误，请稍后重试"
}
```

## API调用示例

### 使用fetch调用

```javascript
// 登录示例
async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.error);
    }
    
    return data.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 获取会员列表示例
async function getMembers(page = 1, limit = 20) {
  try {
    const response = await fetch(`/api/members?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.error);
    }
    
    return data.data;
  } catch (error) {
    console.error('获取会员列表失败:', error);
    throw error;
  }
}
```

### 使用axios调用

```javascript
import axios from 'axios';

// 创建API实例
const api = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器
api.interceptors.response.use(
  response => {
    if (response.data.status === 'success') {
      return response.data.data;
    }
    return Promise.reject(new Error(response.data.error || '未知错误'));
  },
  error => {
    return Promise.reject(error);
  }
);

// 登录示例
export const login = (email, password) => {
  return api.post('/api/auth/login', { email, password });
};

// 获取会员列表示例
export const getMembers = (params = { page: 1, limit: 20 }) => {
  return api.get('/api/members', { params });
};
```

## 注意事项

1. 所有API请求都应在Headers中包含`Content-Type: application/json`
2. 认证后的API请求会自动从Cookie中获取Token
3. 如需手动设置Token，可在Headers中添加`Authorization: Bearer <token>`
4. 生产环境中所有API都应使用HTTPS协议
5. 对于文件上传API，请使用`multipart/form-data`格式
6. API接口可能会随系统更新而变化，请定期查看最新文档 