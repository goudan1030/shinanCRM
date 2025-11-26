# 企业微信文档对接测试指南

## 前置条件

### 1. 确认企业微信配置

检查企业微信配置是否完整：

```bash
# 在服务器上执行
mysql -u h5_cloud_user -p h5_cloud_db -e "SELECT corp_id, agent_id, secret FROM wecom_config WHERE id = 1;"
```

应该能看到：
- `corp_id`: 企业ID
- `agent_id`: 应用ID  
- `secret`: 应用密钥

### 2. 确认API权限

在企业微信管理后台确认：
- 应用已开启"文档"权限
- Access Token可以正常获取

## 测试步骤

### 第一步：创建数据库表

```bash
# 在服务器上执行
mysql -u h5_cloud_user -p h5_cloud_db < scripts/create-wecom-documents-table.sql

# 验证表是否创建成功
mysql -u h5_cloud_user -p h5_cloud_db -e "SHOW TABLES LIKE 'wecom_documents';"
```

### 第二步：测试Access Token获取

```bash
# 在服务器上测试（需要先登录）
curl "http://localhost:3000/api/wecom/test-connection"
```

或者直接调用企业微信API测试：

```bash
# 获取配置
CORP_ID=$(mysql -u h5_cloud_user -p h5_cloud_db -sN -e "SELECT corp_id FROM wecom_config WHERE id = 1;")
SECRET=$(mysql -u h5_cloud_user -p h5_cloud_db -sN -e "SELECT secret FROM wecom_config WHERE id = 1;")

# 测试获取Token
curl "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}"
```

应该返回：
```json
{
  "errcode": 0,
  "errmsg": "ok",
  "access_token": "xxx",
  "expires_in": 7200
}
```

### 第三步：测试创建通用文档

```bash
# 在服务器上执行（需要先登录获取session）
curl -X POST "http://localhost:3000/api/wecom/document/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "doc_name": "测试文档",
    "doc_type": "doc",
    "content": "# 测试文档\n\n这是一个测试文档\n\n- 项目1\n- 项目2",
    "operator_id": 1
  }'
```

**预期结果：**
```json
{
  "success": true,
  "data": {
    "doc_id": "xxx",
    "doc_name": "测试文档",
    "doc_url": "https://...",
    "share_url": "https://..."
  },
  "message": "文档创建成功"
}
```

### 第四步：测试创建会员汇总文档

```bash
# 在服务器上执行
curl -X POST "http://localhost:3000/api/wecom/document/member-summary" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "date": "2024-01-01",
    "operator_id": 1
  }'
```

**预期结果：**
```json
{
  "success": true,
  "data": {
    "doc_id": "xxx",
    "doc_name": "会员汇总报告-2024-01-01",
    "doc_url": "https://...",
    "share_url": "https://..."
  },
  "message": "文档创建成功"
}
```

### 第五步：验证文档是否创建成功

1. **检查数据库记录：**
```bash
mysql -u h5_cloud_user -p h5_cloud_db -e "SELECT * FROM wecom_documents ORDER BY created_at DESC LIMIT 5;"
```

2. **在企业微信中查看：**
   - 打开企业微信
   - 进入"文档"应用
   - 查看是否出现了新创建的文档

3. **访问文档链接：**
   - 复制返回的 `doc_url` 或 `share_url`
   - 在浏览器中打开，应该能看到文档内容

## 常见问题排查

### 问题1：返回"企业微信配置不存在"

**原因：** 数据库中没有企业微信配置

**解决：**
```bash
# 检查配置是否存在
mysql -u h5_cloud_user -p h5_cloud_db -e "SELECT * FROM wecom_config WHERE id = 1;"

# 如果不存在，需要先配置企业微信
# 访问：https://admin.xinghun.info/wecom/config
```

### 问题2：返回"无法获取企业微信Access Token"

**原因：** 
- corp_id 或 secret 配置错误
- 网络问题
- 企业微信API限制

**排查：**
```bash
# 手动测试获取Token
CORP_ID="你的企业ID"
SECRET="你的应用密钥"
curl "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}"
```

### 问题3：返回"创建文档失败: 无权限"

**原因：** 应用没有开启"文档"权限

**解决：**
1. 登录企业微信管理后台
2. 进入应用管理 → 你的CRM应用
3. 在权限管理中开启"文档"权限
4. 保存并等待权限生效（可能需要几分钟）

### 问题4：API返回格式错误

**原因：** 企业微信文档API格式可能与我实现的不同

**解决：**
1. 查看服务器日志：
```bash
pm2 logs sncrm --err | grep -i "document\|wecom"
```

2. 查看企业微信官方文档：
   - 访问：https://developer.work.weixin.qq.com/document/path/93655
   - 确认最新的API格式

3. 根据实际错误信息调整代码

## 快速测试脚本

创建一个测试脚本 `scripts/test-wecom-document.sh`：

```bash
#!/bin/bash

# 测试企业微信文档创建功能

BASE_URL="http://localhost:3000"
# 或者生产环境：BASE_URL="https://admin.xinghun.info"

echo "=== 测试1: 创建通用文档 ==="
curl -X POST "${BASE_URL}/api/wecom/document/create" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_name": "测试文档-'$(date +%Y%m%d-%H%M%S)'",
    "doc_type": "doc",
    "content": "# 测试文档\n\n创建时间：'$(date)'\n\n这是一个测试文档。",
    "operator_id": 1
  }' | jq .

echo -e "\n=== 测试2: 创建会员汇总文档 ==="
curl -X POST "${BASE_URL}/api/wecom/document/member-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "'$(date +%Y-%m-%d)'",
    "operator_id": 1
  }' | jq .

echo -e "\n=== 检查数据库记录 ==="
mysql -u h5_cloud_user -p h5_cloud_db -e "SELECT doc_name, doc_type, crm_type, created_at FROM wecom_documents ORDER BY created_at DESC LIMIT 3;"
```

使用方法：
```bash
chmod +x scripts/test-wecom-document.sh
./scripts/test-wecom-document.sh
```

## 在浏览器中测试

如果API需要登录，可以在浏览器控制台测试：

```javascript
// 1. 测试创建通用文档
fetch('/api/wecom/document/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    doc_name: '测试文档-' + new Date().toISOString(),
    doc_type: 'doc',
    content: '# 测试文档\n\n这是一个测试文档\n\n- 项目1\n- 项目2',
    operator_id: 1
  })
})
.then(res => res.json())
.then(data => {
  console.log('创建结果:', data);
  if (data.success && data.data.share_url) {
    window.open(data.data.share_url, '_blank');
  }
});

// 2. 测试创建会员汇总文档
fetch('/api/wecom/document/member-summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    date: new Date().toISOString().split('T')[0],
    operator_id: 1
  })
})
.then(res => res.json())
.then(data => {
  console.log('创建结果:', data);
  if (data.success && data.data.share_url) {
    window.open(data.data.share_url, '_blank');
  }
});
```

## 验证文档内容

创建成功后：
1. 在企业微信中打开文档
2. 检查文档内容是否正确
3. 检查格式是否正常
4. 测试分享链接是否可以访问

