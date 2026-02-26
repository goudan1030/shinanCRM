/**
 * 数据库优化脚本
 * 
 * 用于检查和优化数据库表结构、添加必要的索引
 * 运行方式: ts-node scripts/db-optimize.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

interface TableInfo {
  table_name: string;
  engine: string;
  table_rows: number;
  data_length: number;
  index_length: number;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  seq_in_index: number;
  non_unique: number;
}

interface SlowQuery {
  query: string;
  count: number;
  avg_duration: number;
  max_duration: number;
}

// 需要检查的索引配置
interface IndexConfig {
  table: string;
  column: string;
  indexName?: string;
  unique?: boolean;
}

// 需要添加的索引列表
const requiredIndexes: IndexConfig[] = [
  // 性能指标表索引
  { table: 'performance_metrics', column: 'name', indexName: 'idx_perf_metrics_name' },
  { table: 'performance_metrics', column: 'timestamp', indexName: 'idx_perf_metrics_timestamp' },
  { table: 'performance_metrics', column: 'page', indexName: 'idx_perf_metrics_page' },
  
  // 性能告警表索引
  { table: 'performance_alerts', column: 'metric_name', indexName: 'idx_perf_alerts_name' },
  { table: 'performance_alerts', column: 'severity', indexName: 'idx_perf_alerts_severity' },
  { table: 'performance_alerts', column: 'is_resolved', indexName: 'idx_perf_alerts_resolved' },
  
  // API性能表索引
  { table: 'api_performance', column: 'endpoint', indexName: 'idx_api_perf_endpoint' },
  { table: 'api_performance', column: 'date', indexName: 'idx_api_perf_date' },
  
  // 会员表索引
  { table: 'members', column: 'status', indexName: 'idx_members_status' },
  { table: 'members', column: 'created_at', indexName: 'idx_members_created_at' },
  { table: 'members', column: 'updated_at', indexName: 'idx_members_updated_at' },
  { table: 'members', column: 'phone', indexName: 'idx_members_phone', unique: true },
  
  // 收支表索引
  { table: 'finances', column: 'type', indexName: 'idx_finances_type' },
  { table: 'finances', column: 'date', indexName: 'idx_finances_date' },
  { table: 'finances', column: 'category_id', indexName: 'idx_finances_category' },
  
  // 文章表索引
  { table: 'articles', column: 'is_hidden', indexName: 'idx_articles_hidden' },
  { table: 'articles', column: 'is_top', indexName: 'idx_articles_top' },
  { table: 'articles', column: 'created_at', indexName: 'idx_articles_created_at' },
  
  // Banner表索引
  { table: 'banners', column: 'category_id', indexName: 'idx_banners_category' },
  { table: 'banners', column: 'status', indexName: 'idx_banners_status' },
  { table: 'banners', column: 'sort_order', indexName: 'idx_banners_sort' }
];

/**
 * 主函数
 */
async function main() {
  console.log('开始数据库优化...');

  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'h5_cloud_db'
    });

    console.log('数据库连接成功');

    // 分析表结构
    await analyzeTableStructure(connection);
    
    // 检查并添加缺失的索引
    await checkAndAddIndexes(connection);
    
    // 分析慢查询
    await analyzeSlowQueries(connection);
    
    // 优化表
    await optimizeTables(connection);

    // 关闭数据库连接
    await connection.end();
    console.log('数据库连接已关闭');

    console.log('✅ 数据库优化完成');
  } catch (error) {
    console.error('数据库优化失败:', error);
    process.exit(1);
  }
}

/**
 * 分析表结构
 */
