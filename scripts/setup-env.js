/**
 * 环境变量设置脚本
 * 
 * 此脚本检查.env.local文件是否存在，如不存在则创建它
 */

const fs = require('fs');
const path = require('path');

const envFilePath = path.join(process.cwd(), '.env.local');
const envTemplateFilePath = path.join(process.cwd(), 'env.template');

function setupEnv() {
  console.log('检查环境变量文件...');
  
  // 检查.env.local是否存在
  if (fs.existsSync(envFilePath)) {
    console.log('.env.local文件已存在，无需创建');
    return;
  }
  
  // 检查模板文件是否存在
  if (!fs.existsSync(envTemplateFilePath)) {
    console.error('错误: env.template文件不存在，无法创建.env.local');
    console.log('请手动创建.env.local文件，包含以下内容:');
    console.log(`
# 数据库配置
DB_HOST=121.41.65.220
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# Supabase配置（如果需要，请提供实际值）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT配置（生成的安全随机字符串）
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://121.41.65.220:8888/
    `);
    return;
  }
  
  // 从模板创建.env.local
  try {
    const envTemplate = fs.readFileSync(envTemplateFilePath, 'utf8');
    fs.writeFileSync(envFilePath, envTemplate);
    console.log('.env.local文件已从模板创建成功');
  } catch (error) {
    console.error('创建.env.local文件时出错:', error);
    console.log('请手动创建.env.local文件，复制env.template的内容');
  }
}

// 执行设置
setupEnv(); 