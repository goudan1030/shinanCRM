-- 合同管理相关表创建 - 简化版
-- 创建时间: 2025-09-17

-- 合同模板表
CREATE TABLE contract_templates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    type ENUM('MEMBERSHIP', 'ONE_TIME', 'ANNUAL') NOT NULL COMMENT '合同类型',
    template_content TEXT NOT NULL COMMENT '模板内容(HTML)',
    variables_schema JSON COMMENT '变量定义',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='合同模板表';

-- 合同表
CREATE TABLE contracts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(50) UNIQUE NOT NULL COMMENT '合同编号',
    member_id BIGINT NOT NULL COMMENT '会员ID',
    contract_type ENUM('MEMBERSHIP', 'ONE_TIME', 'ANNUAL') NOT NULL COMMENT '合同类型',
    template_id BIGINT NOT NULL COMMENT '模板ID',
    status ENUM('DRAFT', 'PENDING', 'SIGNED', 'EXPIRED', 'CANCELLED') DEFAULT 'DRAFT' COMMENT '合同状态',
    content TEXT NOT NULL COMMENT '合同内容(HTML)',
    variables JSON COMMENT '变量数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    signed_at TIMESTAMP NULL COMMENT '签署时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    pdf_url VARCHAR(500) COMMENT 'PDF文件URL',
    signature_data JSON COMMENT '签名数据',
    signature_hash VARCHAR(64) COMMENT '签名哈希',
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE RESTRICT
) COMMENT='合同表';

-- 合同签署记录表
CREATE TABLE contract_signatures (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_id BIGINT NOT NULL COMMENT '合同ID',
    signer_type ENUM('CUSTOMER', 'COMPANY') NOT NULL COMMENT '签署方类型',
    signature_data TEXT NOT NULL COMMENT '签名数据(Base64)',
    signature_hash VARCHAR(64) NOT NULL COMMENT '签名哈希',
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '签署时间',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
) COMMENT='合同签署记录表';

-- 创建索引
CREATE INDEX idx_contracts_member_id ON contracts(member_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id);
CREATE INDEX idx_contract_templates_type ON contract_templates(type);
