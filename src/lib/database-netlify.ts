/**
 * Netlify专用数据库连接模块
 * 
 * 针对Netlify serverless函数环境优化的数据库连接配置
 * 与标准database.ts的区别：
 * 1. 更短的连接超时时间
 * 2. 更小的连接池大小
 * 3. 更适合serverless的配置
 * 4. 支持远程访问的额外安全设置
 * 5. 增强的网络诊断和连接重试
 */

import mysql, { PoolOptions, Pool, RowDataPacket, ResultSetHeader, QueryResult } from 'mysql2/promise';
import dns from 'dns';
import { promisify } from 'util';

/**
 * 错误类型定义
 */
export type DBError = Error & {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
};

/**
 * 进行DNS解析测试
 */
async function testDnsResolution(hostname: string): Promise<boolean> {
  try {
    const lookup = promisify(dns.lookup);
    const result = await lookup(hostname);
    console.log(`✓ DNS解析成功: ${hostname} -> ${result.address}`);
    return true;
  } catch (error) {
    console.error(`✗ DNS解析失败: ${hostname}`, error);
    return false;
  }
}

// 决定使用哪个用户凭证
const useDiagUser = !!process.env.DIAG_DB_USER && !!process.env.DIAG_DB_PASSWORD;
const dbUser = useDiagUser ? process.env.DIAG_DB_USER : process.env.DB_USER;
const dbPassword = useDiagUser ? process.env.DIAG_DB_PASSWORD : process.env.DB_PASSWORD;

/**
 * 测试TCP连接
 */
async function testTcpConnection(host: string, port: number): Promise<boolean> {
  try {
    // 使用无连接池的直接连接测试TCP连接
    const connection = await mysql.createConnection({
      host,
      port,
      user: dbUser,
      password: dbPassword,
      connectTimeout: 3000, // 快速超时
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await connection.end();
    console.log(`✓ TCP连接成功: ${host}:${port}`);
    return true;
  } catch (error) {
    console.error(`✗ TCP连接失败: ${host}:${port}`, error);
    return false;
  }
}

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
  
  // 打印当前使用的环境变量（隐藏密码）
  console.log('当前数据库配置:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: dbUser,
    database: process.env.DB_NAME,
    hasPassword: !!dbPassword,
    usingDiagUser: useDiagUser
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
  user: dbUser,
  password: dbPassword,
  database: process.env.DB_NAME,
  
  // Serverless优化配置
  waitForConnections: true,
  connectionLimit: 5,              // 较小的连接池，适合serverless
  queueLimit: 0,
  
  // 较短的超时时间
  connectTimeout: 10000,           // 增加到10秒以适应较慢的网络
  
  // 其他优化选项
  namedPlaceholders: true,
  
  // 远程访问安全设置
  ssl: {
    // 禁用严格SSL验证以解决可能的证书问题
    rejectUnauthorized: false 
  },
  
  // 连接保持活动设置
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000     // 10秒钟心跳检测
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
    console.log('数据库连接信息:', {
      host: netlifyDBConfig.host,
      port: netlifyDBConfig.port,
      user: netlifyDBConfig.user,
      database: netlifyDBConfig.database
    });
    
    netlifyPool = mysql.createPool(netlifyDBConfig);
    
    // 事件处理 - 由于TypeScript类型限制，使用更直接的方式
    const pool = netlifyPool as any;
    if (pool.on) {
      // 监听连接建立
      pool.on('connection', function(connection: any) {
        console.log('新建数据库连接:', connection.threadId);
      });
      
      // 监听错误
      pool.on('error', function(err: any) {
        console.error('池级别数据库错误:', err);
        
        // 如果是连接错误，清除池实例以便下次重新创建
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
            err.code === 'ECONNREFUSED' || 
            err.code === 'ER_ACCESS_DENIED_ERROR') {
          console.log('连接失败，清除连接池实例');
          netlifyPool = null;
        }
      });
    }
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
  let pool = getNetlifyPool();
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log('执行SQL查询:', { sql: sql.substring(0, 100) + '...', paramsLength: params.length });
      
      // 获取连接前再次测试连接池
      await testNetlifyConnection();
      
      const result = await pool.execute<T>(sql, params);
      console.log('✓ 查询执行成功');
      return result;
    } catch (error) {
      const dbError = error as DBError;
      console.error(`查询失败 (剩余重试次数: ${retries - 1}):`, dbError);
      
      // 记录详细的错误信息
      if (dbError.code) {
        console.error('错误代码:', dbError.code);
        console.error('SQL状态:', dbError.sqlState);
        console.error('SQL消息:', dbError.sqlMessage);
        
        // 如果是访问拒绝错误，打印更多诊断信息
        if (dbError.code === 'ER_ACCESS_DENIED_ERROR') {
          console.error('访问被拒绝。请检查数据库用户权限设置，确保该用户可以从当前主机访问。');
          console.error('当前连接信息:', {
            host: netlifyDBConfig.host,
            user: netlifyDBConfig.user,
            database: netlifyDBConfig.database
          });
        }
      }
      
      retries--;
      
      // 如果是连接相关错误，重置连接池
      if (dbError.code === 'PROTOCOL_CONNECTION_LOST' || 
          dbError.code === 'ECONNREFUSED' || 
          dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        netlifyPool = null;
        pool = getNetlifyPool();
      }
      
      if (retries === 0) {
        throw error;
      }
      
      // 重试前等待时间递增
      const waitTime = (3 - retries) * 300;
      console.log(`等待 ${waitTime}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('查询重试失败');
}

/**
 * 测试数据库连接
 */
export async function testNetlifyConnection(): Promise<boolean> {
  try {
    console.log('开始测试Netlify数据库连接...');
    
    // 首先测试DNS解析
    const host = process.env.DB_HOST || '8.149.244.105';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    
    console.log(`测试DNS解析: ${host}`);
    const dnsOk = await testDnsResolution(host);
    if (!dnsOk) {
      console.error('DNS解析失败，这可能导致连接问题');
      // 继续尝试连接，因为IP地址可能不需要DNS解析
    }
    
    // 测试TCP连接
    console.log(`测试TCP连接: ${host}:${port}`);
    const tcpOk = await testTcpConnection(host, port);
    if (!tcpOk) {
      console.error('TCP连接测试失败，这表明网络连接问题或防火墙阻止');
      return false;
    }
    
    // 尝试从连接池获取连接
    const pool = getNetlifyPool();
    console.log('从连接池获取连接...');
    const connection = await pool.getConnection();
    console.log('✓ Netlify数据库连接测试成功');
    
    // 执行简单查询进一步测试连接
    console.log('执行简单查询测试...');
    const [result] = await connection.query('SELECT 1 AS test');
    console.log('✓ 简单查询测试成功:', result);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Netlify数据库连接测试失败:', error);
    
    // 打印更多诊断信息
    const dbError = error as DBError;
    if (dbError.code) {
      console.error('错误代码:', dbError.code);
      
      if (dbError.code === 'ENOTFOUND') {
        console.error('主机名无法解析，请检查DNS设置或使用IP地址');
      } else if (dbError.code === 'ECONNREFUSED') {
        console.error('连接被拒绝，请检查服务器是否在运行以及防火墙设置');
      } else if (dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('访问被拒绝，请检查用户名和密码');
      } else if (dbError.code === 'ETIMEDOUT') {
        console.error('连接超时，可能是网络问题或防火墙阻止');
      }
    }
    
    // 清除连接池实例以便下次重建
    netlifyPool = null;
    
    return false;
  }
}

// 导出默认连接池以保持兼容性
export default getNetlifyPool(); 