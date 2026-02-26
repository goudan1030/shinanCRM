const crypto = require('crypto');

// 数据库中存储的密码哈希
const dbHashedPassword = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

// 测试常见密码
const commonPasswords = [
  '12345',
  '123456',
  '123456789',
  'password',
  'admin',
  'admin123',
  'test',
  'test123',
  '1234',
  '000000'
];

console.log('尝试找出数据库密码对应的明文...');
console.log('数据库密码哈希:', dbHashedPassword);
console.log('-------------------------------------');

// 测试密码匹配
commonPasswords.forEach(pwd => {
  const hashed = crypto
    .createHash('sha256')
    .update(pwd)
    .digest('hex')
    .toLowerCase();
    
  if (hashed === dbHashedPassword) {
    console.log(`✅ 找到匹配密码: '${pwd}'`);
  } else {
    console.log(`❌ '${pwd}' => ${hashed.substring(0, 10)}... (不匹配)`);
  }
});

// 如果上述常见密码都不匹配，提示用户
console.log('-------------------------------------');
console.log('如果没有找到匹配密码，请尝试使用123456登录');
console.log('或者修改数据库中的密码:');
console.log('');
console.log('UPDATE admin_users SET password = \'' + 
  crypto.createHash('sha256').update('123456').digest('hex') + 
  '\' WHERE email = \'10758029@qq.com\';'); 