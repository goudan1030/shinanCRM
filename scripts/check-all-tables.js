const mysql = require('mysql2/promise');

async function checkAllTables() {
  try {
    // 创建到本地隧道的连接
    console.log('正在连接到数据库(通过SSH隧道 127.0.0.1)...');
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      database: 'h5_cloud_db'
    });
    
    console.log('✅ 连接成功');
    
    // 使用SHOW TABLES查询
    console.log('\n【方法1】使用SHOW TABLES:');
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`查询到 ${tables.length} 个表:`);
    console.table(tables);
    
    // 使用Information Schema查询
    console.log('\n【方法2】使用Information Schema:');
    const [schemaInfo] = await conn.query(
      'SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME ' +
      'FROM INFORMATION_SCHEMA.TABLES ' +
      'WHERE TABLE_SCHEMA = ?',
      ['h5_cloud_db']
    );
    console.log(`查询到 ${schemaInfo.length} 个表:`);
    console.table(schemaInfo);
    
    // 查询可访问的数据库
    console.log('\n【可访问的数据库】:');
    const [databases] = await conn.query('SHOW DATABASES');
    console.table(databases);

    // 尝试直接查询数据库结构中的表名
    try {
      console.log('\n【尝试直接访问】显示所有表:');
      // 这是一个包含所有可能表的列表，基于你提供的PHPMyAdmin截图
      const possibleTables = [
        'admin_users', 'articles', 'banners', 'banner_categories', 
        'benefit_claims', 'chat_groups', 'expense', 'expense_records',
        'favorites', 'income_records', 'members', 'member_operation_logs',
        'member_operation_logs_backup', 'messages', 'miniapp_config',
        'operation_logs', 'sessions', 'settlement_records', 'users',
        'user_member_mapping', 'user_messages', 'user_profiles',
        'user_settings', 'verification_codes', 'wecom_config'
      ];
      
      for (const table of possibleTables) {
        try {
          const [result] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`✅ 表 ${table} 存在，记录数: ${result[0].count}`);
        } catch (err) {
          console.log(`❌ 表 ${table} 不存在或无权访问: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('尝试直接访问表时出错:', err);
    }
    
    await conn.end();
    console.log('\n数据库连接已关闭');
    
  } catch (err) {
    console.error('发生错误:', err);
  }
}

// 执行检查
checkAllTables(); 