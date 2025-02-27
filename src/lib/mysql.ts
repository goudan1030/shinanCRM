import mysql from 'mysql2/promise';

// MySQL连接配置
const pool = mysql.createPool({
  // 初始化连接池配置
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sncrm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 默认导出连接池
export default pool;

// 同时保留命名导出以保持兼容性
export { pool };

// 创建新的数据库连接
export function createClient() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sncrm'
  });
}

// 用户认证相关查询
export async function authenticateUser(email: string, password: string) {
  try {
    console.log('=== 开始用户认证流程 ===');
    console.log('认证信息:', { email, passwordLength: password.length });

    // 首先测试数据库连接
    await pool.getConnection().then(conn => {
      console.log('✓ 数据库连接测试成功');
      conn.release();
    });

    // 对密码进行加密处理
    const crypto = require('crypto');
    console.log('开始密码加密处理...');
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
      .toLowerCase();
    console.log('✓ 密码加密完成:', { hashedPasswordLength: hashedPassword.length });

    // 查询用户
    console.log('执行数据库查询:', { email });
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    console.log('✓ 数据库查询完成:', { recordCount: rows.length });

    if (!rows[0]) {
      console.log('✗ 用户不存在:', { email });
      return null;
    }

    const user = rows[0];
    const dbPassword = user.password.toLowerCase();
    console.log('数据库密码信息:', { 
      dbPasswordLength: dbPassword.length,
      hashedPasswordLength: hashedPassword.length,
      passwordsMatch: dbPassword === hashedPassword
    });
    
    // 验证密码
    if (dbPassword !== hashedPassword) {
      console.log('✗ 密码验证失败:', {
        hashedPasswordLength: hashedPassword.length,
        dbPasswordLength: dbPassword.length,
        passwordsMatch: false
      });
      return null;
    }

    console.log('✓ 用户验证成功:', { 
      userId: user.id, 
      email: user.email, 
      name: user.name 
    });
    console.log('=== 认证流程完成 ===');
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url
    };
  } catch (error) {
    console.error('=== 认证过程发生错误 ===');
    console.error('错误详情:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('✗ 数据表不存在: admin_users');
      throw new Error('系统错误：数据表不存在');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('✗ 数据库连接被拒绝');
      throw new Error('系统错误：无法连接到数据库');
    } else {
      console.error('✗ 未知错误');
      throw new Error(`认证失败: ${error.message}`);
    }
  }
}

// 更新用户信息
export async function updateUserProfile(userId: number, data: any) {
  try {
    const [result] = await pool.execute(
      'UPDATE users SET ? WHERE id = ?',
      [data, userId]
    );
    return result;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    throw new Error('更新失败');
  }
}

// 更新用户密码
export async function updateUserPassword(userId: number, newPassword: string) {
  try {
    const hashedPassword = require('crypto')
      .createHash('sha256')
      .update(newPassword)
      .digest('hex')
      .toLowerCase();

    const [result] = await pool.execute(
      'UPDATE admin_users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return result;
  } catch (error) {
    console.error('更新密码失败:', error);
    throw new Error('更新失败');
  }
}