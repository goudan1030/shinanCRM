-- 创建企业微信通知触发器和相关结构
-- 解决用户端登记数据无法发送通知的问题

-- 1. 创建通知队列表，用于存储待发送的通知
CREATE TABLE IF NOT EXISTS `member_notification_queue` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) UNSIGNED NOT NULL COMMENT '会员ID',
  `notification_type` enum('NEW_MEMBER','UPDATE_MEMBER') DEFAULT 'NEW_MEMBER' COMMENT '通知类型',
  `status` enum('PENDING','PROCESSING','SUCCESS','FAILED') DEFAULT 'PENDING' COMMENT '处理状态',
  `retry_count` int(11) DEFAULT 0 COMMENT '重试次数',
  `error_message` text DEFAULT NULL COMMENT '错误信息',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `processed_at` timestamp NULL DEFAULT NULL COMMENT '处理时间',
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_member_id` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业微信通知队列';

-- 2. 创建触发器：当members表新增记录时自动添加到通知队列
DELIMITER $$

CREATE TRIGGER `tr_member_insert_notification`
AFTER INSERT ON `members`
FOR EACH ROW
BEGIN
    -- 只对未删除的有效会员创建通知
    IF NEW.deleted = 0 AND NEW.status = 'ACTIVE' THEN
        INSERT INTO member_notification_queue (
            member_id, 
            notification_type, 
            status, 
            created_at
        ) VALUES (
            NEW.id, 
            'NEW_MEMBER', 
            'PENDING', 
            NOW()
        );
    END IF;
END$$

DELIMITER ;

-- 3. 创建存储过程：处理通知队列
DELIMITER $$

CREATE PROCEDURE `ProcessMemberNotificationQueue`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE queue_id BIGINT;
    DECLARE member_id BIGINT;
    DECLARE notification_type VARCHAR(20);
    
    -- 声明游标用于遍历待处理的通知
    DECLARE notification_cursor CURSOR FOR 
        SELECT id, member_id, notification_type 
        FROM member_notification_queue 
        WHERE status = 'PENDING' 
        AND retry_count < 3
        ORDER BY created_at ASC 
        LIMIT 10;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN notification_cursor;
    
    notification_loop: LOOP
        FETCH notification_cursor INTO queue_id, member_id, notification_type;
        
        IF done THEN
            LEAVE notification_loop;
        END IF;
        
        -- 更新状态为处理中
        UPDATE member_notification_queue 
        SET status = 'PROCESSING', processed_at = NOW() 
        WHERE id = queue_id;
        
        -- 这里可以添加调用外部API的逻辑
        -- 实际的企业微信通知将由Node.js应用处理
        
    END LOOP;
    
    CLOSE notification_cursor;
END$$

DELIMITER ;

-- 4. 创建清理过期记录的存储过程
DELIMITER $$

CREATE PROCEDURE `CleanupNotificationQueue`()
BEGIN
    -- 删除7天前已成功处理的记录
    DELETE FROM member_notification_queue 
    WHERE status = 'SUCCESS' 
    AND processed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- 删除30天前的失败记录
    DELETE FROM member_notification_queue 
    WHERE status = 'FAILED' 
    AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END$$

DELIMITER ;

-- 5. 添加索引优化查询性能
ALTER TABLE member_notification_queue ADD INDEX idx_pending_created (status, created_at);
ALTER TABLE member_notification_queue ADD INDEX idx_retry_count (retry_count);

-- 6. 验证触发器是否创建成功
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    TRIGGER_BODY,
    CREATED
FROM information_schema.TRIGGERS 
WHERE TRIGGER_SCHEMA = DATABASE() 
AND TRIGGER_NAME = 'tr_member_insert_notification'; 