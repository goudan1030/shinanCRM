-- 支付宝收款记录表
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
  income_record_id INT COMMENT '关联的收入记录ID',
  synced_at DATETIME COMMENT '同步时间',
  synced_by INT COMMENT '同步操作人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trade_no (trade_no),
  INDEX idx_trade_time (trade_time),
  INDEX idx_member_no (member_no),
  INDEX idx_synced_at (synced_at),
  INDEX idx_income_record_id (income_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付宝收款记录表';

-- 支付宝同步日志表
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

