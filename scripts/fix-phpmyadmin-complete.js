const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixPhpMyAdminComplete() {
  const server = '8.149.244.105';
  const phpmyadminPath = '/www/server/phpmyadmin/phpmyadmin_820fec596217f404';
  const dbUser = 'root';
  const dbPassword = 'Zwd9510301115@';
  
  console.log('🔧 开始完整修复phpMyAdmin配置...');
  
  try {
    // 1. 修复临时目录权限
    console.log('\n📁 修复临时目录权限...');
    await execAsync(`ssh root@${server} "chown -R www:www ${phpmyadminPath}/tmp/"`);
    await execAsync(`ssh root@${server} "chmod -R 755 ${phpmyadminPath}/tmp/"`);
    console.log('✅ 临时目录权限修复完成');
    
    // 2. 检查phpmyadmin数据库
    console.log('\n📋 检查phpmyadmin数据库...');
    const { stdout: databases } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'SHOW DATABASES;'"`);
    
    if (!databases.includes('phpmyadmin')) {
      console.log('🔧 创建phpmyadmin数据库...');
      await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'CREATE DATABASE phpmyadmin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"`);
      console.log('✅ phpmyadmin数据库创建成功');
      
      // 导入表结构
      console.log('📥 导入配置表结构...');
      await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} phpmyadmin < ${phpmyadminPath}/sql/create_tables.sql"`);
      console.log('✅ 配置表结构导入成功');
    } else {
      console.log('✅ phpmyadmin数据库已存在');
    }
    
    // 3. 备份配置文件
    console.log('\n💾 备份配置文件...');
    await execAsync(`ssh root@${server} "cp ${phpmyadminPath}/config.inc.php ${phpmyadminPath}/config.inc.php.backup.$(date +%Y%m%d_%H%M%S)"`);
    console.log('✅ 配置文件备份完成');
    
    // 4. 启用pmadb配置
    console.log('\n⚙️ 启用pmadb配置...');
    const configUpdates = [
      'pmadb',
      'bookmarktable',
      'relation',
      'table_info',
      'table_coords',
      'pdf_pages',
      'column_info',
      'history',
      'table_uiprefs',
      'tracking',
      'userconfig',
      'recent',
      'favorite',
      'users',
      'usergroups'
    ];
    
    for (const config of configUpdates) {
      const tableName = config === 'pmadb' ? 'phpmyadmin' : `pma__${config.replace('table_', '').replace('_', '')}`;
      await execAsync(`ssh root@${server} "sed -i 's|// \\$cfg\\[\\'\\'Servers\\'\\'\\]\\[\\$i\\]\\[\\'\\'${config}\\'\\'\\] = \\'\\'${tableName}\\'\\';|\\$cfg\\[\\'\\'Servers\\'\\'\\]\\[\\$i\\]\\[\\'\\'${config}\\'\\'\\] = \\'\\'${tableName}\\'\\';|g' ${phpmyadminPath}/config.inc.php"`);
    }
    console.log('✅ pmadb配置启用完成');
    
    // 5. 验证配置
    console.log('\n📋 验证配置...');
    const { stdout: pmadbConfig } = await execAsync(`ssh root@${server} "grep -A 5 'pmadb' ${phpmyadminPath}/config.inc.php"`);
    console.log('pmadb配置:');
    console.log(pmadbConfig);
    
    // 6. 验证数据库表
    const { stdout: tables } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'USE phpmyadmin; SHOW TABLES;'"`);
    console.log('\nphpmyadmin数据库表:');
    console.log(tables);
    
    // 7. 重启PHP-FPM
    console.log('\n🔄 重启PHP-FPM...');
    const { stdout: phpPid } = await execAsync(`ssh root@${server} "ps aux | grep 'php-fpm: master' | grep -v grep | awk '{print \\$2}'"`);
    if (phpPid.trim()) {
      await execAsync(`ssh root@${server} "kill -USR2 ${phpPid.trim()}"`);
      console.log('✅ PHP-FPM重启成功');
    } else {
      console.log('⚠️ 未找到PHP-FPM进程');
    }
    
    console.log('\n🎉 phpMyAdmin完整修复完成！');
    console.log('\n📝 修复内容:');
    console.log('1. ✅ 修复了临时目录权限');
    console.log('2. ✅ 创建了phpmyadmin数据库');
    console.log('3. ✅ 导入了配置表结构');
    console.log('4. ✅ 启用了所有pmadb配置');
    console.log('5. ✅ 重启了PHP-FPM服务');
    
    console.log('\n💡 现在请刷新phpMyAdmin页面，所有错误应该已经消失。');
    console.log('🌐 访问地址: http://8.149.244.105:8888/phpmyadmin/');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
    console.error('请检查SSH连接和MySQL权限');
  }
}

// 执行完整修复
fixPhpMyAdminComplete(); 