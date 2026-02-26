const fs = require('fs');
const path = require('path');

// 定义新的环境变量内容
const newEnvContent = `# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# Supabase配置（模拟值，仅用于开发环境）
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-key-for-local-development

# JWT配置（安全随机字符串）
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://121.41.65.220:8888/
`;

// 环境变量文件路径
const envFilePath = path.join(process.cwd(), '.env.local');

try {
  // 写入新的环境变量
  fs.writeFileSync(envFilePath, newEnvContent, 'utf8');
  console.log('环境变量已成功更新！');
  
  // 显示更新后的内容
  console.log('\n更新后的.env.local内容:');
  console.log('-'.repeat(40));
  console.log(newEnvContent);
  console.log('-'.repeat(40));
} catch (error) {
  console.error('更新环境变量失败:', error);
} 