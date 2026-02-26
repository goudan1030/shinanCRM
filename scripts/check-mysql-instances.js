const { execSync } = require('child_process');
require('dotenv').config();

/**
 * 该脚本用于检查服务器上是否有多个MySQL实例运行
 * 同时检查SSH隧道和直接连接的差异
 */
async function checkMySQLInstances() {
  console.log('==== MySQL实例和连接检查工具 ====');
  
  try {
    // 检查系统中运行的MySQL进程
    console.log('\n检查系统中运行的MySQL进程...');
    try {
      const psOutput = execSync('ps aux | grep mysql | grep -v grep').toString();
      console.log('找到以下MySQL相关进程:');
      console.log(psOutput);
    } catch (error) {
      console.log('未找到运行中的MySQL进程，或无法执行ps命令');
    }
    
    // 检查监听的端口
    console.log('\n检查MySQL监听的端口...');
    try {
      const netstatOutput = execSync('netstat -tlnp 2>/dev/null | grep mysql').toString();
      console.log('MySQL正在监听以下端口:');
      console.log(netstatOutput || '未找到MySQL监听的端口');
    } catch (error) {
      console.log('未找到MySQL监听的端口，或无法执行netstat命令');
    }
    
    // 在Windows上使用不同的命令
    if (process.platform === 'win32') {
      try {
        console.log('\n在Windows上检查MySQL服务...');
        const serviceOutput = execSync('sc query mysql').toString();
        console.log(serviceOutput);
      } catch (error) {
        console.log('未找到MySQL服务，或无法执行sc命令');
      }
    }
    
    // 显示当前环境变量中的数据库设置
    console.log('\n当前环境变量中的数据库设置:');
    console.log('- DB_HOST:', process.env.DB_HOST);
    console.log('- DB_PORT:', process.env.DB_PORT);
    console.log('- DB_USER:', process.env.DB_USER);
    console.log('- DB_NAME:', process.env.DB_NAME);
    
    // 检查SSH隧道信息
    console.log('\n检查SSH隧道信息...');
    try {
      const tunnelProcesses = execSync('ps aux | grep ssh | grep -L | grep 3306 | grep -v grep').toString();
      if (tunnelProcesses) {
        console.log('找到以下SSH隧道:');
        console.log(tunnelProcesses);
      } else {
        console.log('未找到SSH隧道进程');
      }
    } catch (error) {
      console.log('未找到SSH隧道进程，或无法执行ps命令');
    }
    
    // 提供可能的解决方案
    console.log('\n==== 可能的问题和解决方案 ====');
    console.log('1. SSH隧道问题:');
    console.log('   - 检查SSH隧道是否正确建立并且保持活动状态');
    console.log('   - 确保本地端口3306未被其他应用占用');
    console.log('   - 尝试重新建立SSH隧道: ssh -L 3306:127.0.0.1:3306 user@remote_server');
    
    console.log('\n2. 多实例问题:');
    console.log('   - 如果服务器上有多个MySQL实例，确保连接到正确的实例');
    console.log('   - 检查MySQL配置文件中的data目录路径和端口设置');
    
    console.log('\n3. 权限问题:');
    console.log('   - 确保用户有正确的权限访问所有表');
    console.log('   - 以root用户连接并检查/修复权限: scripts/fix-user-permissions.js');
    
    console.log('\n4. phpMyAdmin连接问题:');
    console.log('   - 检查phpMyAdmin使用的配置是否指向正确的数据库实例');
    console.log('   - 尝试在phpMyAdmin中使用与应用相同的连接参数');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('详细错误信息:', error);
  }
}

checkMySQLInstances().catch(console.error); 