-- 添加 payment_time 字段到 member_type_logs 表
ALTER TABLE member_type_logs
ADD COLUMN IF NOT EXISTS payment_time TIMESTAMP;