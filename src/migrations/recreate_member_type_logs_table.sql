-- 删除旧的member_type_logs表
DROP TABLE IF EXISTS member_type_logs;

-- 创建新的member_type_logs表
CREATE TABLE member_type_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  old_type VARCHAR(50) NOT NULL,
  new_type VARCHAR(50) NOT NULL,
  payment_time DATETIME,
  expiry_time DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 添加索引以提高查询性能
CREATE INDEX idx_member_type_logs_member_id ON member_type_logs(member_id);
CREATE INDEX idx_member_type_logs_created_at ON member_type_logs(created_at);