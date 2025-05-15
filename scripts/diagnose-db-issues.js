const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

/**
 * 数据库问题诊断主程序
 * 提供用户友好的界面来运行各种诊断工具
 */
async function main() {
  console.log('==================================================');
  console.log('======= 数据库问题全面诊断工具 v1.0 =============');
  console.log('==================================================');
  console.log('本工具将帮助您诊断和解决数据库连接和表访问问题');
  console.log('');
  
  // 检查环境变量
  checkEnvironmentVariables();
  
  // 创建命令行交互界面
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  try {
    while (true) {
      console.log('\n请选择要执行的操作:');
      console.log('1. 检查数据库连接配置');
      console.log('2. 比较SSH隧道和直接连接的差异');
      console.log('3. 检查MySQL实例和进程');
      console.log('4. 修复数据库用户权限');
      console.log('5. 执行完整诊断流程');
      console.log('6. 更新环境变量');
      console.log('0. 退出');
      
      const choice = await question('请输入选项编号: ');
      
      switch (choice.trim()) {
        case '1':
          await runScript('check-db-connection.js');
          break;
        case '2':
          await runScript('compare-connections.js');
          break;
        case '3':
          await runScript('check-mysql-instances.js');
          break;
        case '4':
          if (process.env.DB_ROOT_PASSWORD) {
            await runScript('fix-user-permissions.js');
          } else {
            console.log('\n⚠️ 需要设置 DB_ROOT_PASSWORD 环境变量才能修复权限');
            const rootPass = await question('请输入MySQL root密码: ');
            if (rootPass) {
              process.env.DB_ROOT_PASSWORD = rootPass;
              await runScript('fix-user-permissions.js');
            }
          }
          break;
        case '5':
          console.log('\n=== 开始执行完整诊断流程 ===');
          await runScript('check-db-connection.js');
          await runScript('check-mysql-instances.js');
          await runScript('compare-connections.js');
          
          const fixPermissions = await question('\n是否要修复用户权限? (y/n): ');
          if (fixPermissions.toLowerCase() === 'y') {
            if (!process.env.DB_ROOT_PASSWORD) {
              const rootPass = await question('请输入MySQL root密码: ');
              if (rootPass) {
                process.env.DB_ROOT_PASSWORD = rootPass;
              }
            }
            await runScript('fix-user-permissions.js');
          }
          console.log('\n=== 完整诊断流程结束 ===');
          break;
        case '6':
          await updateEnvironmentVariables(rl);
          break;
        case '0':
          console.log('谢谢使用，再见!');
          rl.close();
          return;
        default:
          console.log('无效选项，请重试!');
      }
    }
  } catch (error) {
    console.error('程序执行错误:', error);
  } finally {
    rl.close();
  }
}

/**
 * 检查环境变量是否已设置
 */
function checkEnvironmentVariables() {
  console.log('当前环境变量设置:');
  
  const variables = [
    { name: 'DB_HOST', value: process.env.DB_HOST, defaultValue: 'localhost' },
    { name: 'DB_PORT', value: process.env.DB_PORT, defaultValue: '3306' },
    { name: 'DB_USER', value: process.env.DB_USER, defaultValue: 'h5_cloud_user' },
    { name: 'DB_PASSWORD', value: process.env.DB_PASSWORD ? '已设置 (已隐藏)' : '未设置', required: true },
    { name: 'DB_NAME', value: process.env.DB_NAME, defaultValue: 'h5_cloud_db' },
    { name: 'DB_ROOT_PASSWORD', value: process.env.DB_ROOT_PASSWORD ? '已设置 (已隐藏)' : '未设置' },
    { name: 'REMOTE_DB_HOST', value: process.env.REMOTE_DB_HOST || '未设置' }
  ];
  
  let missingRequired = false;
  
  variables.forEach(variable => {
    console.log(`- ${variable.name}: ${variable.value || '未设置'}`);
    if (variable.required && !process.env[variable.name]) {
      console.log(`  ⚠️ 警告: ${variable.name} 是必需的环境变量!`);
      missingRequired = true;
    } else if (!process.env[variable.name] && variable.defaultValue) {
      console.log(`  ℹ️ 信息: 将使用默认值 '${variable.defaultValue}'`);
    }
  });
  
  if (missingRequired) {
    console.log('\n⚠️ 警告: 有必需的环境变量未设置，某些功能可能无法正常工作');
  }
}

/**
 * 更新环境变量
 */
async function updateEnvironmentVariables(rl) {
  console.log('\n=== 更新环境变量 ===');
  
  const variables = [
    { name: 'DB_HOST', current: process.env.DB_HOST || 'localhost', description: 'SSH隧道本地主机名' },
    { name: 'DB_PORT', current: process.env.DB_PORT || '3306', description: 'SSH隧道本地端口' },
    { name: 'DB_USER', current: process.env.DB_USER || 'h5_cloud_user', description: '数据库用户名' },
    { name: 'DB_PASSWORD', current: process.env.DB_PASSWORD ? '已设置 (已隐藏)' : '未设置', description: '数据库密码' },
    { name: 'DB_NAME', current: process.env.DB_NAME || 'h5_cloud_db', description: '数据库名称' },
    { name: 'DB_ROOT_PASSWORD', current: process.env.DB_ROOT_PASSWORD ? '已设置 (已隐藏)' : '未设置', description: 'MySQL root密码' },
    { name: 'REMOTE_DB_HOST', current: process.env.REMOTE_DB_HOST || process.env.DB_HOST || '未设置', description: '远程服务器地址' }
  ];
  
  const updates = {};
  
  for (const variable of variables) {
    const newValue = await rl.question(`${variable.name} [${variable.description}] (当前值: ${variable.current}): `);
    if (newValue.trim()) {
      process.env[variable.name] = newValue;
      updates[variable.name] = newValue;
    }
  }
  
  // 更新.env文件
  if (Object.keys(updates).length > 0) {
    const saveToFile = await rl.question('是否要将这些更改保存到.env文件? (y/n): ');
    if (saveToFile.toLowerCase() === 'y') {
      try {
        let envContent = '';
        
        // 尝试读取现有的.env文件
        try {
          envContent = fs.readFileSync('.env', 'utf8');
        } catch (err) {
          // 文件不存在，创建新文件
        }
        
        // 更新环境变量
        for (const [key, value] of Object.entries(updates)) {
          // 如果变量已存在，替换它
          if (envContent.includes(`${key}=`)) {
            const regex = new RegExp(`${key}=.*`, 'g');
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            // 否则添加新变量
            envContent += `\n${key}=${value}`;
          }
        }
        
        // 保存到文件
        fs.writeFileSync('.env', envContent.trim());
        console.log('✅ 环境变量已保存到.env文件');
      } catch (err) {
        console.error('❌ 保存环境变量时出错:', err.message);
      }
    }
  }
}

/**
 * 运行指定的脚本文件
 */
async function runScript(scriptName) {
  console.log(`\n=== 运行 ${scriptName} ===`);
  try {
    execSync(`node scripts/${scriptName}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ 运行 ${scriptName} 时出错:`, error.message);
  }
}

// 运行主程序
main().catch(console.error); 