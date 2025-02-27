-- 创建会员一次性付费信息表
CREATE TABLE IF NOT EXISTS member_one_time_info (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  payment_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE(member_id)
);

-- 创建会员年费信息表
CREATE TABLE IF NOT EXISTS member_annual_info (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  payment_time DATETIME NOT NULL,
  expiry_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE(member_id)
);

-- 移除 members 表中的 payment_time 和 expiry_time 字段（如果存在）
SET @stmt = '';
SELECT IF(
  EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'payment_time'),
  'ALTER TABLE members DROP COLUMN payment_time;',
  ''
) INTO @stmt;
IF @stmt != '' THEN
  PREPARE stmt FROM @stmt;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END IF;

SET @stmt = '';
SELECT IF(
  EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'expiry_time'),
  'ALTER TABLE members DROP COLUMN expiry_time;',
  ''
) INTO @stmt;
IF @stmt != '' THEN
  PREPARE stmt FROM @stmt;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END IF;