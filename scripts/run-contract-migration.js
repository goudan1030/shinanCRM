#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runContractMigration() {
  let connection;
  
  try {
    console.log('🚀 开始执行合同管理数据库迁移...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '121.41.65.220',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      port: 3306,
      database: 'h5_cloud_db',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../src/migrations/2025-09-17-create-contract-tables-simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 读取迁移文件成功');

    // 分割SQL语句并执行
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 准备执行 ${statements.length} 条SQL语句`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ 执行第 ${i + 1} 条语句...`);
          await connection.execute(statement);
          console.log(`✅ 第 ${i + 1} 条语句执行成功`);
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 条语句执行失败:`, error.message);
          // 继续执行其他语句
        }
      }
    }

    console.log('🎉 合同管理数据库迁移完成！');

    // 验证表是否创建成功
    console.log('🔍 验证表创建情况...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'h5_cloud_db' 
      AND TABLE_NAME IN ('contract_templates', 'contracts', 'contract_signatures')
    `);

    console.log('📊 创建的表:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // 检查模板数据
    const [templates] = await connection.execute('SELECT COUNT(*) as count FROM contract_templates');
    console.log(`📋 合同模板数量: ${templates[0].count}`);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行迁移
runContractMigration().catch(console.error);
