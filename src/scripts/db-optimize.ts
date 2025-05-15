#!/usr/bin/env node
/**
 * 数据库性能优化脚本
 * 
 * 用于分析和优化数据库性能，包括:
 * 1. 检查现有表结构和索引
 * 2. 为频繁访问的字段添加缺失的索引
 * 3. 分析表并提供优化建议
 * 4. 执行必要的维护任务
 * 
 * 使用方法: npm run db:optimize
 */

import { createPool, Pool, RowDataPacket } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 要添加索引的表和字段
interface IndexDefinition {
  table: string;
  column: string;
  indexName: string;
  indexType?: string; // 'UNIQUE' | 'FULLTEXT' | 'SPATIAL' | undefined (默认普通索引)
}

// 常用查询索引定义
const commonIndexes: IndexDefinition[] = [
  // 会员表索引
  { table: 'members', column: 'phone', indexName: 'idx_members_phone' },
  { table: 'members', column: 'email', indexName: 'idx_members_email' },
  { table: 'members', column: 'status', indexName: 'idx_members_status' },
  { table: 'members', column: 'created_at', indexName: 'idx_members_created_at' },
  { table: 'members', column: 'updated_at', indexName: 'idx_members_updated_at' },
  
  // Banner表索引
  { table: 'banners', column: 'category_id', indexName: 'idx_banners_category_id' },
  { table: 'banners', column: 'status', indexName: 'idx_banners_status' },
  { table: 'banners', column: 'sort_order', indexName: 'idx_banners_sort_order' },
  
  // 文章表索引
  { table: 'articles', column: 'title', indexName: 'idx_articles_title' },
  { table: 'articles', column: 'is_hidden', indexName: 'idx_articles_is_hidden' },
  { table: 'articles', column: 'is_top', indexName: 'idx_articles_is_top' },
  { table: 'articles', column: 'created_at', indexName: 'idx_articles_created_at' },
  
  // 性能指标表索引
  { table: 'performance_metrics', column: 'name', indexName: 'idx_perf_metrics_name' },
  { table: 'performance_metrics', column: 'timestamp', indexName: 'idx_perf_metrics_timestamp' },
  { table: 'performance_metrics', column: 'page', indexName: 'idx_perf_metrics_page' },
];

// 慢查询分析阈值（秒）
const SLOW_QUERY_THRESHOLD = 1;

// 创建数据库连接池
async function createDBPool(): Promise<Pool> {
  const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'h5_cloud_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });
  
  return pool;
}

// 检查表是否存在
async function checkTableExists(pool: Pool, tableName: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [process.env.DB_NAME, tableName]
  );
  
  return rows[0].count > 0;
}

// 检查索引是否存在
async function checkIndexExists(pool: Pool, tableName: string, indexName: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.statistics 
     WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [process.env.DB_NAME, tableName, indexName]
  );
  
  return rows[0].count > 0;
}

// 创建索引
async function createIndex(pool: Pool, index: IndexDefinition): Promise<void> {
  const { table, column, indexName, indexType } = index;
  
  const indexTypeClause = indexType ? `${indexType} INDEX` : 'INDEX';
  
  try {
    await pool.query(`ALTER TABLE ${table} ADD ${indexTypeClause} ${indexName} (${column})`);
    console.log(`✅ 成功创建索引: ${table}.${indexName} (${column})`);
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log(`⚠️ 索引已存在: ${table}.${indexName}`);
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`❌ 表不存在: ${table}`);
    } else {
      console.error(`❌ 创建索引失败 (${table}.${indexName}): ${error.message}`);
    }
  }
}

