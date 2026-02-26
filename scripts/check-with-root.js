const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkDbWithRoot() {
  try {
    // 提示要输入root密码
    console.log('请注意：此脚本将尝试使用root用户连接数据库');
    
    // 使用命令行参数作为root密码，如果没有提供则使用默认密码
    const rootPassword = process.argv[2] || ''; // 通过命令行参数传入密码
    
    // 连接信息
    const connectionConfig = {
      host: '127.0.0.1', // 通过SSH隧道连接
      port: parseInt(process.env.DB_PORT || '3306'),
      user: 'root',      // 使用root用户
      password: rootPassword
    };
    
    console.log(`正在以root用户连接到MySQL服务器...`);
    
    // 创建到MySQL服务器的连接(不指定数据库)
    const conn = await mysql.createConnection(connectionConfig);
    
    console.log('✅ 成功以root用户连接到MySQL服务器');
    
    // 列出所有数据库
    console.log('\n【所有数据库】:');
    const [databases] = await conn.query('SHOW DATABASES');
    console.table(databases);
    
    // 特别检查h5_cloud_db数据库
    const dbName = process.env.DB_NAME || 'h5_cloud_db';
    console.log(`\n【检查数据库 ${dbName}】:`);
    
    try {
      // 切换到特定数据库
      await conn.query(`USE ${dbName}`);
      console.log(`✅ 成功切换到数据库 ${dbName}`);
      
      // 列出所有表
      const [tables] = await conn.query('SHOW TABLES');
      console.log(`查询到 ${tables.length} 个表:`);
      console.table(tables);
      
      // 检查每个表的记录数
      console.log('\n【表记录数】:');
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0];
        const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`表 ${tableName}: ${countResult[0].count} 条记录`);
      }
      
      // 检查用户权限
      console.log('\n【用户权限】:');
      try {
        const dbUser = process.env.DB_USER || 'h5_cloud_user';
        const [userGrants] = await conn.query(`SHOW GRANTS FOR '${dbUser}'@'%'`);
        console.log(`用户 ${dbUser} 的权限:`);
        userGrants.forEach(grant => {
          console.log(Object.values(grant)[0]);
        });
      } catch (err) {
        console.error(`无法查询用户权限: ${err.message}`);
      }
    } catch (err) {
      console.error(`无法访问数据库 ${dbName}: ${err.message}`);
    }
    
    // 关闭连接
    await conn.end();
    console.log('\n数据库连接已关闭');
    
  } catch (err) {
    console.error('发生错误:', err);
  }
}

// 执行检查
checkDbWithRoot(); 