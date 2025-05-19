// 数据库连接检查脚本
const mysql = require('mysql2/promise');

// 从.env.template获取数据库配置
const dbConfig = {
  host: '8.149.244.105',
  port: 3306,
  user: 'h5_cloud_user',
  password: 'mc72TNcMmy6HCybH',
  database: 'h5_cloud_db',
  connectTimeout: 10000 // 10秒连接超时
};

async function checkConnection() {
  console.log('开始测试数据库连接...');
  console.log('连接配置:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  try {
    // 尝试创建连接
    console.log('尝试创建连接...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('连接成功!');

    // 尝试执行简单查询
    console.log('尝试执行查询...');
    const [rows] = await connection.execute('SELECT 1 as result');
    console.log('查询成功:', rows);

    // 尝试获取表列表
    console.log('尝试获取表列表...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('数据库表列表:');
    tables.forEach(table => {
      console.log('- ' + Object.values(table)[0]);
    });

    // 关闭连接
    await connection.end();
    console.log('连接已正常关闭');
    
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return false;
  }
}

// 执行连接测试
checkConnection()
  .then(success => {
    if (success) {
      console.log('数据库连接测试完成: 成功');
      process.exit(0);
    } else {
      console.log('数据库连接测试完成: 失败');
      process.exit(1);
    }
  }); 