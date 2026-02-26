-- 企业微信通知系统 - 简化版SQL脚本
-- 避免权限问题，分步骤执行

-- 第一步：创建通知队列表
CREATE TABLE IF NOT EXISTS `member_notification_queue` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) UNSIGNED NOT NULL COMMENT '会员ID',
  `notification_type` enum('NEW_MEMBER','UPDATE_MEMBER') DEFAULT 'NEW_MEMBER' COMMENT '通知类型',
  `status` enum('PENDING','PROCESSING','SUCCESS','FAILED') DEFAULT 'PENDING' COMMENT '处理状态',
  `retry_count` int(11) DEFAULT 0 COMMENT '重试次数',
  `error_message` text DEFAULT NULL COMMENT '错误信息',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `processed_at` timestamp NULL DEFAULT NULL COMMENT '处理时间',
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_member_id` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业微信通知队列'; 