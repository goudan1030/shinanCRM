/**
 * 此文件已弃用，请使用 src/lib/database.ts
 * 为保持向后兼容，此文件仍然存在
 */

import mysql from 'mysql2/promise';
import { LRUCache } from 'lru-cache';

// 数据库连接池配置
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'h5_cloud_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 创建数据库连接池
const pool = mysql.createPool(poolConfig);

// 查询缓存配置
const queryCache = new LRUCache<string, any>({
  max: 100, // 最多缓存100个查询结果
  ttl: 1000 * 60 * 5, // 缓存5分钟
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false
});

/**
 * 执行SQL查询
 * @param sql SQL语句
 * @param params 查询参数
 * @param useCache 是否使用缓存 (默认false)
 * @returns 查询结果
 */
export async function query(sql: string, params: any[] = [], useCache = false): Promise<any> {
  const startTime = performance.now();
  
  // 如果启用缓存，尝试从缓存获取结果
  if (useCache && sql.trim().toLowerCase().startsWith('select')) {
    const cacheKey = `${sql}:${JSON.stringify(params)}`;
    const cachedResult = queryCache.get(cacheKey);
    
    if (cachedResult) {
      // 缓存命中，记录性能信息
      const duration = performance.now() - startTime;
      logQueryPerformance(sql, duration, true);
      
      return cachedResult;
    }
  }
  
  try {
    // 执行查询
    const [rows] = await pool.query(sql, params);
    
    // 计算查询时间
    const duration = performance.now() - startTime;
    
    // 记录查询性能
    logQueryPerformance(sql, duration);
    
    // 如果是SELECT查询且启用缓存，保存结果到缓存
    if (useCache && sql.trim().toLowerCase().startsWith('select')) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      queryCache.set(cacheKey, rows);
    }
    
    return rows;
  } catch (error) {
    // 计算查询时间
    const duration = performance.now() - startTime;
    
    // 记录失败的查询
    console.error(`查询失败 (${duration.toFixed(2)}ms): ${formatSql(sql, params)}`);
    console.error(error);
    
    // 重新抛出异常
    throw error;
  }
}

/**
 * 记录查询性能
 */
function logQueryPerformance(sql: string, duration: number, fromCache = false): void {
  // 只在开发环境或慢查询时记录
  const isDev = process.env.NODE_ENV === 'development';
  const isSlowQuery = duration > 500; // 超过500ms的查询视为慢查询

  if (isDev || isSlowQuery) {
    const source = fromCache ? '(缓存)' : '';
    const message = isSlowQuery 
      ? `慢查询 ${source} (${duration.toFixed(2)}ms): ${sql.substring(0, 100)}...` 
      : `查询 ${source} (${duration.toFixed(2)}ms): ${sql.substring(0, 100)}...`;
    
    if (isSlowQuery) {
      console.warn(message);
      // 在这里可以添加慢查询的记录逻辑，例如保存到数据库
    } else if (isDev) {
      console.log(message);
    }
  }
  
  // 保存查询统计信息
  saveQueryStatistics(sql, duration, fromCache);
}

/**
 * 保存查询统计信息
 */
async function saveQueryStatistics(sql: string, duration: number, fromCache: boolean): Promise<void> {
  // 提取查询类型
  const queryType = sql.trim().split(' ')[0].toUpperCase();
  
  // 这里可以实现保存查询统计信息的逻辑
  // 例如，每小时聚合并保存到数据库中
  // 此处简化处理，只在内存中累计
  
  try {
    // 实际应用中可以定期保存这些统计信息
    // 例如实现一个定时任务来集中保存这些统计数据
  } catch (error) {
    console.error('保存查询统计信息失败:', error);
  }
}

/**
 * 格式化SQL语句（用于日志）
 */
function formatSql(sql: string, params: any[]): string {
  if (!params || params.length === 0) return sql;
  
  let formattedSql = sql;
  
  try {
    // 非常简单的替换，仅用于日志显示
    params.forEach((param) => {
      const paramValue = typeof param === 'string' ? `'${param}'` : param;
      formattedSql = formattedSql.replace('?', String(paramValue));
    });
    
    return formattedSql;
  } catch (error) {
    return sql; // 如果格式化失败，返回原始SQL
  }
}

/**
 * 获取慢查询列表
 */
export async function getSlowQueries(): Promise<any[]> {
  try {
    const sql = `
      SELECT * FROM slow_queries
      ORDER BY duration DESC
      LIMIT 100
    `;
    
    return await query(sql);
  } catch (error) {
    console.error('获取慢查询列表失败:', error);
    return [];
  }
}

/**
 * 检查数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const startTime = performance.now();
    
    // 执行简单查询来检查连接
    await pool.query('SELECT 1');
    
    const duration = performance.now() - startTime;
    console.log(`数据库连接检查: 正常 (${duration.toFixed(2)}ms)`);
    
    return true;
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return false;
  }
}

// 导出连接池以便在需要时直接使用
export { pool };

// 默认导出查询函数
export default query; 