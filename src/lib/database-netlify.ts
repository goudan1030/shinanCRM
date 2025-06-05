/**
 * Netlify专用数据库连接模块
 * 
 * 针对Netlify serverless函数环境优化的数据库连接配置
 * 与标准database.ts的区别：
 * 1. 更短的连接超时时间
 * 2. 更小的连接池大小
 * 3. 更适合serverless的配置
 */

import mysql, { PoolOptions, Pool, RowDataPacket, ResultSetHeader, QueryResult } from 'mysql2/promise';

/**
 * 检查并设置环境变量
 */
function initializeEnvVars() {
  // 为Netlify环境设置默认值
  const defaultEnvVars = {
    DB_HOST: '8.149.244.105',
    DB_PORT: '3306',
    DB_USER: 'h5_cloud_user',
    DB_PASSWORD: 'mc72TNcMmy6HCybH',
    DB_NAME: 'h5_cloud_db',
    JWT_SECRET: 'sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe'
  };

  // 设置缺失的环境变量
  Object.entries(defaultEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`设置默认环境变量: ${key}`);
    }
  });
}

// 初始化环境变量
initializeEnvVars();

/**
 * Netlify优化的数据库配置
 */
const netlifyDBConfig: PoolOptions = {
  // 基本连接信息
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Serverless优化配置
  waitForConnections: true,
  connectionLimit: 5,              // 较小的连接池，适合serverless
  queueLimit: 0,
  
  // 较短的超时时间
  connectTimeout: 5000,            // 5秒连接超时
  
  // 其他优化选项
  namedPlaceholders: true
};

/**
 * 创建Netlify优化的连接池
 */
let netlifyPool: Pool | null = null;

/**
 * 获取数据库连接池（延迟初始化）
 */
export function getNetlifyPool(): Pool {
  if (!netlifyPool) {
    console.log('初始化Netlify数据库连接池...');
    netlifyPool = mysql.createPool(netlifyDBConfig);
    
    // 添加错误处理
    netlifyPool.on('connection', (connection) => {
      console.log('新建数据库连接:', connection.threadId);
    });
  }
  
  return netlifyPool;
}

/**
 * 执行数据库查询（带重试机制）
 */
export async function executeQuery<T extends QueryResult = QueryResult>(
  sql: string, 
  params: any[] = []
): Promise<[T, mysql.FieldPacket[]]> {
  const pool = getNetlifyPool();
  let retries = 2;
  
  while (retries > 0) {
    try {
      console.log('执行SQL查询:', { sql: sql.substring(0, 100) + '...', paramsLength: params.length });
      const result = await pool.execute<T>(sql, params);
      console.log('✓ 查询执行成功');
      return result;
    } catch (error) {
      console.error(`查询失败 (剩余重试次数: ${retries - 1}):`, error);
      retries--;
      
      if (retries === 0) {
        throw error;
      }
      
      // 等待100ms后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error('查询重试失败');
}

/**
 * 测试数据库连接
 */
export async function testNetlifyConnection(): Promise<boolean> {
  try {
    const pool = getNetlifyPool();
    const connection = await pool.getConnection();
    console.log('✓ Netlify数据库连接测试成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Netlify数据库连接测试失败:', error);
    return false;
  }
}

// 导出默认连接池以保持兼容性
export default getNetlifyPool(); 