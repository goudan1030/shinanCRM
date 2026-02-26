const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// 验证用户
async function authenticateUser(email, password) {
  console.log('开始验证用户:', email);
  
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // 测试查询数据库
    console.log('查询用户信息...');
    const [rows] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      console.log('用户不存在:', email);
      return null;
    }
    
    const user = rows[0];
    console.log('找到用户:', {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordLength: user.password ? user.password.length : 0
    });
    
    // 加密输入的密码
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
      .toLowerCase();
    
    console.log('密码比较:');
    console.log('- 输入密码加密后:', hashedPassword);
    console.log('- 数据库中密码:', user.password.toLowerCase());
    console.log('- 密码匹配:', hashedPassword === user.password.toLowerCase());
    
    // 验证密码
    if (hashedPassword !== user.password.toLowerCase()) {
      console.log('密码不匹配');
      return null;
    }
    
    console.log('验证成功!');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  } finally {
    await connection.end();
  }
}

// 测试用户登录
async function testLogin() {
  // 在这里输入你尝试登录的邮箱和密码
  const email = '10758029@qq.com';  // 修改为你的登录邮箱
  const password = '123456';  // 修改为你的登录密码
  
  console.log('==== 开始测试登录 ====');
  console.log(`尝试登录: ${email}`);
  
  try {
    const user = await authenticateUser(email, password);
    if (user) {
      console.log('登录成功!', user);
    } else {
      console.log('登录失败: 无效的凭据');
    }
  } catch (error) {
    console.error('登录测试出错:', error);
  }
  
  console.log('==== 登录测试完成 ====');
}

// 运行测试
testLogin(); 