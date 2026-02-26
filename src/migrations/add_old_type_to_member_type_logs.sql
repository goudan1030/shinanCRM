-- 添加 old_type 字段到 member_type_logs 表
ALTER TABLE member_type_logs
ADD COLUMN IF NOT EXISTS old_type VARCHAR;

-- 更新现有记录的 old_type 字段
UPDATE member_type_logs
SET old_type = 'NORMAL'
WHERE old_type IS NULL;

-- 设置 old_type 字段为非空
ALTER TABLE member_type_logs
ALTER COLUMN old_type SET NOT NULL;