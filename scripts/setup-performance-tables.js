/**
 * 性能监控数据库表设置脚本
 * 
 * 用于创建性能监控所需的数据库表
 * 运行方式: node scripts/setup-performance-tables.js
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('开始创建性能监控相关数据库表...');

  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'h5_cloud_db',
      multipleStatements: true
    });

    console.log('数据库连接成功');

    // 创建性能指标表
    const createPerformanceMetricsTable = `
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '指标名称',
        value DOUBLE NOT NULL COMMENT '指标值',
        page VARCHAR(255) NOT NULL COMMENT '页面路径',
        timestamp DATETIME NOT NULL COMMENT '时间戳',
        user_agent TEXT COMMENT '用户代理',
        connection_info VARCHAR(100) COMMENT '网络连接信息',
        resource_url TEXT COMMENT '资源URL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_perf_metrics_name (name),
        INDEX idx_perf_metrics_timestamp (timestamp),
        INDEX idx_perf_metrics_page (page)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    // 创建性能异常表
    const createPerformanceAlertsTable = `
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metric_name VARCHAR(50) NOT NULL COMMENT '指标名称',
        metric_value DOUBLE NOT NULL COMMENT '指标值',
        threshold DOUBLE NOT NULL COMMENT '阈值',
        page VARCHAR(255) NOT NULL COMMENT '页面路径',
        severity ENUM('low', 'medium', 'high') NOT NULL COMMENT '严重性',
        user_agent TEXT COMMENT '用户代理',
        is_resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
        occurred_at DATETIME NOT NULL COMMENT '发生时间',
        resolved_at DATETIME COMMENT '解决时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_perf_alerts_name (metric_name),
        INDEX idx_perf_alerts_severity (severity),
        INDEX idx_perf_alerts_resolved (is_resolved)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    // 创建API性能统计表
    const createApiPerformanceTable = `
      CREATE TABLE IF NOT EXISTS api_performance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL COMMENT 'API端点',
        method VARCHAR(10) NOT NULL COMMENT 'HTTP方法',
        avg_response_time DOUBLE NOT NULL COMMENT '平均响应时间(ms)',
        min_response_time DOUBLE NOT NULL COMMENT '最小响应时间(ms)',
        max_response_time DOUBLE NOT NULL COMMENT '最大响应时间(ms)',
        p95_response_time DOUBLE NOT NULL COMMENT '95%响应时间(ms)',
        call_count INT NOT NULL COMMENT '调用次数',
        error_count INT NOT NULL COMMENT '错误次数',
        date DATE NOT NULL COMMENT '日期',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_api_perf_endpoint (endpoint),
        INDEX idx_api_perf_date (date),
        UNIQUE KEY uk_endpoint_method_date (endpoint, method, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    // 执行创建表的SQL
    await connection.query(createPerformanceMetricsTable);
    console.log('✅ 性能指标表创建成功');

    await connection.query(createPerformanceAlertsTable);
    console.log('✅ 性能异常表创建成功');

    await connection.query(createApiPerformanceTable);
    console.log('✅ API性能统计表创建成功');

    // 关闭数据库连接
    await connection.end();
    console.log('数据库连接已关闭');

    console.log('✅ 所有性能监控相关数据库表创建完成');
  } catch (error) {
    console.error('创建数据库表失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
}); 