# 企业微信文档对接方案

## 需求分析

将CRM系统中的信息（会员信息、合同等）自动同步到企业微信文档，实现：
1. 自动创建企业微信文档
2. 将CRM数据写入文档
3. 支持文档分享和协作
4. 文档与CRM数据关联

## 企业微信文档API

企业微信提供了文档相关的API接口：

### 1. 创建文档
- **接口**：`/cgi-bin/doc/create`
- **功能**：创建新的文档（支持多种格式：文档、表格、幻灯片等）
- **权限**：需要"文档"权限

### 2. 上传文件
- **接口**：`/cgi-bin/media/upload`
- **功能**：上传文件到企业微信
- **权限**：需要"文件管理"权限

### 3. 分享文档
- **接口**：`/cgi-bin/doc/share`
- **功能**：生成文档分享链接
- **权限**：需要"文档"权限

### 4. 获取文档信息
- **接口**：`/cgi-bin/doc/get`
- **功能**：获取文档详情
- **权限**：需要"文档"权限

## 实现方案

### 方案1：自动创建文档（推荐）

**适用场景：** 定期生成报表、会员汇总等

**实现方式：**
1. 定时任务获取CRM数据
2. 格式化数据为文档内容
3. 调用企业微信API创建文档
4. 分享文档链接到企业微信群

### 方案2：实时同步文档

**适用场景：** 会员信息变更、合同签署等实时同步

**实现方式：**
1. 监听CRM数据变更事件
2. 实时更新企业微信文档
3. 通知相关人员

### 方案3：文档模板填充

**适用场景：** 使用企业微信文档模板，填充CRM数据

**实现方式：**
1. 在企业微信中创建文档模板
2. 获取模板ID
3. 使用API填充数据到模板
4. 生成新文档

## 推荐实现

**第一阶段：** 实现方案1（自动创建文档）
- 会员汇总文档
- 合同汇总文档
- 收入统计文档

**第二阶段：** 实现方案2（实时同步）
- 会员信息变更同步
- 合同状态更新同步

## 数据库设计

### 企业微信文档关联表（wecom_documents）

```sql
CREATE TABLE IF NOT EXISTS wecom_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doc_id VARCHAR(128) UNIQUE COMMENT '企业微信文档ID',
  doc_name VARCHAR(255) COMMENT '文档名称',
  doc_type VARCHAR(32) COMMENT '文档类型：doc|sheet|slide',
  doc_url VARCHAR(500) COMMENT '文档访问URL',
  share_url VARCHAR(500) COMMENT '分享链接',
  crm_type VARCHAR(32) COMMENT '关联的CRM类型：member|contract|income',
  crm_id INT COMMENT '关联的CRM记录ID',
  created_by INT COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doc_id (doc_id),
  INDEX idx_crm_type_id (crm_type, crm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业微信文档关联表';
```

## 功能模块

### 1. 文档创建API
- 创建会员汇总文档
- 创建合同汇总文档
- 创建收入统计文档

### 2. 文档更新API
- 更新文档内容
- 同步CRM数据变更

### 3. 文档分享API
- 生成分享链接
- 发送到企业微信群

## 注意事项

1. **API权限**：需要在企业微信后台为应用开启"文档"权限
2. **Access Token**：复用现有的token获取机制
3. **文档格式**：支持富文本、表格、Markdown等格式
4. **数据量限制**：注意企业微信API的调用频率限制

