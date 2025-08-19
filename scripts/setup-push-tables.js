const fs = require('fs');
const path = require('path');
// 由于数据库模块使用了ES模块语法，我们直接使用mysql2
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sncrm',
  charset: 'utf8mb4'
};

// 执行查询函数
async function executeQuery(sql, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

async function setupPushTables() {
  try {
    console.log('🚀 开始创建推送相关数据表...');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../src/migrations/create_push_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 手动定义SQL语句
    const statements = [
      `CREATE TABLE IF NOT EXISTS push_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('announcement', 'system_notice') NOT NULL COMMENT '推送类型：announcement-公告，system_notice-系统通知',
        title VARCHAR(255) NOT NULL COMMENT '推送标题',
        content TEXT NOT NULL COMMENT '推送内容',
        target_users JSON NULL COMMENT '目标用户ID数组，NULL表示发送给所有用户',
        created_by INT NOT NULL COMMENT '创建人ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_type (type),
        INDEX idx_created_by (created_by),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推送日志表'`,
      
      `CREATE TABLE IF NOT EXISTS device_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT '用户ID',
        device_token VARCHAR(255) NOT NULL COMMENT '设备令牌',
        platform ENUM('ios', 'android') NOT NULL COMMENT '平台：ios-苹果，android-安卓',
        app_version VARCHAR(20) NULL COMMENT 'APP版本号',
        is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活：1-激活，0-未激活',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_device (user_id, device_token),
        INDEX idx_user_id (user_id),
        INDEX idx_platform (platform),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备令牌表'`
    ];
    
    console.log(`📝 找到 ${statements.length} 条SQL语句`);
    
    // 执行每条SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`执行第 ${i + 1} 条语句...`);
      
      try {
        await executeQuery(statement);
        console.log(`✅ 第 ${i + 1} 条语句执行成功`);
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 条语句执行失败:`, error.message);
        // 如果是表已存在的错误，继续执行
        if (error.message.includes('already exists')) {
          console.log(`⚠️  表已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('🎉 推送相关数据表创建完成！');
    
    // 验证表是否创建成功
    console.log('🔍 验证表创建状态...');
    
    const tables = ['push_logs', 'device_tokens'];
    for (const table of tables) {
      try {
        const result = await executeQuery(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`✅ ${table} 表创建成功`);
        } else {
          console.log(`❌ ${table} 表创建失败`);
        }
      } catch (error) {
        console.log(`❌ 验证 ${table} 表失败:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 创建推送数据表失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupPushTables();
}

module.exports = { setupPushTables };
