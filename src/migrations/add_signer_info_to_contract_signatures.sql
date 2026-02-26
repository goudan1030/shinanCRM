-- 添加签署者信息字段到合同签署记录表
-- 创建时间: 2025-01-17

-- 为contract_signatures表添加签署者信息字段
ALTER TABLE contract_signatures 
ADD COLUMN signer_real_name VARCHAR(50) COMMENT '签署者真实姓名',
ADD COLUMN signer_id_card VARCHAR(18) COMMENT '签署者身份证号',
ADD COLUMN signer_phone VARCHAR(20) COMMENT '签署者手机号';

-- 添加索引
CREATE INDEX idx_contract_signatures_signer_info ON contract_signatures(signer_real_name, signer_id_card);
