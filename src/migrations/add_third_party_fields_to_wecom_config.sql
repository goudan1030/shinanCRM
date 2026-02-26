-- 为wecom_config表添加第三方应用需要的字段
-- 参考文档：https://developer.work.weixin.qq.com/tutorial/detail/38

ALTER TABLE wecom_config 
ADD COLUMN suite_id VARCHAR(100) COMMENT '第三方应用Suite ID',
ADD COLUMN suite_secret VARCHAR(200) COMMENT '第三方应用Suite Secret',
ADD COLUMN suite_ticket VARCHAR(200) COMMENT '第三方应用Suite Ticket',
ADD COLUMN suite_access_token VARCHAR(500) COMMENT '第三方应用Suite Access Token',
ADD COLUMN suite_access_token_expires_at TIMESTAMP NULL COMMENT 'Suite Access Token过期时间',
ADD COLUMN auth_corp_id VARCHAR(100) COMMENT '授权企业ID',
ADD COLUMN auth_corp_secret VARCHAR(200) COMMENT '授权企业Secret',
ADD COLUMN auth_corp_access_token VARCHAR(500) COMMENT '授权企业Access Token',
ADD COLUMN auth_corp_access_token_expires_at TIMESTAMP NULL COMMENT '授权企业Access Token过期时间',
ADD COLUMN app_type ENUM('self_built', 'third_party') DEFAULT 'self_built' COMMENT '应用类型：自建应用/第三方应用';

-- 更新现有记录的app_type
UPDATE wecom_config SET app_type = 'self_built' WHERE app_type IS NULL;

-- 添加索引
CREATE INDEX idx_wecom_config_suite_id ON wecom_config(suite_id);
CREATE INDEX idx_wecom_config_auth_corp_id ON wecom_config(auth_corp_id);
CREATE INDEX idx_wecom_config_app_type ON wecom_config(app_type); 