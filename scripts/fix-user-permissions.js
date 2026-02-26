const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 该脚本用于修复数据库用户权限问题
 * 需要使用root用户权限执行
 */
async function fixUserPermissions() {
  console.log('==== 数据库用户权限修复工具 ====');
  
  // 检查环境变量
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.DB_PORT || '3306');
  const DB_NAME = process.env.DB_NAME || 'h5_cloud_db';
  const DB_USER = process.env.DB_USER || 'h5_cloud_user';
  
  // 请求管理员凭据
  console.log('注意: 此脚本需要使用管理员(root)权限执行');
  
  const rootPassword = process.env.DB_ROOT_PASSWORD || '';
  if (!rootPassword) {
    console.warn('⚠️ 未设置 DB_ROOT_PASSWORD 环境变量。如遇到权限问题，请设置此变量。');
  }
  
  try {
    // 创建root连接
    console.log(`\n使用root用户连接到数据库 ${DB_HOST}:${DB_PORT}...`);
    const rootConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: 'root',
      password: rootPassword
    });
    
    console.log('✅ 管理员连接成功!');
    
    // 检查数据库是否存在
    console.log(`\n检查数据库 ${DB_NAME} 是否存在...`);
    const [databases] = await rootConnection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === DB_NAME);
    
    if (!dbExists) {
      console.log(`🔄 数据库 ${DB_NAME} 不存在，正在创建...`);
      await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
      console.log(`✅ 数据库 ${DB_NAME} 创建成功!`);
    } else {
      console.log(`✅ 数据库 ${DB_NAME} 已存在`);
    }
    
    // 检查用户是否存在
    console.log(`\n检查用户 ${DB_USER} 是否存在...`);
    const [users] = await rootConnection.query(`SELECT User FROM mysql.user WHERE User = ?`, [DB_USER]);
    
    if (users.length === 0) {
      console.log(`🔄 用户 ${DB_USER} 不存在，正在创建...`);
      
      // 创建新用户 - 为安全起见，此处使用随机密码，需要用户在环境变量中设置
      const userPassword = process.env.DB_PASSWORD || '';
      if (!userPassword) {
        throw new Error('创建用户需要设置 DB_PASSWORD 环境变量');
      }
      
      // 创建用户并授予权限 (适用于MySQL 8.0+)
      await rootConnection.query(`CREATE USER '${DB_USER}'@'%' IDENTIFIED BY ?`, [userPassword]);
      await rootConnection.query(`GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%'`);
      
      console.log(`✅ 用户 ${DB_USER} 创建成功并已授予权限!`);
    } else {
      console.log(`✅ 用户 ${DB_USER} 已存在`);
      
      // 重新授予权限
      console.log(`🔄 更新用户 ${DB_USER} 的权限...`);
      await rootConnection.query(`GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%'`);
      console.log(`✅ 权限更新成功!`);
    }
    
    // 应用权限更改
    await rootConnection.query('FLUSH PRIVILEGES');
    console.log(`✅ 权限刷新成功!`);
    
    // 检查表情况
    console.log(`\n使用管理员连接检查 ${DB_NAME} 数据库中的表...`);
    await rootConnection.query(`USE ${DB_NAME}`);
    const [tables] = await rootConnection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log(`❌ 警告: ${DB_NAME} 数据库中没有表!`);
    } else {
      console.log(`✅ 发现 ${tables.length} 个表:`);
      const tableNames = tables.map(table => Object.values(table)[0]);
      tableNames.forEach((tableName, index) => {
        console.log(`${index + 1}. ${tableName}`);
      });
    }
    
    // 关闭连接
    await rootConnection.end();
    console.log('\n管理员连接已关闭');
    
    // 测试常规用户连接
    console.log(`\n正在测试 ${DB_USER} 用户的连接和权限...`);
    const userConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: process.env.DB_PASSWORD,
      database: DB_NAME
    });
    
    console.log(`✅ ${DB_USER} 用户连接成功!`);
    
    // 检查表访问权限
    const [userTables] = await userConnection.query('SHOW TABLES');
    console.log(`✅ ${DB_USER} 用户可以访问 ${userTables.length} 个表`);
    
    await userConnection.end();
    console.log(`\n${DB_USER} 用户连接已关闭`);
    
    console.log('\n==== 数据库用户权限修复完成 ====');
    console.log('如果仍然存在问题，请检查MySQL配置和防火墙设置');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('详细错误信息:', error);
    console.log('\n可能的解决方案:');
    console.log('1. 确保设置了正确的环境变量 (DB_ROOT_PASSWORD, DB_PASSWORD)');
    console.log('2. 检查MySQL服务器是否正在运行');
    console.log('3. 检查防火墙设置是否允许连接到MySQL端口');
    console.log('4. 检查MySQL配置文件中的bind-address和skip-networking设置');
  }
}

fixUserPermissions().catch(console.error); 