const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupDatabase() {
  console.log('==== 数据库配置与修复助手 ====');
  console.log('这个工具将帮助您配置数据库环境并修复会员删除功能');
  
  // 1. 配置环境变量
  console.log('\n第一步: 配置数据库连接信息');
  
  const dbConfig = {
    DB_HOST: await question('数据库主机 (默认: localhost): ', 'localhost'),
    DB_PORT: await question('数据库端口 (默认: 3306): ', '3306'),
    DB_USER: await question('数据库用户名 (默认: h5_cloud_user): ', 'h5_cloud_user'),
    DB_PASSWORD: await question('数据库密码: '),
    DB_NAME: await question('数据库名称 (默认: h5_cloud_db): ', 'h5_cloud_db'),
    DB_ROOT_PASSWORD: await question('数据库ROOT密码 (用于修复权限，可选): ')
  };
  
  // 保存到.env文件
  console.log('\n正在保存环境变量...');
  let envContent = '';
  for (const [key, value] of Object.entries(dbConfig)) {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  }
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ 环境变量已保存到.env文件');
  
  // 2. 确认是否要执行数据库修复
  console.log('\n第二步: 数据库修复');
  const shouldFix = await question('是否要立即执行数据库修复? (y/n): ');
  
  if (shouldFix.toLowerCase() === 'y') {
    try {
      console.log('\n正在执行数据库修复...');
      execSync('node scripts/fix-delete-member.js', { stdio: 'inherit' });
      console.log('✅ 数据库修复已完成');
    } catch (error) {
      console.error('❌ 数据库修复失败:', error.message);
    }
  }
  
  // 3. 提供执行其他诊断工具的选项
  console.log('\n第三步: 其他诊断工具');
  console.log('您可以通过以下命令执行更多诊断工具:');
  console.log('- npm run db:diagnose - 运行交互式诊断工具');
  console.log('- npm run db:check-connection - 检查数据库连接');
  console.log('- npm run db:compare-connections - 比较不同连接方式');
  console.log('- npm run db:check-instances - 检查MySQL实例');
  console.log('- npm run db:fix-permissions - 修复数据库权限');
  
  console.log('\n==== 配置完成 ====');
  console.log('如果您仍然遇到问题，请查看文档: docs/member-delete-fix.md');
  
  rl.close();
}

// 辅助函数：异步问题
function question(query, defaultValue = '') {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer || defaultValue);
    });
  });
}

setupDatabase().catch(error => {
  console.error('设置过程出错:', error);
  rl.close();
}); 