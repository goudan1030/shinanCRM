-- 为wecom_config表添加通知相关配置字段

-- 添加会员登记通知开关
ALTER TABLE wecom_config 
ADD COLUMN member_notification_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用会员登记通知';

-- 添加通知接收者配置（可以是用户ID列表，用|分隔，@all表示全体）
ALTER TABLE wecom_config 
ADD COLUMN notification_recipients VARCHAR(500) DEFAULT '@all' COMMENT '通知接收者，多个用|分隔，@all表示全体';

-- 添加消息类型配置
ALTER TABLE wecom_config 
ADD COLUMN message_type ENUM('text', 'textcard', 'markdown') DEFAULT 'textcard' COMMENT '消息类型';

-- 添加自定义消息模板字段（可选）
ALTER TABLE wecom_config 
ADD COLUMN custom_message_template TEXT DEFAULT NULL COMMENT '自定义消息模板';

-- 为了确保配置表有数据，如果表为空则插入默认配置
INSERT IGNORE INTO wecom_config (id, corp_id, agent_id, secret, member_notification_enabled, notification_recipients, message_type) 
VALUES (1, '', '', '', TRUE, '@all', 'textcard'); 