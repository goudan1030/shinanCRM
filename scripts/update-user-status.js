const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '121.41.65.220',
  user: process.env.DB_USER || 'h5_cloud_user',
  password: process.env.DB_PASSWORD || 'mc72TNcMmy6HCybH',
  database: process.env.DB_NAME || 'h5_cloud_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function updateUserStatus() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('🚀 开始更新用户状态...');
    
    // 1. 查询需要更新的用户数量
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE registered = 1 AND status != "active"'
    );
    const count = countResult[0].count;
    
    if (count === 0) {
      console.log('✅ 没有需要更新的用户');
      return;
    }
    
    console.log(`📊 找到 ${count} 个需要更新的用户`);
    
    // 2. 显示更新前的状态
    const [beforeStats] = await pool.execute(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );
    console.log('📈 更新前的状态统计:');
    console.table(beforeStats);
    
    // 3. 执行更新
    const [updateResult] = await pool.execute(
      'UPDATE users SET status = "active" WHERE registered = 1 AND status != "active"'
    );
    
    console.log(`✅ 成功更新了 ${updateResult.affectedRows} 个用户的状态为 active`);
    
    // 4. 显示更新后的状态
    const [afterStats] = await pool.execute(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );
    console.log('📈 更新后的状态统计:');
    console.table(afterStats);
    
    // 5. 验证更新结果
    const [verifyResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE registered = 1 AND status = "active"'
    );
    console.log(`🔍 验证结果: ${verifyResult[0].count} 个 registered=1 的用户现在是 active 状态`);
    
    // 6. 显示一些示例数据
    const [sampleData] = await pool.execute(
      'SELECT id, phone, nickname, status, registered FROM users WHERE registered = 1 LIMIT 5'
    );
    console.log('📋 更新后的示例数据:');
    console.table(sampleData);
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await pool.end();
  }
}

// 执行更新
updateUserStatus(); 