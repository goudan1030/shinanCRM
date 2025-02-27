-- 创建 admin_users 表（如果不存在）
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(64) NOT NULL,
  name VARCHAR(50),
  role VARCHAR(20) DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员用户表';

-- 插入管理员账户
-- 密码 123456a 的 SHA-256 哈希值
INSERT INTO admin_users (email, password, name, role) 
VALUES (
  'wangyg0909@163.com', 
  '2413fb3709b05939f04cf2e92f7d0897fc2596f9ad0b8a9ea855c7bfebaae892',
  '管理员',
  'admin'
); 