const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// 手动输入的PhpMyAdmin中显示的表名列表
const phpMyAdminTables = [
  'admin_users', 'articles', 'banners', 'banner_categories', 
  'benefit_claims', 'chat_groups', 'expense', 'expense_records',
  'favorites', 'income_records', 'members', 'member_operation_logs',
  'member_operation_logs_backup', 'messages', 'miniapp_config',
  'operation_logs', 'sessions', 'settlement_records', 'users',
  'user_member_mapping', 'user_messages', 'user_profiles',
  'user_settings', 'verification_codes', 'wecom_config'
];

async function findMissingTables() {
  try {
    console.log('正在连接到数据库...');
    
    // 使用环境变量中的用户连接
    const conn = await mysql.createConnection({
      host: '127.0.0.1', // 通过SSH隧道连接
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log(`✅ 成功连接到数据库`);
    
    // 获取实际数据库中的表
    console.log('\n【获取数据库中的实际表】:');
    const [tables] = await conn.query('SHOW TABLES');
    const actualTables = tables.map(row => Object.values(row)[0]);
    console.log(`实际数据库中有 ${actualTables.length} 个表:`);
    console.table(actualTables);
    
    // 比较差异
    console.log('\n【表差异分析】:');
    
    // 在PhpMyAdmin中有但在实际数据库中没有的表
    const missingInDb = phpMyAdminTables.filter(table => !actualTables.includes(table));
    console.log(`PhpMyAdmin中有但实际数据库缺少的表 (${missingInDb.length} 个):`);
    console.table(missingInDb);
    
    // 在实际数据库中有但在PhpMyAdmin列表中没有的表
    const missingInPhpMyAdmin = actualTables.filter(table => !phpMyAdminTables.includes(table));
    console.log(`实际数据库中有但PhpMyAdmin列表中缺少的表 (${missingInPhpMyAdmin.length} 个):`);
    console.table(missingInPhpMyAdmin);
    
    // 尝试检查每个缺失的表是否能创建
    if (missingInDb.length > 0) {
      console.log('\n【尝试检查缺失表结构】:');
      
      for (const tableName of missingInDb) {
        try {
          const [tableCheck] = await conn.query(
            `SELECT TABLE_NAME, TABLE_SCHEMA FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [process.env.DB_NAME, tableName]
          );
          
          if (tableCheck.length > 0) {
            console.log(`✅ 表 ${tableName} 在information_schema中存在，但SHOW TABLES中不可见`);
          } else {
            console.log(`❌ 表 ${tableName} 在information_schema中不存在`);
          }
        } catch (err) {
          console.error(`检查表 ${tableName} 时出错: ${err.message}`);
        }
      }
    }
    
    // 检查数据库权限是否有限制
    console.log('\n【检查权限限制】:');
    try {
      const [grants] = await conn.query('SHOW GRANTS');
      console.log('当前用户权限:');
      grants.forEach(grant => {
        console.log(Object.values(grant)[0]);
      });
      
      // 检查是否是对特定表的权限限制
      const limitedTableAccess = grants.some(grant => {
        const grantStr = Object.values(grant)[0].toString();
        return grantStr.includes('ON `h5_cloud_db`.') && !grantStr.includes('ON `h5_cloud_db`.*');
      });
      
      if (limitedTableAccess) {
        console.log('⚠️ 检测到对特定表的权限限制，这可能是表数量不一致的原因');
      } else {
        console.log('✅ 未检测到对特定表的权限限制');
      }
    } catch (err) {
      console.error(`检查权限时出错: ${err.message}`);
    }
    
    // 关闭连接
    await conn.end();
    console.log('\n数据库连接已关闭');
    
    return {
      success: true,
      actualCount: actualTables.length,
      expectedCount: phpMyAdminTables.length,
      missingInDb: missingInDb,
      missingInPhpMyAdmin: missingInPhpMyAdmin
    };
  } catch (err) {
    console.error('发生错误:', err);
    return { success: false, error: err.message };
  }
}

// 执行检查
findMissingTables()
  .then(result => {
    if (result.success) {
      console.log(`\n总结: 数据库中实际有 ${result.actualCount} 个表，PhpMyAdmin中显示有 ${result.expectedCount} 个表`);
      console.log(`缺少的表数量: ${result.missingInDb.length} 个`);
      
      // 提供问题解决建议
      console.log('\n【解决方案建议】:');
      if (result.missingInDb.length > 0) {
        console.log('1. 权限问题: 当前用户可能没有访问所有表的权限');
        console.log('   解决方法: 使用root权限执行 scripts/fix-user-permissions.js 脚本授予完全权限');
        console.log('2. 数据库实例问题: 可能连接到了不同的数据库实例');
        console.log('   解决方法: 检查SSH隧道配置和数据库连接配置');
        console.log('3. 表实际不存在: PhpMyAdmin显示的可能是缓存或历史数据');
        console.log('   解决方法: 使用root用户连接确认表是否真实存在');
      } else {
        console.log('✅ 数据库表数量一致，无需进一步操作');
      }
    } else {
      console.log(`\n总结: 检查数据库表失败: ${result.error}`);
    }
  }); 