const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('开始测试数据库连接...');
  console.log('使用配置:', {
    host: '127.0.0.1', // 强制使用本地主机地址
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordLength: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0
  });

  let connection;
  try {
    // 创建连接
    connection = await mysql.createConnection({
      host: '127.0.0.1', // 强制使用本地主机地址
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ 数据库连接成功!');
    
    // 测试查询
    console.log('尝试执行测试查询...');
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✅ 查询成功:', rows);
    
    // 获取数据库版本信息
    const [versionRows] = await connection.query('SELECT version() as version');
    console.log('✅ 数据库版本:', versionRows[0].version);
    
    // 获取数据库表信息
    const [tables] = await connection.query('SHOW TABLES');
    console.log('✅ 数据库表列表:');
    tables.forEach((tableRow, index) => {
      const tableName = Object.values(tableRow)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('请确保SSH隧道已建立，或检查数据库主机和端口配置');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('用户名或密码错误，请检查配置');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('数据库不存在，请检查数据库名称');
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行测试
testConnection()
  .then(success => {
    if (success) {
      console.log('\n总结: 数据库连接测试通过! ✅');
    } else {
      console.log('\n总结: 数据库连接测试失败! ❌');
      console.log('请检查你的环境配置和服务器设置。');
    }
  })
  .catch(err => {
    console.error('测试过程中发生错误:', err);
  }); 