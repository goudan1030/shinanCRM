-- 为会员表添加真实姓名和身份证号字段
-- 创建时间: 2025-01-17

-- 使用动态SQL避免重复添加字段

-- 添加真实姓名字段
SET @sql = (SELECT IF(
    NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'real_name'
    ),
    'ALTER TABLE members ADD COLUMN real_name VARCHAR(50) COMMENT "真实姓名"',
    'SELECT "字段 real_name 已存在，无需添加"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加身份证号字段
SET @sql = (SELECT IF(
    NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'id_card'
    ),
    'ALTER TABLE members ADD COLUMN id_card VARCHAR(18) COMMENT "身份证号"',
    'SELECT "字段 id_card 已存在，无需添加"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加真实姓名索引
SET @sql = (SELECT IF(
    NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND INDEX_NAME = 'idx_members_real_name'
    ),
    'CREATE INDEX idx_members_real_name ON members(real_name)',
    'SELECT "索引 idx_members_real_name 已存在，无需创建"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加身份证号索引
SET @sql = (SELECT IF(
    NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND INDEX_NAME = 'idx_members_id_card'
    ),
    'CREATE INDEX idx_members_id_card ON members(id_card)',
    'SELECT "索引 idx_members_id_card 已存在，无需创建"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 注意：身份证号字段不设置唯一约束，因为可能有未填写的情况
