-- 添加 notes 字段到 member_type_logs 表
ALTER TABLE member_type_logs
ADD COLUMN IF NOT EXISTS notes TEXT;