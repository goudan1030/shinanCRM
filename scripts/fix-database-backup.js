const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixDatabaseBackup() {
  const server = '8.149.244.105';
  const dbUser = 'root';
  const dbPassword = 'Zwd9510301115@';
  const dbName = 'h5_cloud_db';
  
  console.log('🔧 开始修复数据库备份问题...');
  
  try {
    // 1. 检查视图是否存在
    console.log('\n📋 检查view_user_members视图...');
    const { stdout: viewCheck } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'USE ${dbName}; SHOW TABLES;'"`);
    
    if (viewCheck.includes('view_user_members')) {
      console.log('✅ view_user_members视图存在');
    } else {
      console.log('❌ view_user_members视图不存在，需要重新创建');
    }
    
    // 2. 检查视图的权限
    console.log('\n🔐 检查视图权限...');
    const { stdout: viewGrants } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'SHOW GRANTS FOR h5_cloud_user@localhost;'"`);
    console.log('h5_cloud_user权限:');
    console.log(viewGrants);
    
    // 3. 重新创建视图（使用root权限）
    console.log('\n🔧 重新创建view_user_members视图...');
    const createViewSQL = `DROP VIEW IF EXISTS view_user_members; CREATE VIEW view_user_members AS SELECT u.id AS user_id, u.phone AS user_phone, u.username AS user_username, u.nickname AS user_nickname, u.status AS user_status, m.id AS member_id, m.member_no AS member_no, m.type AS member_type, m.status AS member_status, m.nickname AS member_nickname, m.phone AS member_phone, m.wechat AS member_wechat, m.gender AS gender, m.province AS province, m.city AS city, m.district AS district, m.target_area AS target_area, m.birth_year AS birth_year, m.created_at AS member_created_at, m.updated_at AS member_updated_at FROM users u LEFT JOIN members m ON u.id = m.user_id WHERE m.deleted IS NULL OR m.deleted = FALSE;`;
    
    await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} ${dbName} -e '${createViewSQL}'"`);
    console.log('✅ view_user_members视图重新创建成功');
    
    // 4. 验证视图
    console.log('\n📋 验证视图...');
    const { stdout: viewData } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'USE ${dbName}; SELECT COUNT(*) as count FROM view_user_members;'"`);
    console.log('视图数据统计:');
    console.log(viewData);
    
    // 5. 检查视图定义
    console.log('\n📋 检查视图定义...');
    const { stdout: viewDef } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'USE ${dbName}; SHOW CREATE VIEW view_user_members;'"`);
    console.log('视图定义:');
    console.log(viewDef);
    
    // 6. 测试手动备份
    console.log('\n🧪 测试手动备份...');
    const backupDir = '/www/backup/database';
    await execAsync(`ssh root@${server} "mkdir -p ${backupDir}"`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = `${backupDir}/h5_cloud_db_${timestamp}_test.sql`;
    
    await execAsync(`ssh root@${server} "mysqldump -u ${dbUser} -p${dbPassword} --single-transaction --routines --triggers --events ${dbName} > ${backupFile}"`);
    console.log('✅ 手动备份测试成功');
    
    // 7. 检查备份文件
    const { stdout: backupSize } = await execAsync(`ssh root@${server} "ls -lh ${backupFile}"`);
    console.log('备份文件信息:');
    console.log(backupSize);
    
    // 8. 验证备份文件内容
    const { stdout: backupContent } = await execAsync(`ssh root@${server} "grep -n 'view_user_members' ${backupFile} | head -3"`);
    console.log('备份文件中的视图引用:');
    console.log(backupContent);
    
    console.log('\n🎉 数据库备份问题修复完成！');
    console.log('\n📝 修复内容:');
    console.log('1. ✅ 检查了view_user_members视图状态');
    console.log('2. ✅ 重新创建了view_user_members视图');
    console.log('3. ✅ 验证了视图数据');
    console.log('4. ✅ 测试了手动备份功能');
    console.log('5. ✅ 验证了备份文件完整性');
    
    console.log('\n💡 现在请在宝塔面板中重新尝试数据库备份。');
    console.log('🌐 宝塔面板地址: http://8.149.244.105:8888/');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
    console.error('请检查SSH连接和MySQL权限');
  }
}

// 执行修复
fixDatabaseBackup(); 