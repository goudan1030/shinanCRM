-- 修改member_operation_logs表的member_id列类型

-- 1. 首先删除外键约束
ALTER TABLE member_operation_logs
DROP FOREIGN KEY member_operation_logs_ibfk_1;

-- 2. 修改member_id列类型为VARCHAR(36)，匹配UUID格式
ALTER TABLE member_operation_logs
MODIFY COLUMN member_id VARCHAR(36) NOT NULL;

-- 3. 创建索引
ALTER TABLE member_operation_logs
DROP INDEX idx_member_operation_logs_member_id,
ADD INDEX idx_member_operation_logs_member_id (member_id);

-- 4. 打印完成信息
SELECT 'member_operation_logs表结构已更新，member_id列现在可以接受UUID格式。' AS Message; 