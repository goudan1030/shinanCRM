# Token认证问题修复说明

## 问题描述

在中间件中使用JWT Token进行认证时，出现以下错误：

```
Token验证失败: Error: The edge runtime does not support Node.js 'crypto' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
```

这是因为Next.js的中间件运行在Edge Runtime环境中，而不是普通的Node.js环境。Edge Runtime是一个更轻量级的JavaScript环境，不支持Node.js的某些内置模块，包括用于加密的`crypto`模块和我们使用的`jsonwebtoken`库。

## 解决方案

我们采用了双轨制方案来解决这个问题：

1. 为Edge Runtime创建了专用的Token处理模块`src/lib/token-edge.ts`，使用与Edge兼容的`jose`库处理JWT。
2. 保留原有的`src/lib/token.ts`模块供API路由和服务器组件使用，因为它们运行在完整的Node.js环境中。

具体修改如下：

### 1. 中间件修改

- 修改了`src/middleware.ts`中的导入，从`token-edge.ts`导入Token处理函数
- 将中间件函数改为异步函数，以处理`token-edge.ts`中的异步操作
- 在Token验证、刷新等操作前添加`await`关键字
- 使用`token-edge.ts`中的`hasPermission`函数替换原有的`checkRoleAccess`函数

### 2. token-edge.ts模块

这个模块实现了与`token.ts`相同的功能，但使用了Edge Runtime兼容的方法：

- 使用`jose`库代替`jsonwebtoken`库
- 将同步操作改为异步操作（如`verifyToken`、`refreshToken`等）
- 保持API接口与原模块一致，方便后续维护

## 实现细节

### token-edge.ts中的关键函数

- `verifyToken`：验证JWT Token的有效性
- `getTokenFromRequest`：从请求中获取Token
- `shouldRefreshToken`：检查Token是否需要刷新
- `refreshToken`：刷新用户Token
- `setTokenCookie`：在响应中设置Token Cookie
- `hasPermission`：检查用户是否有权限访问特定资源

### 中间件流程

1. 检查请求路径是否是公开路由或静态资源
2. 从请求中获取Token
3. 验证Token的有效性
4. 检查用户权限
5. 检查Token是否需要刷新，如需要则生成新Token
6. 返回带有更新后Token的响应

## 注意事项

1. API路由（如登录API）仍使用原有的`token.ts`模块，因为它们运行在Node.js环境中
2. 中间件使用`token-edge.ts`模块，因为它们运行在Edge Runtime环境中
3. 两个模块保持相同的API接口，方便后续维护和统一调用方式
4. 如果需要修改Token相关功能，需要同时修改两个模块

## 后续建议

1. 考虑统一使用Edge兼容的库，减少维护两套代码的成本
2. 添加更多的错误处理和日志记录，方便调试和监控
3. 考虑添加更多的安全措施，如Token吊销、刷新Token限制等 