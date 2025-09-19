-- 创建合同签署令牌表
CREATE TABLE IF NOT EXISTS contract_sign_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  INDEX idx_token (token),
  INDEX idx_contract_id (contract_id),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加注释
ALTER TABLE contract_sign_tokens 
COMMENT = '合同签署令牌表，用于生成安全的签署链接';
