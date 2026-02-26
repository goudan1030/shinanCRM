/**
 * 数据库索引检查脚本
 * 
 * 此脚本用于检查数据库表的索引状态，以便识别可能需要优化的表
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkIndexes() {
  console.log('开始检查数据库索引...');
  
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  try {
    // 获取所有表
    const [tables] = await connection.query(`SHOW TABLES`);
    console.log(`找到 ${tables.length} 个表`);
    
    // 遍历各个表
    for (const tableRow of tables) {
      const tableName = tableRow[`Tables_in_${process.env.DB_NAME}`];
      console.log(`\n-------- 表: ${tableName} --------`);
      
      // 获取表结构
      const [tableInfo] = await connection.query(`DESCRIBE ${tableName}`);
      console.log(`字段数: ${tableInfo.length}`);
      
      // 获取表索引
      const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
      const indexCount = new Set(indexes.map(idx => idx.Key_name)).size;
      console.log(`索引数: ${indexCount}`);
      
      if (indexCount <= 1) {
        console.log('⚠️ 警告: 该表可能缺少必要的索引');
      }
      
      // 获取表数据量
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult[0].count;
      console.log(`数据量: ${rowCount} 行`);
      
      // 显示索引详情
      console.log('索引详情:');
      const indexMap = {};
      indexes.forEach(idx => {
        if (!indexMap[idx.Key_name]) {
          indexMap[idx.Key_name] = [];
        }
        indexMap[idx.Key_name].push(idx.Column_name);
      });
      
      for (const [indexName, columns] of Object.entries(indexMap)) {
        console.log(`  - ${indexName}: ${columns.join(', ')}`);
      }
      
      // 如果表行数超过1000但没有足够的索引，显示警告
      if (rowCount > 1000 && indexCount <= 1) {
        console.log('⚠️ 性能警告: 该表数据量较大但索引不足，可能导致查询性能问题');
        console.log('   建议: 根据查询模式为常用查询字段添加索引');
      }
    }
    
    console.log('\n索引检查完成');
    
  } catch (error) {
    console.error('检查数据库索引时出错:', error);
  } finally {
    await connection.end();
  }
}

// 执行检查
checkIndexes().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});

// 导出函数供其他模块使用
module.exports = checkIndexes; 