async function analyzeTableStructure(connection: mysql.Connection) {
  console.log('\n📊 分析表结构...');
  
  try {
    // 获取所有表信息
    const [tables] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT 
        table_name,
        engine,
        table_rows,
        data_length,
        index_length
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = ?
      ORDER BY 
        data_length DESC
    `, [process.env.DB_NAME]);
    
    // 显示表信息
    console.log('\n表结构信息:');
    console.log('-------------------------------------------------------------------------');
    console.log('表名               | 引擎    | 行数     | 数据大小  | 索引大小   | 总大小');
    console.log('-------------------------------------------------------------------------');
    
    (tables as TableInfo[]).forEach(table => {
      const dataSizeMB = (table.data_length / (1024 * 1024)).toFixed(2);
      const indexSizeMB = (table.index_length / (1024 * 1024)).toFixed(2);
      const totalSizeMB = ((table.data_length + table.index_length) / (1024 * 1024)).toFixed(2);
      
      console.log(
        `${table.table_name.padEnd(18)} | ${table.engine.padEnd(7)} | ${String(table.table_rows).padEnd(8)} | ${dataSizeMB.padEnd(8)}MB | ${indexSizeMB.padEnd(9)}MB | ${totalSizeMB}MB`
      );
    });
    
    console.log('-------------------------------------------------------------------------');
  } catch (error) {
    console.error('分析表结构失败:', error);
  }
}

/**
 * 检查并添加缺失的索引
 */
async function checkAndAddIndexes(connection: mysql.Connection) {
  console.log('\n🔍 检查数据库索引...');
  
  try {
    // 获取所有现有索引
    const [existingIndexes] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT 
        t.table_name,
        s.index_name,
        s.column_name,
        s.seq_in_index,
        s.non_unique
      FROM 
        information_schema.statistics s
      JOIN 
        information_schema.tables t ON s.table_schema = t.table_schema AND s.table_name = t.table_name
      WHERE 
        t.table_schema = ?
      ORDER BY 
        t.table_name, s.index_name, s.seq_in_index
    `, [process.env.DB_NAME]);
    
    // 转换为索引对象列表
    const indexes: IndexInfo[] = existingIndexes as IndexInfo[];
    
    // 检查缺失的索引
    console.log('\n检查缺失的索引...');
    const indexesToAdd: IndexConfig[] = [];
    
    for (const requiredIndex of requiredIndexes) {
      const exists = indexes.some(idx => 
        idx.table_name === requiredIndex.table && 
        idx.column_name === requiredIndex.column &&
        idx.seq_in_index === 1
      );
      
      if (!exists) {
        indexesToAdd.push(requiredIndex);
      }
    }
    
    // 添加缺失的索引
    if (indexesToAdd.length === 0) {
      console.log('✅ 所有必要的索引已存在');
    } else {
      console.log(`发现 ${indexesToAdd.length} 个缺失的索引，开始添加...`);
      
      for (const index of indexesToAdd) {
        try {
          // 检查表是否存在
          const [tableExists] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = ?
          `, [process.env.DB_NAME, index.table]);
          
          if ((tableExists as any[]).length === 0) {
            console.log(`跳过索引 ${index.indexName || index.column}，表 ${index.table} 不存在`);
            continue;
          }
          
          // 添加索引
          const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
          const indexName = index.indexName || `idx_${index.table}_${index.column}`;
          
          await connection.query(`
            ALTER TABLE ${index.table} ADD ${indexType} ${indexName} (${index.column})
          `);
          
          console.log(`✅ 已添加索引: ${indexName} 到表 ${index.table} (${index.column})`);
        } catch (error) {
          console.error(`添加索引失败: ${index.table}.${index.column}`, error);
        }
      }
    }
  } catch (error) {
    console.error('检查索引失败:', error);
  }
}

/**
 * 分析慢查询
 */
async function analyzeSlowQueries(connection: mysql.Connection) {
  console.log('\n🐢 分析慢查询...');
  
  try {
    // 检查慢查询日志是否启用
    const [variables] = await connection.query<mysql.RowDataPacket[]>(`
      SHOW VARIABLES LIKE 'slow_query%'
    `);
    
    const slowQueryEnabled = (variables as any[]).find(v => v.Variable_name === 'slow_query_log')?.Value === 'ON';
    
    if (!slowQueryEnabled) {
      console.log('⚠️ 慢查询日志未启用，无法分析历史慢查询');
      console.log('建议执行以下命令启用慢查询日志:');
      console.log('  SET GLOBAL slow_query_log = 1;');
      console.log('  SET GLOBAL long_query_time = 1;');
      return;
    }
    
    // 查询记录的慢查询
    try {
      const [slowQueries] = await connection.query<mysql.RowDataPacket[]>(`
        SELECT 
          sql_text as query,
          count_star as count,
          avg_timer_wait/(1000*1000*1000) as avg_duration,
          max_timer_wait/(1000*1000*1000) as max_duration
        FROM 
          performance_schema.events_statements_summary_by_digest
        WHERE 
          avg_timer_wait > 1000*1000*1000*1
        ORDER BY 
          avg_timer_wait DESC
        LIMIT 10
      `);
      
      if ((slowQueries as any[]).length === 0) {
        console.log('未找到慢查询记录');
        return;
      }
      
      console.log('\n慢查询TOP 10:');
      console.log('---------------------------------------------------------------------');
      console.log('查询                                    | 次数    | 平均耗时  | 最大耗时');
      console.log('---------------------------------------------------------------------');
      
      (slowQueries as SlowQuery[]).forEach(query => {
        const truncatedQuery = query.query.length > 40 
          ? query.query.substring(0, 37) + '...' 
          : query.query.padEnd(40);
        
        console.log(
          `${truncatedQuery} | ${String(query.count).padEnd(7)} | ${query.avg_duration.toFixed(2).padEnd(8)}ms | ${query.max_duration.toFixed(2)}ms`
        );
      });
      
      console.log('---------------------------------------------------------------------');
    } catch (error) {
      console.log('无法访问performance_schema表，需要更高权限或启用性能模式');
    }
  } catch (error) {
    console.error('分析慢查询失败:', error);
  }
}

/**
 * 优化表
 */
async function optimizeTables(connection: mysql.Connection) {
  console.log('\n🔧 优化表...');
  
  try {
    // 获取所有InnoDB表
    const [tables] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND engine = 'InnoDB'
    `, [process.env.DB_NAME]);
    
    // 优化每个表
    for (const table of tables as any[]) {
      const tableName = table.table_name;
      
      try {
        // 分析表
        console.log(`分析表 ${tableName}...`);
        await connection.query(`ANALYZE TABLE ${tableName}`);
        
        // 表无法用OPTIMIZE直接优化，但可以通过ALTER TABLE来重建
        console.log(`优化表 ${tableName}...`);
        await connection.query(`ALTER TABLE ${tableName} ENGINE=InnoDB`);
        
        console.log(`✅ 表 ${tableName} 优化完成`);
      } catch (error) {
        console.error(`优化表 ${tableName} 失败:`, error);
      }
    }
  } catch (error) {
    console.error('优化表失败:', error);
  }
}

// 执行主函数
main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
}); 