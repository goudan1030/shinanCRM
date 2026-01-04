-- 创建每日任务表
CREATE TABLE IF NOT EXISTS daily_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_date DATE NOT NULL COMMENT '任务日期',
  member_id BIGINT NOT NULL COMMENT '会员ID',
  member_no VARCHAR(50) NOT NULL COMMENT '会员编号',
  status ENUM('pending', 'published', 'completed') DEFAULT 'pending' COMMENT '状态：待发布、已发布、已完成',
  published_at DATETIME NULL COMMENT '发布时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_date_member` (`task_date`, `member_id`),
  INDEX `idx_task_date` (`task_date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_member_id` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日任务表';

-- 添加外键约束（如果members表存在且id字段类型匹配）
-- 注意：如果外键创建失败，可以手动检查members表结构
SET @foreign_key_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_tasks'
    AND CONSTRAINT_NAME = 'fk_daily_tasks_member_id'
);

SET @sql = IF(
  @foreign_key_exists = 0,
  'ALTER TABLE daily_tasks 
   ADD CONSTRAINT fk_daily_tasks_member_id 
   FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE',
  'SELECT "外键约束已存在，跳过创建" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建每日任务完成记录表
CREATE TABLE IF NOT EXISTS daily_task_completions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_date DATE NOT NULL COMMENT '任务日期',
  completed_at DATETIME NOT NULL COMMENT '完成时间',
  total_published INT DEFAULT 0 COMMENT '今日发布总数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY `uk_task_date` (`task_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日任务完成记录表';
