const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'h5_cloud_db'
  });

  try {
    console.log('🔍 检查数据库中的表...');

    // 显示所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库中的表:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    // 检查是否有合同相关的表
    const contractTables = tables.filter(table => {
      const tableName = Object.values(table)[0];
      return tableName.toLowerCase().includes('contract');
    });

    if (contractTables.length > 0) {
      console.log('\n📄 合同相关表:');
      contractTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
    } else {
      console.log('\n❌ 未找到合同相关表');
    }

  } catch (error) {
    console.error('❌ 检查表失败:', error);
  } finally {
    await connection.end();
  }
}

// 运行脚本
checkTables();
