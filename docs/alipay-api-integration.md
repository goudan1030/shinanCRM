# 支付宝API自动对接指南

## 方案选择

### 方案1：定时任务自动同步（推荐）

**优点：**
- 实现简单，不需要配置回调地址
- 可以同步历史数据
- 不依赖外部网络访问

**缺点：**
- 有延迟（通常同步昨天的数据）
- 需要配置定时任务

### 方案2：回调通知（实时）

**优点：**
- 实时同步，收款后立即记录
- 自动化程度高

**缺点：**
- 需要配置回调地址（需要公网可访问）
- 需要处理签名验证
- 可能遗漏历史数据

## 方案1：定时任务自动同步

### 1. 申请支付宝开放平台应用

1. 登录 [支付宝开放平台](https://open.alipay.com/)
2. 创建应用，获取：
   - APP_ID
   - 应用私钥（PRIVATE_KEY）
   - 支付宝公钥（ALIPAY_PUBLIC_KEY）

### 2. 配置环境变量

在 `.env.local` 文件中添加：

```bash
# 支付宝开放平台配置
ALIPAY_APP_ID=你的APP_ID
ALIPAY_PRIVATE_KEY=你的应用私钥
ALIPAY_PUBLIC_KEY=支付宝公钥
ALIPAY_GATEWAY_URL=https://openapi.alipay.com/gateway.do
```

### 3. 安装支付宝SDK

```bash
npm install alipay-sdk
```

### 4. 配置定时任务

在服务器上添加cron任务，每天凌晨1点自动同步：

```bash
# 编辑crontab
crontab -e

# 添加以下行（根据实际路径调整）
0 1 * * * cd /path/to/admin.xinghun.info && /usr/bin/node scripts/sync-alipay-transactions.js >> /var/log/alipay-sync.log 2>&1
```

### 5. 手动测试

```bash
# 手动执行同步脚本
npm run alipay:sync

# 或直接调用API
curl "http://localhost:3000/api/finance/alipay/sync?date=2024-01-01"
```

## 方案2：回调通知（实时）

### 1. 配置回调地址

在支付宝商户平台配置回调地址：
```
https://admin.xinghun.info/api/finance/alipay/notify
```

### 2. 验证回调签名

需要在 `/api/finance/alipay/notify` 接口中实现签名验证，确保是支付宝发送的请求。

### 3. 测试回调

支付宝提供回调测试工具，可以在商户平台测试回调功能。

## 注意事项

1. **API权限**：确保应用已开通"账务查询"相关权限
2. **签名验证**：回调接口必须验证签名，防止伪造请求
3. **幂等性**：同一笔交易可能多次回调，需要去重处理
4. **错误处理**：即使处理失败也要返回success，避免支付宝重复通知

## 推荐方案

**生产环境推荐使用方案1（定时任务）**，因为：
- 实现简单，稳定性高
- 不依赖外部网络访问
- 可以同步历史数据
- 即使某次同步失败，下次可以补全

如果需要实时性，可以同时使用两种方案：
- 回调通知：实时记录新收款
- 定时任务：每天同步，确保数据完整

