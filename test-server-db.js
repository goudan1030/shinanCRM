// 测试远程数据库连接脚本
const mysql = require('mysql2/promise');

async function testServerConnection() {
  console.log('开始测试远程服务器数据库连接...');
  
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: '121.41.65.220',
      port: 3306,
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      database: 'h5_cloud_db'
    });
    
    console.log('✓ 成功连接到远程服务器数据库');
    
    // 测试查询members表
    console.log('正在查询members表数据量...');
    const [result] = await connection.query('SELECT COUNT(*) as total FROM members');
    console.log(`✓ 查询成功，members表共有 ${result[0].total} 条数据`);
    
    // 获取表结构
    console.log('正在获取members表结构...');
    const [columns] = await connection.query('DESCRIBE members');
    console.log('✓ members表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}${col.Null === 'YES' ? ', 可为空' : ''})`);
    });
    
    // 测试获取少量样本数据
    console.log('正在获取少量样本数据...');
    const [samples] = await connection.query('SELECT * FROM members LIMIT 3');
    console.log('✓ 样本数据:');
    samples.forEach((row, index) => {
      console.log(`  [${index + 1}] ID: ${row.id}, Name: ${row.name}, Status: ${row.status}`);
    });
    
    // 关闭连接
    await connection.end();
    console.log('✓ 数据库连接已关闭');
    
  } catch (error) {
    console.error('✗ 连接或查询过程中出错:');
    console.error('  错误类型:', error.constructor.name);
    console.error('  错误消息:', error.message);
    if (error.code) {
      console.error('  错误代码:', error.code);
    }
    if (error.errno) {
      console.error('  错误号:', error.errno);
    }
    if (error.sqlMessage) {
      console.error('  SQL错误:', error.sqlMessage);
    }
  }
}

// 执行测试
testServerConnection(); 