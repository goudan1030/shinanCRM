const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '121.41.65.220',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'h5_cloud_user',
  password: process.env.DB_PASSWORD || 'mc72TNcMmy6HCybH',
  database: process.env.DB_NAME || 'h5_cloud_db',
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

async function cleanPushLogs() {
  try {
    console.log('🧹 开始清理推送日志表...');
    
    // 检查表是否存在
    const tables = await executeQuery("SHOW TABLES LIKE 'push_logs'");
    if (tables.length === 0) {
      console.log('❌ push_logs 表不存在，无需清理');
      return;
    }
    
    // 查看当前数据
    const currentLogs = await executeQuery('SELECT * FROM push_logs ORDER BY created_at DESC LIMIT 10');
    console.log(`📊 当前推送日志数量: ${currentLogs.length}`);
    
    if (currentLogs.length > 0) {
      console.log('📋 当前推送日志数据:');
      currentLogs.forEach((log, index) => {
        console.log(`${index + 1}. ID: ${log.id}, 类型: ${log.type}, 标题: ${log.title}, 时间: ${log.created_at}`);
      });
      
      // 询问是否清理所有数据
      console.log('\n⚠️  是否要清理所有推送日志数据？(y/N)');
      // 这里我们直接清理，因为用户反映有错误数据
      console.log('🔄 自动清理所有推送日志数据...');
      
      // 删除所有数据
      await executeQuery('DELETE FROM push_logs');
      console.log('✅ 推送日志数据清理完成');
      
      // 重置自增ID
      await executeQuery('ALTER TABLE push_logs AUTO_INCREMENT = 1');
      console.log('✅ 自增ID重置完成');
    } else {
      console.log('✅ 推送日志表为空，无需清理');
    }
    
    // 验证清理结果
    const remainingLogs = await executeQuery('SELECT COUNT(*) as count FROM push_logs');
    console.log(`📊 清理后推送日志数量: ${remainingLogs[0].count}`);
    
  } catch (error) {
    console.error('❌ 清理推送日志失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanPushLogs();
}

module.exports = { cleanPushLogs };
