-- 创建会员资料更新通知触发器
-- 当members表更新记录时自动添加到通知队列

-- 1. 添加updated_fields字段到通知队列表（如果不存在）
ALTER TABLE `member_notification_queue` 
ADD COLUMN IF NOT EXISTS `updated_fields` TEXT DEFAULT NULL COMMENT '更新的字段列表（JSON格式）';

DELIMITER $$

-- 删除已存在的触发器
DROP TRIGGER IF EXISTS `tr_member_update_notification`$$

-- 创建会员更新触发器
CREATE TRIGGER `tr_member_update_notification`
AFTER UPDATE ON `members`
FOR EACH ROW
BEGIN
    DECLARE updated_fields_json TEXT DEFAULT '';
    
    -- 只对未删除的有效会员创建通知
    IF NEW.deleted = 0 AND NEW.status = 'ACTIVE' THEN
        -- 检查并收集更新的字段
        SET updated_fields_json = '';
        
        IF OLD.nickname != NEW.nickname THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"nickname"');
        END IF;
        
        IF OLD.phone != NEW.phone THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"phone"');
        END IF;
        
        IF OLD.gender != NEW.gender THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"gender"');
        END IF;
        
        IF OLD.birth_year != NEW.birth_year THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"birth_year"');
        END IF;
        
        IF OLD.height != NEW.height THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"height"');
        END IF;
        
        IF OLD.weight != NEW.weight THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"weight"');
        END IF;
        
        IF OLD.province != NEW.province THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"province"');
        END IF;
        
        IF OLD.city != NEW.city THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"city"');
        END IF;
        
        IF OLD.district != NEW.district THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"district"');
        END IF;
        
        IF OLD.hukou_province != NEW.hukou_province THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"hukou_province"');
        END IF;
        
        IF OLD.hukou_city != NEW.hukou_city THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"hukou_city"');
        END IF;
        
        IF OLD.education != NEW.education THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"education"');
        END IF;
        
        IF OLD.occupation != NEW.occupation THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"occupation"');
        END IF;
        
        IF OLD.house_car != NEW.house_car THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"house_car"');
        END IF;
        
        IF OLD.children_plan != NEW.children_plan THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"children_plan"');
        END IF;
        
        IF OLD.marriage_cert != NEW.marriage_cert THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"marriage_cert"');
        END IF;
        
        IF OLD.marriage_history != NEW.marriage_history THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"marriage_history"');
        END IF;
        
        IF OLD.self_description != NEW.self_description THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"self_description"');
        END IF;
        
        IF OLD.partner_requirement != NEW.partner_requirement THEN
            SET updated_fields_json = CONCAT(updated_fields_json, IF(updated_fields_json = '', '', ','), '"partner_requirement"');
        END IF;
        
        -- 如果有字段被更新，则创建通知
        IF updated_fields_json != '' THEN
            SET updated_fields_json = CONCAT('[', updated_fields_json, ']');
            
            INSERT INTO member_notification_queue (
                member_id, 
                notification_type, 
                status, 
                updated_fields,
                created_at
            ) VALUES (
                NEW.id, 
                'UPDATE_MEMBER', 
                'PENDING', 
                updated_fields_json,
                NOW()
            );
        END IF;
    END IF;
END$$

DELIMITER ;
