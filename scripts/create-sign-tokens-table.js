const mysql = require('mysql2/promise');

async function createSignTokensTable() {
  const connection = await mysql.createConnection({
    host: '121.41.65.220',
    user: 'h5_cloud_user',
    password: 'mc72TNcMmy6HCybH',
    port: 3306,
    database: 'h5_cloud_db',
    charset: 'utf8mb4'
  });

  try {
    console.log('🔧 开始创建合同签署令牌表...');

    // 创建合同签署令牌表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_sign_tokens (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        contract_id BIGINT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        INDEX idx_token (token),
        INDEX idx_contract_id (contract_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加注释
    await connection.execute(`
      ALTER TABLE contract_sign_tokens 
      COMMENT = '合同签署令牌表，用于生成安全的签署链接'
    `);

    console.log('✅ 合同签署令牌表创建成功！');

    // 验证表是否创建成功
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'contract_sign_tokens'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 表验证成功，contract_sign_tokens 表已存在');
    } else {
      console.log('❌ 表验证失败，contract_sign_tokens 表未创建');
    }

  } catch (error) {
    console.error('❌ 创建表失败:', error);
  } finally {
    await connection.end();
  }
}

// 运行脚本
createSignTokensTable();
