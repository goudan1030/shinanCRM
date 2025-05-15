const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 该脚本用于比较SSH隧道连接和直接连接的差异
 * 需要设置正确的环境变量才能运行
 */
async function compareConnections() {
  console.log('==== 数据库连接比较工具 ====');
  
  // 从环境变量获取连接信息
  const DB_HOST_TUNNEL = 'localhost'; // SSH隧道本地端口
  const DB_HOST_DIRECT = process.env.REMOTE_DB_HOST || process.env.DB_HOST; // 远程服务器地址
  const DB_PORT_TUNNEL = parseInt(process.env.DB_PORT || '3306');
  const DB_PORT_DIRECT = parseInt(process.env.REMOTE_DB_PORT || process.env.DB_PORT || '3306');
  const DB_USER = process.env.DB_USER || 'h5_cloud_user';
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME || 'h5_cloud_db';
  
  if (!DB_PASSWORD) {
    console.error('❌ 错误: 缺少必要的环境变量 DB_PASSWORD');
    return;
  }
  
  let tunnelConnection = null;
  let directConnection = null;
  
  try {
    // 1. 尝试通过SSH隧道连接
    console.log('\n=== 测试SSH隧道连接 ===');
    console.log(`连接信息: ${DB_USER}@${DB_HOST_TUNNEL}:${DB_PORT_TUNNEL}/${DB_NAME}`);
    
    try {
      tunnelConnection = await mysql.createConnection({
        host: DB_HOST_TUNNEL,
        port: DB_PORT_TUNNEL,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
      });
      
      console.log('✅ SSH隧道连接成功!');
      
      // 获取连接信息
      const [tunnelInfo] = await tunnelConnection.query('SELECT @@version as version, database() as db, user() as user, @@hostname as hostname');
      console.log('- MySQL版本:', tunnelInfo[0].version);
      console.log('- 数据库名称:', tunnelInfo[0].db);
      console.log('- 连接用户:', tunnelInfo[0].user);
      console.log('- 主机名:', tunnelInfo[0].hostname);
      
      // 获取表列表
      const [tunnelTables] = await tunnelConnection.query('SHOW TABLES');
      const tunnelTableNames = tunnelTables.map(table => Object.values(table)[0]);
      
      console.log(`\n通过SSH隧道可以访问 ${tunnelTableNames.length} 个表:`);
      tunnelTableNames.forEach((tableName, index) => {
        console.log(`${index + 1}. ${tableName}`);
      });
      
    } catch (tunnelError) {
      console.error('❌ SSH隧道连接失败:', tunnelError.message);
    }
    
    // 2. 尝试直接连接到远程服务器
    console.log('\n=== 测试直接连接到远程服务器 ===');
    console.log(`连接信息: ${DB_USER}@${DB_HOST_DIRECT}:${DB_PORT_DIRECT}/${DB_NAME}`);
    
    try {
      directConnection = await mysql.createConnection({
        host: DB_HOST_DIRECT,
        port: DB_PORT_DIRECT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectTimeout: 10000 // 增加连接超时时间
      });
      
      console.log('✅ 直接连接成功!');
      
      // 获取连接信息
      const [directInfo] = await directConnection.query('SELECT @@version as version, database() as db, user() as user, @@hostname as hostname');
      console.log('- MySQL版本:', directInfo[0].version);
      console.log('- 数据库名称:', directInfo[0].db);
      console.log('- 连接用户:', directInfo[0].user);
      console.log('- 主机名:', directInfo[0].hostname);
      
      // 获取表列表
      const [directTables] = await directConnection.query('SHOW TABLES');
      const directTableNames = directTables.map(table => Object.values(table)[0]);
      
      console.log(`\n通过直接连接可以访问 ${directTableNames.length} 个表:`);
      directTableNames.forEach((tableName, index) => {
        console.log(`${index + 1}. ${tableName}`);
      });
      
      // 比较两种连接方式的表差异
      if (tunnelConnection) {
        console.log('\n=== 表访问差异分析 ===');
        
        // 找出仅在直接连接中可见的表
        const tunnelOnly = tunnelTableNames.filter(table => !directTableNames.includes(table));
        const directOnly = directTableNames.filter(table => !tunnelTableNames.includes(table));
        const common = tunnelTableNames.filter(table => directTableNames.includes(table));
        
        console.log(`两种连接方式共同可访问的表: ${common.length} 个`);
        console.log(`仅SSH隧道可访问的表: ${tunnelOnly.length} 个`);
        if (tunnelOnly.length > 0) {
          console.log('具体表名:');
          tunnelOnly.forEach(table => console.log(` - ${table}`));
        }
        
        console.log(`仅直接连接可访问的表: ${directOnly.length} 个`);
        if (directOnly.length > 0) {
          console.log('具体表名:');
          directOnly.forEach(table => console.log(` - ${table}`));
        }
      }
      
    } catch (directError) {
      console.error('❌ 直接连接失败:', directError.message);
      console.log('可能的原因: 远程服务器防火墙阻止了直接连接');
    }
    
    // 3. 尝试以root用户连接
    if (process.env.DB_ROOT_PASSWORD) {
      console.log('\n=== 测试root用户连接 ===');
      try {
        const rootConnection = await mysql.createConnection({
          host: DB_HOST_TUNNEL,
          port: DB_PORT_TUNNEL,
          user: 'root',
          password: process.env.DB_ROOT_PASSWORD,
          database: DB_NAME
        });
        
        console.log('✅ root用户连接成功!');
        
        // 获取表列表
        const [rootTables] = await rootConnection.query('SHOW TABLES');
        const rootTableNames = rootTables.map(table => Object.values(table)[0]);
        
        console.log(`\n通过root用户可以访问 ${rootTableNames.length} 个表:`);
        rootTableNames.forEach((tableName, index) => {
          console.log(`${index + 1}. ${tableName}`);
        });
        
        // 检查用户权限
        const [grants] = await rootConnection.query(`SHOW GRANTS FOR '${DB_USER}'@'%'`);
        console.log(`\n${DB_USER} 用户的权限设置:`);
        grants.forEach((grant, index) => {
          console.log(`${index + 1}. ${Object.values(grant)[0]}`);
        });
        
        await rootConnection.end();
      } catch (rootError) {
        console.error('❌ root用户连接失败:', rootError.message);
      }
    } else {
      console.log('\n⚠️ 未提供 DB_ROOT_PASSWORD 环境变量，跳过root用户连接测试');
    }
    
    // 关闭连接
    if (tunnelConnection) await tunnelConnection.end();
    if (directConnection) await directConnection.end();
    
    // 4. 建议解决方案
    console.log('\n=== 建议的解决方案 ===');
    console.log('1. 权限问题:');
    console.log('   - 如果直接连接可以看到更多表，使用root用户进行检查并修复权限');
    console.log('   - 运行修复权限脚本: node scripts/fix-user-permissions.js');
    
    console.log('\n2. 多实例问题:');
    console.log('   - 如果连接的是不同的MySQL实例，需要确保连接正确的实例');
    console.log('   - 检查phpMyAdmin配置和应用程序使用的连接配置是否一致');
    
    console.log('\n3. 隧道问题:');
    console.log('   - 如果SSH隧道连接受限，可尝试调整隧道设置或使用不同的端口');
    console.log('   - 重新建立SSH隧道: ssh -L 3306:127.0.0.1:3306 user@server');
    
  } catch (error) {
    console.error('\n❌ 发生错误:', error.message);
    console.error('详细错误信息:', error);
  }
}

compareConnections().catch(console.error); 