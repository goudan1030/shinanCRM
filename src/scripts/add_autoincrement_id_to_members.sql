-- 为members表添加自增的id主键列

-- 1. 先备份原有的id列到uuid列
ALTER TABLE members 
ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;

UPDATE members 
SET uuid = id;

-- 2. 删除原有的主键约束
ALTER TABLE members 
DROP PRIMARY KEY;

-- 3. 重命名原有的id列
ALTER TABLE members 
CHANGE COLUMN id old_id VARCHAR(36);

-- 4. 添加新的自增id主键列
ALTER TABLE members 
ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;

-- 5. 更新其他表中的外键引用
-- 注意：执行前请确保已经备份数据库

-- 为member_operation_logs表添加临时列并更新数据
ALTER TABLE member_operation_logs
ADD COLUMN temp_member_id BIGINT UNSIGNED DEFAULT NULL;

-- 更新member_operation_logs表中的成员ID引用
UPDATE member_operation_logs l
JOIN members m ON l.member_id = m.uuid
SET l.temp_member_id = m.id;

-- 删除原来的member_id列和外键
ALTER TABLE member_operation_logs
DROP FOREIGN KEY member_operation_logs_ibfk_1,
DROP COLUMN member_id;

-- 重命名临时列为member_id
ALTER TABLE member_operation_logs
CHANGE COLUMN temp_member_id member_id BIGINT UNSIGNED NOT NULL;

-- 重建外键和索引
ALTER TABLE member_operation_logs
ADD CONSTRAINT member_operation_logs_ibfk_1 
FOREIGN KEY (member_id) REFERENCES members(id),
ADD INDEX idx_member_operation_logs_member_id (member_id);

-- 对其他引用了members.id的表执行类似操作
-- 例如member_type_logs, member_status_logs等

-- 6. 创建索引以便通过uuid查询会员
ALTER TABLE members
ADD INDEX idx_members_uuid (uuid);

-- 7. 打印完成信息
SELECT 'members表结构已更新，增加了自增的id主键列，原有的UUID保存在uuid列中。' AS Message; 