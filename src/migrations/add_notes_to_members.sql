-- 为 members 表添加 notes 字段
ALTER TABLE members
ADD COLUMN IF NOT EXISTS notes TEXT;