-- 创建会员操作日志表
CREATE TABLE IF NOT EXISTS member_operation_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  old_values JSON,
  new_values JSON,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  operator_id BIGINT UNSIGNED,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (operator_id) REFERENCES admin_users(id),
  INDEX idx_member_operation_logs_member_id (member_id),
  INDEX idx_member_operation_logs_created_at (created_at),
  INDEX idx_member_operation_logs_operation_type (operation_type)
);