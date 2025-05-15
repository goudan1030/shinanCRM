# 认证API更新说明

**日期**: 2025-05-14
**优化人**: 技术顾问

## 更新内容

为了配合认证机制的优化，我们更新了以下认证API：

### 1. 登录API (`/api/auth/login`)

**主要更改**:
- 使用JWT Token代替原有的JSON数据
- 对接新的`database.ts`中的用户认证函数
- 使用统一的Token处理模块设置Cookie

**代码更新**:
```typescript
// 原来的代码
const authToken = {
  userId: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar_url: user.avatar_url
};
response.cookies.set('auth_token', JSON.stringify(authToken), { ... });

// 更新后的代码
const token = generateToken({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar_url: user.avatar_url
});
setTokenCookie(response, token);
```

### 2. 注销API (`/api/auth/logout`)

**主要更改**:
- 使用统一的Token处理模块清除Cookie

**代码更新**:
```typescript
// 原来的代码
response.cookies.delete('auth_token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
});

// 更新后的代码
clearTokenCookie(response);
```

### 3. 会话API (`/api/auth/session`)

**主要更改**:
- 使用统一的Token验证模块获取和验证Token
- 使用新的Token格式解析用户信息

**代码更新**:
```typescript
// 原来的代码
const cookieStore = await cookies();
const authToken = cookieStore.get('auth_token');
if (authToken) {
  const userData = JSON.parse(authToken.value);
  // 使用userData...
}

// 更新后的代码
const token = await getTokenFromCookieStore();
if (token) {
  const userData = verifyToken(token);
  if (userData) {
    // 使用userData...
  }
}
```

## 新的认证流程

1. **登录**:
   - 用户提交邮箱和密码
   - 服务器验证凭据
   - 成功后生成JWT Token
   - 将Token设置为HttpOnly Cookie
   - 返回用户信息

2. **验证认证状态**:
   - 从Cookie存储中获取Token
   - 验证Token的有效性和过期时间
   - 如果有效，返回用户信息
   - 如果无效，返回null

3. **注销**:
   - 清除认证Cookie
   - 返回成功消息

## 测试注意事项

由于认证机制发生了变化，可能会影响现有的用户会话。请注意以下事项：

1. 现有用户将需要重新登录，因为Token格式已更改
2. 确保在测试过程中检查以下功能是否正常：
   - 用户登录
   - 会话保持
   - 访问受保护的页面
   - 权限控制
   - 注销功能

## 环境配置

确保在`.env.local`文件中设置了正确的JWT密钥：

```
JWT_SECRET=your-secure-random-string
```

可以使用以下命令生成安全的随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 后续优化

1. 添加Token刷新机制在前端
2. 实现记住我功能，可选择更长的登录会话
3. 添加登录历史记录和多设备管理 