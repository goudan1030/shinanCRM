const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkDbPermissions() {
  try {
    console.log('正在连接到数据库服务器...');
    
    // 首先尝试使用当前环境变量中的用户连接
    const conn = await mysql.createConnection({
      host: '127.0.0.1', // 通过SSH隧道连接
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log(`✅ 成功以用户 '${process.env.DB_USER}' 连接到数据库`);
    
    // 查看当前用户权限
    console.log('\n【用户权限】检查当前用户权限:');
    const [grants] = await conn.query('SHOW GRANTS');
    console.log('当前用户权限:');
    grants.forEach(grant => {
      console.log(Object.values(grant)[0]);
    });
    
    // 检查所有数据库
    console.log('\n【可访问的数据库】:');
    const [databases] = await conn.query('SHOW DATABASES');
    console.table(databases);
    
    // 检查指定数据库的所有表
    console.log(`\n【数据库 ${process.env.DB_NAME} 的所有表】:`);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`查询到 ${tables.length} 个表:`);
    console.table(tables);
    
    // 关闭连接
    await conn.end();
    console.log('\n数据库连接已关闭');
    
    return { success: true, tableCount: tables.length };
  } catch (err) {
    console.error('发生错误:', err);
    return { success: false, error: err.message };
  }
}

// 执行检查
checkDbPermissions()
  .then(result => {
    if (result.success) {
      console.log(`\n总结: 成功检查数据库权限，发现 ${result.tableCount} 个表`);
    } else {
      console.log(`\n总结: 检查数据库权限失败: ${result.error}`);
    }
  }); 