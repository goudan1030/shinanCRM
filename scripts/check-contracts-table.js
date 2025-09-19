const mysql = require('mysql2/promise');

async function checkContractsTable() {
  const connection = await mysql.createConnection({
    host: '8.149.244.105',
    user: 'h5_cloud_user',
    password: 'mc72TNcMmy6HCybH',
    port: 3306,
    database: 'h5_cloud_db',
    charset: 'utf8mb4'
  });

  try {
    console.log('🔍 检查contracts表结构...');

    // 检查contracts表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'contracts'");
    if (tables.length === 0) {
      console.log('❌ contracts表不存在');
      return;
    }

    console.log('✅ contracts表存在');

    // 查看contracts表结构
    const [columns] = await connection.execute('DESCRIBE contracts');
    console.log('\n📋 contracts表结构:');
    columns.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
    });

    // 查看contracts表的主键
    const [keys] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'h5_cloud_db' 
      AND TABLE_NAME = 'contracts' 
      AND CONSTRAINT_NAME = 'PRIMARY'
    `);
    
    console.log('\n🔑 contracts表主键:');
    keys.forEach(key => {
      console.log(`  ${key.COLUMN_NAME}: ${key.DATA_TYPE}`);
    });

  } catch (error) {
    console.error('❌ 检查表失败:', error);
  } finally {
    await connection.end();
  }
}

// 运行脚本
checkContractsTable();
