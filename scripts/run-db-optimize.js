/**
 * 数据库优化脚本
 * 
 * 此脚本用于执行数据库优化操作，包括：
 * 1. 添加索引
 * 2. 优化表结构
 * 3. 设置字符集
 * 
 * 使用方法: node scripts/run-db-optimize.js
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('开始执行数据库优化...');
  
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true  // 允许执行多条SQL语句
  });
  
  try {
    console.log('数据库连接成功');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'optimize-db.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('读取SQL文件成功');
    console.log('开始执行SQL命令...');
    
    // 将SQL文件分割成单独的命令
    const sqlCommands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    // 逐条执行SQL命令
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i].trim() + ';';
      try {
        console.log(`执行SQL命令 (${i + 1}/${sqlCommands.length})`);
        // console.log(command); // 如果需要调试每条命令，取消此行注释
        
        await connection.query(command);
        console.log(`SQL命令 ${i + 1} 执行成功`);
      } catch (sqlError) {
        // 如果是"索引已存在"或"表不存在"等错误，我们可以继续执行
        console.error(`SQL命令 ${i + 1} 执行失败:`, sqlError.message);
        console.log('继续执行下一条命令...');
      }
    }
    
    console.log('所有SQL命令执行完毕');
    
    // 显示优化结果
    console.log('检查数据库索引状态:');
    const [tables] = await connection.query(`SHOW TABLES`);
    
    for (const tableRow of tables) {
      const tableName = tableRow[`Tables_in_${process.env.DB_NAME}`];
      console.log(`\n表 ${tableName} 的索引:`);
      
      const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
      for (const index of indexes) {
        console.log(`  - ${index.Key_name}: 列 ${index.Column_name}, 唯一性 ${index.Non_unique === 0 ? '是' : '否'}`);
      }
    }
    
  } catch (error) {
    console.error('数据库优化过程中出错:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

// 执行主函数
main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
}); 