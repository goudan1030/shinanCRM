-- 创建推送日志表
CREATE TABLE IF NOT EXISTS push_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('announcement', 'system_notice') NOT NULL COMMENT '推送类型：announcement-公告，system_notice-系统通知',
  title VARCHAR(255) NOT NULL COMMENT '推送标题',
  content TEXT NOT NULL COMMENT '推送内容',
  target_users JSON NULL COMMENT '目标用户ID数组，NULL表示发送给所有用户',
  created_by INT NOT NULL COMMENT '创建人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推送日志表';

-- 创建设备令牌表
CREATE TABLE IF NOT EXISTS device_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  device_token VARCHAR(255) NOT NULL COMMENT '设备令牌',
  platform ENUM('ios', 'android') NOT NULL COMMENT '平台：ios-苹果，android-安卓',
  app_version VARCHAR(20) NULL COMMENT 'APP版本号',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活：1-激活，0-未激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_user_device (user_id, device_token),
  INDEX idx_user_id (user_id),
  INDEX idx_platform (platform),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备令牌表';
