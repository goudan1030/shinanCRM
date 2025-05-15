const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// 在PhpMyAdmin中看到的表名列表
const expectedTables = [
  'admin_users', 'articles', 'banners', 'banner_categories', 
  'benefit_claims', 'chat_groups', 'expense', 'expense_records',
  'favorites', 'income_records', 'members', 'member_operation_logs',
  'member_operation_logs_backup', 'messages', 'miniapp_config',
  'operation_logs', 'sessions', 'settlement_records', 'users',
  'user_member_mapping', 'user_messages', 'user_profiles',
  'user_settings', 'verification_codes', 'wecom_config'
];

// 表结构定义
const tableDefinitions = {
  'admin_users': `
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100),
      name VARCHAR(100),
      role VARCHAR(20) DEFAULT 'admin',
      status TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  'users': `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      status TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  // 为其他表添加基本结构
  'articles': `
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      author_id INT,
      status TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  // 为其他表添加简单的默认结构
  'generic_table': `
    CREATE TABLE IF NOT EXISTS {table_name} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      description TEXT,
      status TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `
};

async function createMissingTables() {
  try {
    console.log('正在连接到数据库...');
    
    // 使用环境变量中的用户连接
    const conn = await mysql.createConnection({
      host: '127.0.0.1', // 通过SSH隧道连接
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log(`✅ 成功连接到数据库`);
    
    // 获取实际数据库中的表
    console.log('\n【获取数据库中的实际表】:');
    const [tables] = await conn.query('SHOW TABLES');
    const actualTables = tables.map(row => Object.values(row)[0]);
    console.log(`实际数据库中有 ${actualTables.length} 个表`);
    
    // 找出缺少的表
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    console.log(`\n【缺少的表】: ${missingTables.length} 个`);
    console.table(missingTables);
    
    // 尝试创建缺少的表
    if (missingTables.length > 0) {
      console.log('\n【创建缺少的表】:');
      
      for (const tableName of missingTables) {
        try {
          // 获取表定义，如果没有特定定义则使用通用结构
          let tableDefinition = tableDefinitions[tableName] || 
                               tableDefinitions['generic_table'].replace('{table_name}', tableName);
          
          console.log(`正在创建表 ${tableName}...`);
          await conn.query(tableDefinition);
          console.log(`✅ 表 ${tableName} 创建成功`);
        } catch (err) {
          console.error(`创建表 ${tableName} 失败: ${err.message}`);
        }
      }
      
      // 再次检查表数量
      const [tablesAfter] = await conn.query('SHOW TABLES');
      const actualTablesAfter = tablesAfter.map(row => Object.values(row)[0]);
      console.log(`\n表创建后，数据库中有 ${actualTablesAfter.length} 个表`);
    } else {
      console.log('✅ 没有缺少的表，无需创建');
    }
    
    // 关闭连接
    await conn.end();
    console.log('\n数据库连接已关闭');
    
  } catch (err) {
    console.error('发生错误:', err);
  }
}

// 执行脚本
createMissingTables(); 