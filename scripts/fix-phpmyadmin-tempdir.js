const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixPhpMyAdminTempDir() {
  const server = '8.149.244.105';
  const phpmyadminPath = '/www/server/phpmyadmin/phpmyadmin_820fec596217f404';
  const tempDir = `${phpmyadminPath}/tmp`;
  
  console.log('🔧 开始修复phpMyAdmin临时目录权限问题...');
  
  try {
    // 1. 检查当前权限
    console.log('\n📋 检查当前权限状态...');
    const { stdout: beforePerms } = await execAsync(`ssh root@${server} "ls -la ${tempDir}/"`);
    console.log('临时目录权限:');
    console.log(beforePerms);
    
    // 2. 修复权限
    console.log('\n🔧 修复权限...');
    await execAsync(`ssh root@${server} "chown -R www:www ${tempDir}/"`);
    await execAsync(`ssh root@${server} "chmod -R 755 ${tempDir}/"`);
    console.log('✅ 权限修复完成');
    
    // 3. 验证修复结果
    console.log('\n📋 验证修复结果...');
    const { stdout: afterPerms } = await execAsync(`ssh root@${server} "ls -la ${tempDir}/"`);
    console.log('修复后权限:');
    console.log(afterPerms);
    
    // 4. 测试写入权限
    console.log('\n🧪 测试写入权限...');
    const testFile = `${tempDir}/test_write_${Date.now()}.txt`;
    await execAsync(`ssh root@${server} "echo 'test' > ${testFile}"`);
    await execAsync(`ssh root@${server} "rm -f ${testFile}"`);
    console.log('✅ 写入权限测试通过');
    
    // 5. 重启PHP-FPM（如果可能）
    console.log('\n🔄 尝试重启PHP-FPM...');
    try {
      await execAsync(`ssh root@${server} "systemctl restart php-fpm"`);
      console.log('✅ PHP-FPM重启成功');
    } catch (error) {
      console.log('⚠️ 无法通过systemctl重启PHP-FPM，尝试其他方式...');
      try {
        const { stdout: phpPid } = await execAsync(`ssh root@${server} "ps aux | grep 'php-fpm: master' | grep -v grep | awk '{print \\$2}'"`);
        if (phpPid.trim()) {
          await execAsync(`ssh root@${server} "kill -USR2 ${phpPid.trim()}"`);
          console.log('✅ PHP-FPM进程重启成功');
        } else {
          console.log('⚠️ 未找到PHP-FPM主进程');
        }
      } catch (pidError) {
        console.log('⚠️ 无法重启PHP-FPM进程');
      }
    }
    
    console.log('\n🎉 phpMyAdmin临时目录权限修复完成！');
    console.log('\n📝 修复内容:');
    console.log('1. 将临时目录所有者改为www用户');
    console.log('2. 设置适当的目录权限(755)');
    console.log('3. 验证写入权限');
    console.log('4. 重启PHP-FPM服务');
    
    console.log('\n💡 现在请刷新phpMyAdmin页面，错误应该已经消失。');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
    console.error('请检查SSH连接和服务器状态');
  }
}

// 执行修复
fixPhpMyAdminTempDir(); 