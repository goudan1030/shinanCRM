# 企业微信文档对接测试指南

## 功能说明

**重要：** 本功能是**更新现有企业微信文档的内容**，而不是创建新文档。

使用流程：
1. 在企业微信中手动创建文档（或使用已有文档）
2. 获取文档ID
3. 调用API更新文档内容，将CRM数据同步到文档中

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

### 第三步：获取企业微信文档ID

**方法1：从文档URL获取**
1. 在企业微信中打开文档
2. 复制文档链接，格式类似：`https://doc.weixin.qq.com/sheet/e3_xxx`
3. 文档ID通常是URL中的 `e3_xxx` 部分

**方法2：通过API获取文档列表**
```bash
# 需要先确认企业微信是否提供文档列表API
# 如果提供，可以调用获取文档列表
```

**方法3：手动记录**
在企业微信中创建文档后，记录文档ID（通常在企业微信文档的URL或设置中可以找到）

### 第四步：测试更新文档内容

```bash
# 在服务器上执行（需要先登录获取session）
# 替换 DOC_ID 为你的企业微信文档ID
DOC_ID="你的文档ID"

curl -X POST "http://localhost:3000/api/wecom/document/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "doc_id": "'${DOC_ID}'",
    "content": "# 测试更新\n\n更新时间：'$(date)'\n\n这是一个测试更新\n\n- 项目1\n- 项目2",
    "append": false
  }'
```

**预期结果：**
```json
{
  "success": true,
  "data": {
    "doc_id": "xxx",
    "updated": true
  },
  "message": "文档更新成功"
}
```

### 第五步：测试同步会员信息到文档

```bash
# 在服务器上执行
# 替换 DOC_ID 为你的企业微信文档ID
DOC_ID="你的文档ID"

# 同步所有会员信息
curl -X POST "http://localhost:3000/api/wecom/document/sync-member" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "doc_id": "'${DOC_ID}'",
    "append": true
  }'

# 或者同步单个会员
curl -X POST "http://localhost:3000/api/wecom/document/sync-member" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "doc_id": "'${DOC_ID}'",
    "member_id": 123,
    "append": true
  }'
```

**预期结果：**
```json
{
  "success": true,
  "data": {
    "doc_id": "xxx",
    "member_count": 10,
    "updated": true
  },
  "message": "同步成功"
}
```

### 第六步：验证文档内容是否更新

1. **在企业微信中查看：**
   - 打开企业微信
   - 进入"文档"应用
   - 打开你指定的文档
   - 检查内容是否已更新

2. **通过API获取文档内容验证：**
```bash
# 获取文档信息
curl "http://localhost:3000/api/wecom/document/get?doc_id=你的文档ID"
```

3. **检查数据库记录（如果有保存）：**
```bash
mysql -u h5_cloud_user -p h5_cloud_db -e "SELECT * FROM wecom_documents WHERE doc_id = '你的文档ID';"
```

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

**原因：** 
- 应用没有开启"文档"权限
- 文档ID不正确
- 文档不存在或无权访问

**解决：**
1. 确认文档ID是否正确：
   ```bash
   # 测试获取文档信息
   curl "http://localhost:3000/api/wecom/document/get?doc_id=你的文档ID"
   ```

2. 在企业微信管理后台开启"文档"权限：
   - 登录企业微信管理后台
   - 进入应用管理 → 你的CRM应用
   - 在权限管理中开启"文档"权限
   - 保存并等待权限生效（可能需要几分钟）

3. 确认文档是否在企业微信中存在，并且应用有访问权限

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
// 替换为你的企业微信文档ID
const DOC_ID = '你的文档ID';

// 1. 测试更新文档内容
fetch('/api/wecom/document/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    doc_id: DOC_ID,
    content: '# 测试更新\n\n更新时间：' + new Date().toLocaleString('zh-CN') + '\n\n这是一个测试更新\n\n- 项目1\n- 项目2',
    append: false // false=替换，true=追加
  })
})
.then(res => res.json())
.then(data => {
  console.log('更新结果:', data);
  if (data.success) {
    alert('文档更新成功！请在企业微信中查看');
  } else {
    alert('更新失败：' + (data.error || data.message));
  }
});

// 2. 测试同步会员信息到文档
fetch('/api/wecom/document/sync-member', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    doc_id: DOC_ID,
    append: true // 追加模式，在文档末尾添加会员信息
  })
})
.then(res => res.json())
.then(data => {
  console.log('同步结果:', data);
  if (data.success) {
    alert('会员信息同步成功！共同步 ' + data.data.member_count + ' 位会员');
  } else {
    alert('同步失败：' + (data.error || data.message));
  }
});

// 3. 获取文档信息
fetch('/api/wecom/document/get?doc_id=' + DOC_ID, {
  credentials: 'include'
})
.then(res => res.json())
.then(data => {
  console.log('文档信息:', data);
  if (data.success) {
    console.log('文档名称:', data.data.doc_name);
    console.log('文档链接:', data.data.doc_url);
  }
});
```

## 验证文档内容

创建成功后：
1. 在企业微信中打开文档
2. 检查文档内容是否正确
3. 检查格式是否正常
4. 测试分享链接是否可以访问