// 分析表性能
async function analyzeTable(pool: Pool, tableName: string): Promise<void> {
  try {
    console.log(`\n📊 分析表: ${tableName}`);
    
    // 获取表信息
    const [tableInfo] = await pool.query<RowDataPacket[]>(
      `SHOW TABLE STATUS WHERE Name = ?`,
      [tableName]
    );
    
    if (tableInfo.length === 0) {
      console.log(`❌ 表不存在: ${tableName}`);
      return;
    }
    
    const info = tableInfo[0];
    
    // 输出表信息
    console.log(`表引擎: ${info.Engine}`);
    console.log(`行数: ${info.Rows}`);
    console.log(`数据大小: ${(info.Data_length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`索引大小: ${(info.Index_length / 1024 / 1024).toFixed(2)} MB`);
    
    // 获取表索引
    const [indexes] = await pool.query<RowDataPacket[]>(
      `SHOW INDEX FROM ${tableName}`
    );
    
    console.log(`\n索引列表 (${indexes.length}):`);
    const indexMap = new Map<string, any[]>();
    
    indexes.forEach(idx => {
      if (!indexMap.has(idx.Key_name)) {
        indexMap.set(idx.Key_name, []);
      }
      indexMap.get(idx.Key_name)!.push({
        column: idx.Column_name,
        unique: idx.Non_unique === 0,
        cardinality: idx.Cardinality
      });
    });
    
    indexMap.forEach((columns, indexName) => {
      const columnStr = columns.map(c => c.column).join(', ');
      const uniqueStr = columns[0].unique ? 'UNIQUE' : 'NON-UNIQUE';
      console.log(`  - ${indexName} (${uniqueStr}): [${columnStr}]`);
    });
    
    // 执行表分析
    console.log(`\n🔍 执行表分析...`);
    await pool.query(`ANALYZE TABLE ${tableName}`);
    
    // 提供优化建议
    const engineRecommendation = info.Engine !== 'InnoDB' ? 
      `⚠️ 建议将表引擎从 ${info.Engine} 更改为 InnoDB 以获得更好的性能和事务支持` : 
      `✅ 表引擎已使用推荐的 InnoDB`;
    
    console.log(`\n📝 优化建议:`);
    console.log(engineRecommendation);
    
    if (info.Data_length > 100 * 1024 * 1024) { // 大于100MB的表
      console.log(`⚠️ 表较大 (${(info.Data_length / 1024 / 1024).toFixed(2)} MB)，建议考虑分区或归档历史数据`);
    }
    
    if (indexMap.size === 0) {
      console.log(`⚠️ 表没有索引，可能会导致查询性能问题`);
    } else if (info.Index_length > info.Data_length * 0.5) {
      console.log(`⚠️ 索引占用空间较大，可能存在冗余索引`);
    }
  } catch (error: any) {
    console.error(`❌ 分析表失败 (${tableName}): ${error.message}`);
  }
}

// 获取慢查询日志
async function getSlowQueries(pool: Pool): Promise<void> {
  try {
    console.log(`\n🐢 慢查询分析 (阈值: ${SLOW_QUERY_THRESHOLD}秒):`);
    
    // 检查慢查询日志是否开启
    const [logStatus] = await pool.query<RowDataPacket[]>(
      `SHOW VARIABLES LIKE 'slow_query_log'`
    );
    
    if (logStatus.length === 0 || logStatus[0].Value !== 'ON') {
      console.log(`⚠️ 慢查询日志未开启，建议开启以监控性能问题`);
      console.log(`可以通过以下命令开启: SET GLOBAL slow_query_log = 'ON'`);
      return;
    }
    
    // 获取慢查询日志文件位置
    const [logFile] = await pool.query<RowDataPacket[]>(
      `SHOW VARIABLES LIKE 'slow_query_log_file'`
    );
    
    if (logFile.length > 0) {
      console.log(`慢查询日志文件: ${logFile[0].Value}`);
    }
    
    // 获取慢查询阈值
    const [logThreshold] = await pool.query<RowDataPacket[]>(
      `SHOW VARIABLES LIKE 'long_query_time'`
    );
    
    if (logThreshold.length > 0) {
      console.log(`当前慢查询阈值: ${logThreshold[0].Value}秒`);
      
      if (parseFloat(logThreshold[0].Value) > SLOW_QUERY_THRESHOLD) {
        console.log(`⚠️ 建议将慢查询阈值设置为 ${SLOW_QUERY_THRESHOLD} 秒以捕获更多潜在问题`);
        console.log(`可以通过以下命令设置: SET GLOBAL long_query_time = ${SLOW_QUERY_THRESHOLD}`);
      }
    }
    
    // 在某些情况下，我们可能无法直接读取慢查询日志文件
    // 但可以显示如何查看慢查询的提示
    console.log(`\n可以使用以下命令查看近期慢查询:`);
    console.log(`SHOW GLOBAL STATUS LIKE '%Slow_queries%';`);
    console.log(`SHOW PROCESSLIST;`);
  } catch (error: any) {
    console.error(`❌ 获取慢查询信息失败: ${error.message}`);
  }
}

// 优化查询建议
function getQueryOptimizationTips(): void {
  console.log(`\n🚀 SQL查询优化建议:`);
  console.log(`1. 避免使用SELECT *，只选择需要的列`);
  console.log(`2. 限制结果集大小，合理使用LIMIT`);
  console.log(`3. 使用适当的WHERE条件过滤数据`);
  console.log(`4. 避免在索引列上使用函数，如WHERE YEAR(date_column) = 2023`);
  console.log(`5. 使用JOIN替代子查询`);
  console.log(`6. 定期执行ANALYZE TABLE和OPTIMIZE TABLE`);
  console.log(`7. 将频繁查询的结果缓存到Redis或应用内存中`);
  console.log(`8. 考虑分表或分区来处理大表`);
  console.log(`9. 使用查询解释计划(EXPLAIN)分析复杂查询`);
  console.log(`10. 避免OR条件，可使用UNION ALL替代`);
}

// 主函数
async function main(): Promise<void> {
  console.log('🔍 开始数据库性能优化分析...');
  
  const pool = await createDBPool();
  
  try {
    // 1. 获取所有表
    const [tables] = await pool.query<RowDataPacket[]>(
      `SHOW TABLES FROM ${process.env.DB_NAME}`
    );
    
    console.log(`找到 ${tables.length} 个表`);
    
    // 2. 为常用字段添加缺失的索引
    console.log('\n📊 检查并添加缺失的索引:');
    
    for (const indexDef of commonIndexes) {
      const { table, indexName } = indexDef;
      
      // 检查表是否存在
      const tableExists = await checkTableExists(pool, table);
      if (!tableExists) {
        console.log(`❌ 表不存在: ${table}`);
        continue;
      }
      
      // 检查索引是否存在
      const indexExists = await checkIndexExists(pool, table, indexName);
      if (indexExists) {
        console.log(`✅ 索引已存在: ${table}.${indexName}`);
      } else {
        // 创建索引
        await createIndex(pool, indexDef);
      }
    }
    
    // 3. 分析每个表的性能
    for (const tableRow of tables) {
      const tableName = tableRow[`Tables_in_${process.env.DB_NAME}`];
      await analyzeTable(pool, tableName);
    }
    
    // 4. 获取慢查询信息
    await getSlowQueries(pool);
    
    // 5. 输出查询优化建议
    getQueryOptimizationTips();
    
    console.log('\n✅ 数据库性能优化分析完成');
    
  } catch (error: any) {
    console.error(`❌ 数据库性能优化分析失败: ${error.message}`);
  } finally {
    // 关闭连接池
    await pool.end();
  }
}

// 执行主函数
main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});