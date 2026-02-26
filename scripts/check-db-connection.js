const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseConnection() {
  console.log('==== 数据库连接诊断工具 ====');
  
  // 打印环境变量
  console.log('环境变量配置:');
  console.log('- DB_HOST:', process.env.DB_HOST);
  console.log('- DB_PORT:', process.env.DB_PORT);
  console.log('- DB_USER:', process.env.DB_USER);
  console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '已设置 (已隐藏)' : '未设置');
  console.log('- DB_NAME:', process.env.DB_NAME);
  
  try {
    // 创建连接
    console.log('\n尝试连接到数据库...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      namedPlaceholders: true
    });
    
    console.log('✅ 数据库连接成功!');
    
    // 检查连接信息
    console.log('\n连接信息:');
    const [connectionInfo] = await connection.query('SELECT @@version as version, database() as current_db, user() as db_user');
    console.log('- MySQL版本:', connectionInfo[0].version);
    console.log('- 当前数据库:', connectionInfo[0].current_db);
    console.log('- 当前用户:', connectionInfo[0].db_user);
    
    // 获取所有表格
    console.log('\n尝试查询所有表格...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ 查询到 ${tables.length} 个表格:`);
    
    // 处理表名(根据mysql2返回的结构提取表名)
    const tableNames = tables.map(table => Object.values(table)[0]);
    tableNames.forEach((tableName, index) => {
      console.log(`${index + 1}. ${tableName}`);
    });
    
    // 检查用户权限
    console.log('\n检查当前用户权限...');
    const [grants] = await connection.query('SHOW GRANTS FOR CURRENT_USER()');
    console.log('用户权限:');
    grants.forEach((grant, index) => {
      console.log(`${index + 1}. ${Object.values(grant)[0]}`);
    });
    
    // 关闭连接
    await connection.end();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 数据库连接错误:', error.message);
    console.error('错误详情:', error);
  }
}

checkDatabaseConnection().catch(console.error); 