/**
 * 统一数据库连接配置模块
 * 
 * 提供全局共享的MySQL连接池实例，实现以下功能:
 * 1. 统一的数据库配置和连接管理
 * 2. 连接池优化设置，避免资源浪费
 * 3. 用户认证相关的数据库操作
 * 4. 用户资料更新功能
 * 
 * @module database
 */

import mysql, { PoolOptions, Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import crypto from 'crypto';

/**
 * 数据库查询结果类型
 */
export type DBQueryResult = RowDataPacket[] | RowDataPacket[][] | ResultSetHeader;

/**
 * 数据库错误类型
 */
export type DBError = Error & {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
};

/**
 * 用户基本信息接口
 */
export interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

/**
 * 用户资料更新接口
 */
export interface UserProfileUpdate {
  name?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: any;
}

// 检查必要的环境变量，如果不存在则抛出错误
function validateEnvVars() {
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new Error(`严重错误: 缺少必要的数据库环境变量: ${missingEnvVars.join(', ')}`);
  }
}

// 创建连接池实例
let pool: Pool | null = null;

/**
 * 获取数据库连接池
 * 
 * 使用环境变量中的配置创建连接池，确保在首次调用时已正确设置环境变量
 * 
 * @returns 数据库连接池实例
 */
function getPool(): Pool {
  if (pool) {
    return pool;
  }
  
  // 验证环境变量，确保它们存在
  validateEnvVars();
  
  // 使用环境变量创建连接配置
  const dbConfig: PoolOptions = {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    
    // 连接池配置
    waitForConnections: true,
    connectionLimit: 25,
    queueLimit: 0,
    connectTimeout: 10000,
    namedPlaceholders: true
  };
  
  console.log('首次创建数据库连接池:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
  });

  pool = mysql.createPool(dbConfig);

  pool.on('connection', function(connection) {
    console.log('新的数据库连接已建立');
  });

  return pool;
}

/**
 * 检查数据库连接是否正常
 * 
 * 尝试从连接池获取一个连接并立即释放，用于验证数据库可访问性
 * 
 * @returns Promise<boolean> 连接是否成功
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    console.log('✓ 数据库连接测试成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ 数据库连接测试失败:', error);
    return false;
  }
}

/**
 * 密码加密函数
 * 
 * 使用SHA-256算法对密码进行单向加密
 * 
 * @param password 原始密码
 * @returns 加密后的密码哈希值（小写十六进制字符串）
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex')
    .toLowerCase();
}

/**
 * 用户认证函数
 * 
 * 验证用户邮箱和密码，返回用户信息或null
 * 
 * @param email 用户邮箱
 * @param password 用户密码（明文）
 * @returns 成功时返回用户信息，失败时返回null
 * @throws 数据库操作错误
 */
export async function authenticateUser(email: string, password: string): Promise<UserInfo | null> {
  try {
    console.log('=== 开始用户认证流程 ===');
    console.log('认证信息:', { email, passwordLength: password.length });

    // 首先测试数据库连接
    await checkDatabaseConnection();

    // 对密码进行加密处理
    console.log('开始密码加密处理...');
    const hashedPassword = hashPassword(password);
    console.log('✓ 密码加密完成:', { hashedPasswordLength: hashedPassword.length });

    // 查询用户
    console.log('执行数据库查询:', { email });
    const [rows] = await getPool().execute<RowDataPacket[]>(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    console.log('✓ 数据库查询完成:', { recordCount: rows.length });

    if (rows.length === 0) {
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
    
    const dbError = error as DBError;
    
    if (dbError.code === 'ER_NO_SUCH_TABLE') {
      console.error('✗ 数据表不存在: admin_users');
      throw new Error('系统错误：数据表不存在');
    } else if (dbError.code === 'ECONNREFUSED') {
      console.error('✗ 数据库连接被拒绝');
      throw new Error('系统错误：无法连接到数据库');
    } else {
      console.error('✗ 未知错误');
      throw new Error(`认证失败: ${dbError.message}`);
    }
  }
}

/**
 * 更新用户资料
 * 
 * @param userId 用户ID
 * @param data 更新的资料字段
 * @returns 更新结果
 */
export async function updateUserProfile(userId: number, data: UserProfileUpdate): Promise<ResultSetHeader> {
  const connection = await getPool().getConnection();
  try {
    // 过滤掉密码字段，确保安全
    const { password, ...updateData } = data;
    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE users SET ? WHERE id = ?',
      [updateData, userId]
    );
    return result;
  } finally {
    connection.release();
  }
}

/**
 * 更新用户密码
 * 
 * @param userId 用户ID
 * @param newPassword 新密码（明文）
 * @returns 更新结果
 */
export async function updateUserPassword(userId: number, newPassword: string): Promise<ResultSetHeader> {
  const hashedPassword = hashPassword(newPassword);
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE admin_users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );
  return result;
}

/**
 * 执行通用数据库查询
 * 
 * @param sql SQL语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function query<T extends DBQueryResult>(
  sql: string, 
  params?: any[]
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.query(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// 同时提供默认导出和命名导出，保持兼容性
export default getPool;
export { getPool }; 