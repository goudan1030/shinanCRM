-- 性能优化脚本 - 添加关键索引

-- 会员表索引
ALTER TABLE members ADD INDEX idx_members_created_at (created_at);
ALTER TABLE members ADD INDEX idx_members_updated_at (updated_at);
ALTER TABLE members ADD INDEX idx_members_status (status);
ALTER TABLE members ADD INDEX idx_members_phone (phone); -- 假设用户经常按手机号查询
ALTER TABLE members ADD INDEX idx_members_email (email); -- 假设用户经常按邮箱查询

-- 财务表索引
ALTER TABLE finances ADD INDEX idx_finances_created_at (created_at);
ALTER TABLE finances ADD INDEX idx_finances_type (type);
ALTER TABLE finances ADD INDEX idx_finances_status (status);

-- 小程序表索引
ALTER TABLE miniapps ADD INDEX idx_miniapps_created_at (created_at);
ALTER TABLE miniapps ADD INDEX idx_miniapps_status (status);

-- 企业微信表索引
ALTER TABLE wecom ADD INDEX idx_wecom_created_at (created_at);
ALTER TABLE wecom ADD INDEX idx_wecom_status (status);

-- 用户活动表索引
ALTER TABLE user_activities ADD INDEX idx_activities_user_id (user_id);
ALTER TABLE user_activities ADD INDEX idx_activities_created_at (created_at);

-- Banner表索引
ALTER TABLE banners ADD INDEX idx_banners_category_id (category_id);
ALTER TABLE banners ADD INDEX idx_banners_status (status);
ALTER TABLE banners ADD INDEX idx_banners_sort_order (sort_order);

-- 优化表存储引擎和字符集
ALTER TABLE members ENGINE=InnoDB, CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci;
ALTER TABLE finances ENGINE=InnoDB, CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci;
ALTER TABLE miniapps ENGINE=InnoDB, CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci;
ALTER TABLE wecom ENGINE=InnoDB, CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci;
ALTER TABLE banners ENGINE=InnoDB, CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci;

-- 修复或优化表结构
OPTIMIZE TABLE members;
OPTIMIZE TABLE finances;
OPTIMIZE TABLE miniapps;
OPTIMIZE TABLE wecom;
OPTIMIZE TABLE banners; 