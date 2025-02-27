# API 文档

## API 概述

本系统API采用RESTful风格设计,主要包含以下模块:
- 会员管理API
- 收支管理API
- 配置管理API
- 系统管理API

## 通用说明

### 基础URL
```
https://your-domain.com/api
```

### 响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### 认证方式
所有API请求需要在Header中携带认证Token:
```
Authorization: Bearer <token>
```

## API 详细说明

### 1. 会员管理API

#### 1.1 创建会员
```typescript
POST /api/members/create

请求体:
{
  member_no: string;    // 会员编号
  nickname?: string;    // 昵称
  wechat: string;      // 微信号
  phone: string;       // 手机号
  type: 'NORMAL' | 'ONE_TIME' | 'ANNUAL';  // 会员类型
  gender: 'male' | 'female';  // 性别
  birth_year: number;  // 出生年份
  height: number;      // 身高
  weight: number;      // 体重
  education: string;   // 学历
  occupation: string;  // 职业
  province: string;    // 省份
  city: string;        // 城市
  district: string;    // 区县
  target_area: string; // 目标区域
  house_car: string;   // 房车情况
  hukou_province: string;  // 户口所在省
  hukou_city: string;     // 户口所在市
  children_plan: string;   // 孩子需求
  marriage_cert: 'WANT' | 'DONT_WANT' | 'NEGOTIABLE';  // 领证需求
  marriage_history: string;  // 婚史
  sexual_orientation: string;  // 性取向
  self_description?: string;   // 自我介绍
  partner_requirement?: string; // 择偶要求
}

响应:
{
  "success": true,
  "data": {
    "id": number,
    "member_no": string,
    ...
  }
}
```

#### 1.2 更新会员信息
```typescript
PUT /api/members/{id}

请求体:
{
  // 同创建会员,所有字段可选
}

响应:
{
  "success": true,
  "data": {
    "id": number,
    "member_no": string,
    ...
  }
}
```

#### 1.3 获取会员列表
```typescript
GET /api/members?page=1&pageSize=20&keyword=xxx&type=xxx

响应:
{
  "success": true,
  "data": {
    "list": Array<Member>,
    "total": number,
    "page": number,
    "pageSize": number
  }
}
```

### 2. 收支管理API

#### 2.1 创建收入记录
```typescript
POST /api/finance/income

请求体:
{
  member_no: string;  // 会员编号
  payment_date: string;  // 支付日期 YYYY-MM-DD
  payment_method: 'ALIPAY' | 'WECHAT_WANG' | 'WECHAT_ZHANG' | 'ICBC_QR' | 'CORPORATE';
  amount: number;  // 金额
  notes?: string;  // 备注
}

响应:
{
  "success": true,
  "data": {
    "id": number,
    ...
  }
}
```

#### 2.2 创建支出记录
```typescript
POST /api/finance/expense

请求体:
{
  expense_date: string;  // 支出日期 YYYY-MM-DD
  expense_type: string;  // 支出类型
  amount: number;  // 金额
  notes?: string;  // 备注
}

响应:
{
  "success": true,
  "data": {
    "id": number,
    ...
  }
}
```

### 3. 配置管理API

#### 3.1 更新小程序配置
```typescript
POST /api/miniapp/config

请求体:
{
  appid: string;     // 小程序AppID
  appsecret: string; // 小程序AppSecret
}

响应:
{
  "success": true
}
```

#### 3.2 更新企业微信配置
```typescript
POST /api/wecom/config

请求体:
{
  corp_id: string;   // 企业ID
  agent_id: string;  // 应用ID
  secret: string;    // 应用Secret
}

响应:
{
  "success": true
}
```

### 4. 系统管理API

#### 4.1 用户登录
```typescript
POST /api/auth/login

请求体:
{
  email: string;    // 邮箱
  password: string; // 密码
}

响应:
{
  "success": true,
  "data": {
    "token": string,
    "user": {
      "id": number,
      "email": string,
      ...
    }
  }
}
```

#### 4.2 用户登出
```typescript
POST /api/auth/logout

响应:
{
  "success": true,
  "message": "退出登录成功"
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 注意事项

1. 所有请求都需要进行认证
2. 金额相关字段使用数字类型,单位为元
3. 日期格式统一使用 YYYY-MM-DD
4. 分页接口默认每页20条数据
5. 敏感数据传输时需要进行加密 