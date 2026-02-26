-- 企业微信文档关联表
CREATE TABLE IF NOT EXISTS wecom_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doc_id VARCHAR(128) UNIQUE COMMENT '企业微信文档ID',
  doc_name VARCHAR(255) COMMENT '文档名称',
  doc_type VARCHAR(32) COMMENT '文档类型：doc|sheet|slide',
  doc_url VARCHAR(500) COMMENT '文档访问URL',
  share_url VARCHAR(500) COMMENT '分享链接',
  crm_type VARCHAR(32) COMMENT '关联的CRM类型：member|contract|income|member_summary',
  crm_id INT COMMENT '关联的CRM记录ID',
  created_by INT COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doc_id (doc_id),
  INDEX idx_crm_type_id (crm_type, crm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业微信文档关联表';

