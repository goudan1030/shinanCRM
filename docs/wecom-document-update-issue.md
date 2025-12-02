# 企业微信文档更新API问题说明

## 问题描述

在调用企业微信文档更新API时，遇到以下错误：
- **404错误**：`企业微信API请求失败:404`
- **500错误**：`POST /api/wecom/document/update 500 (Internal Server Error)`

## 问题原因

根据错误信息和代码分析，**企业微信文档API可能不支持直接更新文档内容**。

企业微信提供的文档API主要包括：
- ✅ `/cgi-bin/doc/create` - 创建文档
- ✅ `/cgi-bin/doc/get` - 获取文档信息
- ✅ `/cgi-bin/doc/share` - 分享文档
- ❌ `/cgi-bin/doc/update` - **更新文档（可能不存在）**

## 已修复内容

### 1. 改进错误处理

已更新以下文件，添加了详细的错误处理和日志记录：
- `src/app/api/wecom/document/update/route.ts`
- `src/app/api/wecom/document/sync-member/route.ts`

**改进点：**
- ✅ 检测404错误并返回明确的错误信息
- ✅ 解析企业微信API的错误代码，提供更详细的错误说明
- ✅ 添加详细的日志记录，便于排查问题
- ✅ 根据错误代码提供针对性的错误提示

### 2. 错误信息说明

现在当API返回404时，会显示：
```
企业微信文档API不支持直接更新内容。错误代码: 404。
请确认：1) 文档ID是否正确；2) 应用是否有文档编辑权限；3) 企业微信是否提供文档更新API。
建议：如需更新文档，请在企业微信客户端中手动编辑，或使用其他方式同步数据。
```

## 替代方案

### 方案1：使用企业微信消息推送（推荐）

将更新内容通过企业微信消息推送给相关人员：

```javascript
// 使用现有的消息推送功能
import { sendWecomMessage } from '@/lib/wecom-api';

// 将文档更新内容作为消息发送
await sendWecomMessage(accessToken, {
  touser: '@all',
  msgtype: 'markdown',
  agentid: config.agent_id,
  markdown: {
    content: `# 文档更新通知\n\n${content}\n\n[查看文档](https://doc.weixin.qq.com/doc/${doc_id})`
  }
});
```

### 方案2：创建新文档

每次更新时创建新文档，保留历史版本：

```javascript
// 使用创建文档API
fetch('/api/wecom/document/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    doc_name: `会员汇总-${new Date().toLocaleDateString()}`,
    doc_type: 'doc',
    content: content,
    crm_type: 'member'
  })
});
```

### 方案3：使用企业微信表格

如果数据是结构化的，可以考虑使用企业微信表格API（如果支持）。

### 方案4：手动编辑

在企业微信客户端中手动编辑文档，通过API获取文档链接并推送给相关人员。

## 验证步骤

1. **检查错误日志**：
   ```bash
   pm2 logs sncrm --err | grep -i "document"
   ```

2. **查看企业微信官方文档**：
   - 访问：https://developer.work.weixin.qq.com/document
   - 搜索"文档"相关API
   - 确认是否有更新文档的接口

3. **测试API端点**：
   ```bash
   # 测试获取文档（应该可以工作）
   curl "https://qyapi.weixin.qq.com/cgi-bin/doc/get?access_token=YOUR_TOKEN&docid=YOUR_DOC_ID"
   
   # 测试更新文档（可能返回404）
   curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/doc/update?access_token=YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"docid":"YOUR_DOC_ID","content":"test"}'
   ```

## 后续建议

1. **联系企业微信技术支持**：确认是否有文档更新API，或是否有其他方式实现文档内容更新

2. **采用替代方案**：如果API确实不支持更新，建议使用消息推送功能，将更新内容推送给相关人员

3. **定期检查**：企业微信可能会在未来版本中添加文档更新API，建议定期查看官方文档更新

## 相关文件

- `src/app/api/wecom/document/update/route.ts` - 文档更新API
- `src/app/api/wecom/document/sync-member/route.ts` - 会员信息同步API
- `docs/wecom-document-quick-test.md` - 快速测试文档
- `docs/wecom-document-test-guide.md` - 测试指南

## 更新日期

2024年（根据实际日期更新）

