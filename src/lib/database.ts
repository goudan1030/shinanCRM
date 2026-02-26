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
import bcrypt from 'bcryptjs';

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

// 严格检查必要的环境变量，禁止任何明文回退值
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `缺少必要的数据库环境变量: ${missingEnvVars.join(', ')}。` +
    '请在 .env.local（或部署环境变量）中完成配置后再启动应用。'
  );
}

/**
 * 数据库连接配置
 * 包含完整的连接池设置和优化参数
 */
const dbConfig: PoolOptions = {
  // 基本连接信息
  host: process.env.DB_HOST as string,
  port: parseInt(process.env.DB_PORT as string, 10),
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  
  // 连接池配置
  waitForConnections: true,        // 连接不够时等待，而不是立即失败
  connectionLimit: 25,             // 连接池大小 - 基于系统负载调整
  queueLimit: 0,                   // 队列限制（0=无限制）
  
  // 性能优化设置
  connectTimeout: 10000,           // 连接超时10秒
  
  // 查询选项
  namedPlaceholders: true          // 支持命名参数，提高安全性和可读性
};

// 打印数据库配置信息（不包含敏感信息）
console.log('数据库配置信息:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  connectionLimit: dbConfig.connectionLimit
});

/**
 * 创建单例连接池
 * 整个应用共享同一个连接池实例，避免资源浪费
 */
const pool: Pool = mysql.createPool(dbConfig);

// 为保持向后兼容，可以在这里添加连接事件监听器
pool.on('connection', function() {
  console.log('新的数据库连接已建立');
});

/**
 * 检查数据库连接是否正常
 * 
 * 尝试从连接池获取一个连接并立即释放，用于验证数据库可访问性
 * 
 * @returns Promise<boolean> 连接是否成功
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✓ 数据库连接测试成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ 数据库连接测试失败:', error);
    return false;
  }
}

/**
 * 创建新的数据库连接（通常不需要，应优先使用连接池）
 * 
 * @returns mysql连接实例
 */
export function createClient() {
  return mysql.createConnection(dbConfig);
}

const BCRYPT_SALT_ROUNDS = (() => {
  const parsed = Number(process.env.BCRYPT_SALT_ROUNDS || '12');
  if (Number.isNaN(parsed) || parsed < 8 || parsed > 15) {
    return 12;
  }
  return parsed;
})();

function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

function hashPasswordLegacyMd5(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

function hashPasswordLegacySha256(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex').toLowerCase();
}

async function hashPasswordSecure(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * 兼容旧哈希（MD5/SHA256）并自动升级到bcrypt
 */
async function verifyPasswordAndUpgradeIfNeeded(
  plainPassword: string,
  storedHash: string,
  userId: number
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }

  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(plainPassword, storedHash);
  }

  const normalizedStoredHash = storedHash.toLowerCase();
  const matchedLegacy =
    normalizedStoredHash === hashPasswordLegacyMd5(plainPassword) ||
    normalizedStoredHash === hashPasswordLegacySha256(plainPassword);

  if (!matchedLegacy) {
    return false;
  }

  try {
    const upgradedHash = await hashPasswordSecure(plainPassword);
    await pool.execute('UPDATE admin_users SET password = ? WHERE id = ?', [upgradedHash, userId]);
  } catch (upgradeError) {
    console.error('密码自动升级为bcrypt失败:', upgradeError);
  }

  return true;
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

    // 查询用户
    console.log('执行数据库查询:', { email });
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    console.log('✓ 数据库查询完成:', { recordCount: rows.length });

    if (rows.length === 0) {
      console.log('✗ 用户不存在:', { email });
      return null;
    }

    const user = rows[0] as RowDataPacket & { password?: string };
    const storedPasswordHash = typeof user.password === 'string' ? user.password : '';
    const passwordValid = await verifyPasswordAndUpgradeIfNeeded(
      password,
      storedPasswordHash,
      Number(user.id)
    );

    // 验证密码
    if (!passwordValid) {
      console.log('✗ 密码验证失败:', {
        storedHashLength: storedPasswordHash.length
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
 * @param data 要更新的用户资料字段
 * @returns 更新结果
 * @throws 数据库操作错误
 */
export async function updateUserProfile(userId: number, data: UserProfileUpdate): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET ? WHERE id = ?',
      [data, userId]
    );
    return result;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    throw new Error('更新失败');
  }
}

/**
 * 更新用户密码
 * 
 * @param userId 用户ID
 * @param newPassword 新密码（明文，会自动加密）
 * @returns 更新结果
 * @throws 数据库操作错误
 */
export async function updateUserPassword(userId: number, newPassword: string): Promise<ResultSetHeader> {
  try {
    const hashedPassword = await hashPasswordSecure(newPassword);

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE admin_users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return result;
  } catch (error) {
    console.error('更新密码失败:', error);
    throw new Error('更新失败');
  }
}

/**
 * 执行通用查询的辅助函数
 * 
 * @param sql SQL查询语句
 * @param params 查询参数
 * @returns 查询结果
 * @throws 数据库操作错误
 */
export async function query<T extends DBQueryResult>(
  sql: string, 
  params?: any[]
): Promise<T> {
  try {
    const [results] = await pool.execute<T>(sql, params || []);
    return results;
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw new Error(`查询失败: ${(error as Error).message}`);
  }
}

// 默认导出连接池
export default pool;

// 同时保留命名导出以保持兼容性
export { pool }; 