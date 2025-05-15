const { exec } = require('child_process');
require('dotenv').config({ path: '.env.local' });

// 从环境变量获取SSH和数据库配置
const REMOTE_SERVER = process.env.DB_HOST || '8.149.244.105';
const SSH_USER = 'root'; // SSH用户名
const SSH_PORT = 22;
const DB_NAME = process.env.DB_NAME || 'h5_cloud_db';

// 脚本选项
const SHOW_TABLES = 'SHOW TABLES';
const PASSWORD_PROMPT = 'Enter password:';

// 检查是否提供了SSH密码
const sshPassword = process.argv[2];
if (!sshPassword) {
  console.error('请提供SSH密码作为命令行参数');
  console.log('用法: node check-direct-ssh.js <SSH密码>');
  process.exit(1);
}

console.log(`正在通过SSH连接到服务器 ${REMOTE_SERVER}...`);

// 构建SSH命令
const sshCommand = `sshpass -p "${sshPassword}" ssh -p ${SSH_PORT} ${SSH_USER}@${REMOTE_SERVER} "mysql -e 'SHOW DATABASES; USE ${DB_NAME}; SHOW TABLES; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"${DB_NAME}\";'"`;

console.log('执行SSH命令...');

// 执行SSH命令
exec(sshCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行出错: ${error.message}`);
    
    // 检查是否需要安装sshpass
    if (error.message.includes('sshpass: command not found')) {
      console.log('\n需要安装sshpass工具来自动输入SSH密码');
      console.log('在macOS上，您可以使用: brew install sshpass');
      console.log('或者尝试手动方式:');
      console.log(`ssh ${SSH_USER}@${REMOTE_SERVER} -p ${SSH_PORT} "mysql -e 'SHOW DATABASES; USE ${DB_NAME}; SHOW TABLES; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \\\"${DB_NAME}\\\";'"`);
    }
    
    return;
  }
  
  if (stderr) {
    console.error(`错误: ${stderr}`);
    return;
  }
  
  console.log('SSH连接成功! 数据库查询结果:');
  console.log('-'.repeat(50));
  console.log(stdout);
  console.log('-'.repeat(50));
  
  // 尝试计算表的数量
  const tableLines = stdout.split('\n').filter(line => 
    !line.includes('Database') && 
    !line.includes('Tables_in') && 
    !line.includes('COUNT') && 
    line.trim() !== '' &&
    !['information_schema', 'mysql', 'performance_schema', 'sys', DB_NAME].includes(line.trim())
  );
  
  // 获取表数量
  const tableCountMatch = stdout.match(/COUNT\(\*\)\s*\n\s*(\d+)/);
  if (tableCountMatch) {
    console.log(`\n数据库 ${DB_NAME} 中共有 ${tableCountMatch[1]} 个表`);
  } else {
    console.log(`\n数据库 ${DB_NAME} 中检测到 ${tableLines.length} 个表`);
  }
  
  console.log('\n建议:');
  console.log('1. 比较这个结果与PhpMyAdmin显示的表数量');
  console.log('2. 如果表数量相同，则确认SSH隧道配置和数据库连接配置正确');
  console.log('3. 如果表数量不同，可能是连接的数据库实例不同，或权限问题');
}); 