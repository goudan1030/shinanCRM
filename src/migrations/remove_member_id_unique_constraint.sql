-- 移除 member_one_time_info 表中 member_id 字段的唯一约束
ALTER TABLE member_one_time_info
DROP CONSTRAINT IF EXISTS member_one_time_info_member_id_key;