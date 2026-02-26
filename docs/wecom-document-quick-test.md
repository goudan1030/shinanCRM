# 企业微信文档更新快速测试

## 你的文档信息

**文档链接：** https://doc.weixin.qq.com/doc/w3_AKUAEgblADYJ2pLADqETB0el5CTXK?scode=AOoAHwdVAA8h1k1X1AAKUAEgblADY

**文档ID：** `w3_AKUAEgblADYJ2pLADqETB0el5CTXK`

## 快速测试

### 方法1：浏览器控制台测试（推荐）

打开浏览器控制台（F12），执行以下代码：

```javascript
// 你的文档ID
const DOC_ID = 'w3_AKUAEgblADYJ2pLADqETB0el5CTXK';

// 测试1：更新文档内容
fetch('/api/wecom/document/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    doc_id: DOC_ID,
    content: '# CRM数据同步测试\n\n更新时间：' + new Date().toLocaleString('zh-CN') + '\n\n这是从CRM系统同步的内容。\n\n## 测试内容\n\n- 项目1\n- 项目2\n- 项目3',
    append: false // false=替换整个文档，true=追加到末尾
  })
})
.then(res => res.json())
.then(data => {
  console.log('更新结果:', data);
  if (data.success) {
    alert('✅ 文档更新成功！\n\n请在企业微信中打开文档查看更新后的内容。');
    // 自动打开文档链接
    window.open('https://doc.weixin.qq.com/doc/' + DOC_ID, '_blank');
  } else {
    alert('❌ 更新失败：' + (data.error || data.message));
  }
});

// 测试2：同步会员信息到文档（追加模式）
fetch('/api/wecom/document/sync-member', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    doc_id: DOC_ID,
    append: true // 追加到文档末尾
  })
})
.then(res => res.json())
.then(data => {
  console.log('同步结果:', data);
  if (data.success) {
    alert('✅ 会员信息同步成功！\n\n共同步 ' + data.data.member_count + ' 位会员信息\n\n请在企业微信中查看文档。');
  } else {
    alert('❌ 同步失败：' + (data.error || data.message));
  }
});

// 测试3：获取文档信息
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

### 方法2：使用curl命令测试

```bash
# 在服务器上执行
DOC_ID="w3_AKUAEgblADYJ2pLADqETB0el5CTXK"

# 测试更新文档
curl -X POST "http://localhost:3000/api/wecom/document/update" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "'${DOC_ID}'",
    "content": "# CRM数据同步测试\n\n更新时间：'$(date)'\n\n这是从CRM系统同步的内容。",
    "append": false
  }'

# 测试同步会员信息
curl -X POST "http://localhost:3000/api/wecom/document/sync-member" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "'${DOC_ID}'",
    "append": true
  }'
```

## 验证结果

1. **在企业微信中查看：**
   - 打开企业微信
   - 进入"文档"应用
   - 找到你的文档（或直接打开链接）
   - 检查内容是否已更新

2. **通过API验证：**
```javascript
// 获取文档信息验证
fetch('/api/wecom/document/get?doc_id=w3_AKUAEgblADYJ2pLADqETB0el5CTXK', {
  credentials: 'include'
})
.then(res => res.json())
.then(data => {
  console.log('文档当前内容:', data.data.content);
});
```

## 常见问题

### ⚠️ 重要：企业微信文档API限制

**企业微信文档API可能不支持直接更新文档内容。**

如果遇到 **404错误** 或 **"企业微信API请求失败:404"**，说明：
- 企业微信可能不提供 `/cgi-bin/doc/update` 接口
- 文档内容需要通过企业微信客户端手动编辑

**替代方案：**
1. **使用企业微信消息推送**：将更新内容通过消息推送给相关人员
2. **创建新文档**：每次更新时创建新文档，保留历史版本
3. **使用企业微信的其他功能**：如表格、表单等

### 如果返回"文档不存在"或"无权限"

1. **确认文档ID是否正确：**
   - 从URL `https://doc.weixin.qq.com/doc/w3_AKUAEgblADYJ2pLADqETB0el5CTXK` 中提取
   - 文档ID是：`w3_AKUAEgblADYJ2pLADqETB0el5CTXK`

2. **确认应用权限：**
   - 在企业微信管理后台
   - 应用管理 → 你的CRM应用 → 权限管理
   - 确保开启了"文档"权限

3. **确认文档是否在企业微信中存在：**
   - 直接打开文档链接，确认可以访问

### 如果返回404错误

**原因：** 企业微信文档API可能不支持直接更新内容

**解决方案：**
1. 查看服务器日志获取详细错误信息：
   ```bash
   pm2 logs sncrm --err | grep -i "document"
   ```

2. 检查企业微信官方文档：
   - 访问：https://developer.work.weixin.qq.com/document
   - 确认最新的文档API格式

3. **推荐方案**：使用企业微信消息推送功能，将更新内容推送给相关人员

### 如果API格式不对

企业微信文档API可能需要特定的格式，如果返回错误，请：
1. 查看服务器日志：`pm2 logs sncrm --err | grep -i "document"`
2. 查看具体的错误代码和错误信息
3. 根据错误信息调整代码或采用替代方案

