-- 创建会员插入触发器
-- 当members表新增记录时自动添加到通知队列

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