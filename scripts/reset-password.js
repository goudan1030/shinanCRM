const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// MD5密码加密函数
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

async function resetPassword() {
  console.log('=== 开始重置密码 ===');
  
  const email = '10758029@qq.com';
  const newPassword = '123456a';
  const hashedPassword = hashPassword(newPassword);
  
  console.log('重置信息:', {
    email,
    newPassword,
    hashedPassword,
    hashedPasswordLength: hashedPassword.length
  });
  
  let connection = null;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '121.41.65.220',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'h5_cloud_user',
      password: process.env.DB_PASSWORD || 'mc72TNcMmy6HCybH',
      database: process.env.DB_NAME || 'h5_cloud_db',
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✓ 数据库连接成功');
    
    // 检查用户是否存在
    const [users] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      console.log('✗ 用户不存在:', email);
      console.log('正在创建新用户...');
      
      // 创建新用户
      await connection.execute(
        'INSERT INTO admin_users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, '管理员', 'admin']
      );
      
      console.log('✓ 新用户创建成功');
    } else {
      console.log('✓ 找到用户:', {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        role: users[0].role
      });
      
      // 更新密码
      await connection.execute(
        'UPDATE admin_users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );
      
      console.log('✓ 密码更新成功');
    }
    
    // 验证更新结果
    const [updatedUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    
    if (updatedUsers.length > 0) {
      const user = updatedUsers[0];
      console.log('✓ 验证成功:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordLength: user.password.length,
        passwordMatch: user.password.toLowerCase() === hashedPassword
      });
    }
    
    console.log('=== 密码重置完成 ===');
    console.log('新密码:', newPassword);
    console.log('请使用新密码登录系统');
    
  } catch (error) {
    console.error('✗ 密码重置失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行密码重置
resetPassword()
  .then(() => {
    console.log('密码重置脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('密码重置脚本执行失败:', error);
    process.exit(1);
  });
