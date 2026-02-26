/**
 * 环境变量测试脚本
 */

require('dotenv').config({ path: '.env.local' });

console.log('环境变量加载情况:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD 长度:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('DB_NAME:', process.env.DB_NAME); 