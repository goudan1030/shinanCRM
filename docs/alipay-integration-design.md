# 支付宝企业收款对接方案

## 需求分析

将企业支付宝收款记录自动同步到CRM系统，实现：
1. 自动获取支付宝收款记录
2. 将收款记录导入到收入管理模块
3. 支持手动同步和自动同步
4. 收款记录与会员关联

## 技术方案

### 方案1：支付宝开放平台API（推荐）

**适用场景：** 企业支付宝账户，有开放平台应用

**实现方式：**
1. 在支付宝开放平台创建应用
2. 使用对账单下载接口（`alipay.data.dataservice.bill.downloadurl.query`）
3. 下载对账单CSV文件
4. 解析CSV并导入数据库

**优点：**
- 官方API，稳定可靠
- 支持历史数据查询
- 数据准确

**缺点：**
- 需要申请开放平台应用
- 需要配置密钥和证书

### 方案2：支付宝企业账户账单导出

**适用场景：** 企业支付宝账户，无开放平台应用

**实现方式：**
1. 登录企业支付宝账户
2. 导出账单CSV文件
3. 手动或定时上传到系统
4. 解析并导入数据库

**优点：**
- 无需申请API
- 实现简单

**缺点：**
- 需要手动操作或爬虫
- 不够自动化

### 方案3：支付宝收款码回调（实时）

**适用场景：** 使用支付宝收款码收款

**实现方式：**
1. 配置支付宝收款码回调URL
2. 接收支付宝回调通知
3. 实时记录收款信息

**优点：**
- 实时同步
- 自动化程度高

**缺点：**
- 需要配置回调地址
- 需要处理回调验证

## 推荐方案

**第一阶段：** 使用方案2（账单导出+手动上传），快速实现基础功能
**第二阶段：** 升级到方案1（开放平台API），实现自动化同步

## 数据库设计

### 支付宝收款记录表（alipay_transactions）

```sql
CREATE TABLE IF NOT EXISTS alipay_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trade_no VARCHAR(64) UNIQUE COMMENT '支付宝交易号',
  out_trade_no VARCHAR(64) COMMENT '商户订单号',
  trade_time DATETIME COMMENT '交易时间',
  amount DECIMAL(10, 2) COMMENT '交易金额',
  payer_account VARCHAR(128) COMMENT '付款方账号',
  payer_name VARCHAR(128) COMMENT '付款方姓名',
  trade_status VARCHAR(32) COMMENT '交易状态',
  trade_type VARCHAR(32) COMMENT '交易类型',
  product_name VARCHAR(255) COMMENT '商品名称',
  remark VARCHAR(500) COMMENT '备注',
  member_no VARCHAR(50) COMMENT '关联会员编号',
  synced_at DATETIME COMMENT '同步时间',
  synced_by INT COMMENT '同步操作人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trade_no (trade_no),
  INDEX idx_trade_time (trade_time),
  INDEX idx_member_no (member_no),
  INDEX idx_synced_at (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付宝收款记录表';
```

### 支付宝同步日志表（alipay_sync_logs）

```sql
CREATE TABLE IF NOT EXISTS alipay_sync_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sync_type VARCHAR(32) COMMENT '同步类型：manual|auto|upload',
  sync_date DATE COMMENT '同步日期',
  total_count INT DEFAULT 0 COMMENT '总记录数',
  success_count INT DEFAULT 0 COMMENT '成功数',
  failed_count INT DEFAULT 0 COMMENT '失败数',
  error_message TEXT COMMENT '错误信息',
  operator_id INT COMMENT '操作人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_date (sync_date),
  INDEX idx_sync_type (sync_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付宝同步日志表';
```

## 功能模块

### 1. 支付宝收款记录管理页面
- 列表展示
- 搜索和筛选
- 关联会员
- 导入收入记录

### 2. 数据同步功能
- 手动同步（上传CSV文件）
- 自动同步（定时任务）
- 同步日志查看

### 3. API接口
- 上传CSV文件解析
- 查询收款记录
- 关联会员
- 导入收入记录

## 实现步骤

1. 创建数据库表
2. 创建API接口（上传、查询、关联、导入）
3. 创建前端页面（列表、上传、关联）
4. 实现CSV解析逻辑
5. 实现定时同步任务（可选）

