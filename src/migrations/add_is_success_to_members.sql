-- 为members表添加is_success字段
-- is_success: 1表示找到了，0表示未找到
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS is_success TINYINT(1) DEFAULT 0 COMMENT '是否找到：1为找到了，0为未找到' AFTER status;

-- 添加索引以便筛选
CREATE INDEX IF NOT EXISTS idx_is_success ON members(is_success);
