import { NextResponse } from 'next/server';
import { testNetlifyConnection, executeQuery } from '@/lib/database-netlify';
import os from 'os';
import { networkInterfaces } from 'os';

/**
 * 获取服务器的IP地址信息
 */
function getServerIpAddresses() {
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // 跳过内部IP和非IPv4地址
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  
  return results;
}

export async function GET() {
  try {
    console.log('=== 开始数据库连接诊断 ===');
    
    // 收集系统信息
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      ipAddresses: getServerIpAddresses()
    };
    
    // 检查环境变量
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      hasPassword: !!process.env.DB_PASSWORD,
      SERVER_URL: process.env.SERVER_URL,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('环境变量检查:', envVars);
    console.log('系统信息:', systemInfo);
    
    // 测试连接
    console.log('开始测试数据库连接...');
    const connectionTest = await testNetlifyConnection();
    console.log('连接测试结果:', connectionTest);
    
    let queryTest = false;
    let queryResult = null;
    let tablesTest = null;
    
    if (connectionTest) {
      try {
        // 测试简单查询
        console.log('执行简单查询测试...');
        const [rows] = await executeQuery('SELECT 1 as test');
        queryTest = true;
        queryResult = rows;
        console.log('查询测试成功:', queryResult);
        
        // 测试表格访问
        try {
          console.log('测试数据库表格访问...');
          const [tables] = await executeQuery('SHOW TABLES');
          tablesTest = {
            success: true,
            tables: tables.map(table => Object.values(table)[0])
          };
          
          // 测试几个关键表的记录数
          const tableStats = {};
          for (const table of tablesTest.tables.slice(0, 5)) { // 只测试前5个表
            try {
              const [countResult] = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
              tableStats[table] = countResult[0].count;
            } catch (countError) {
              tableStats[table] = `错误: ${countError.message}`;
            }
          }
          tablesTest.tableStats = tableStats;
          
        } catch (tablesError) {
          tablesTest = {
            success: false,
            error: tablesError instanceof Error ? tablesError.message : '无法获取表格列表'
          };
        }
        
      } catch (queryError) {
        console.error('查询测试失败:', queryError);
        queryResult = queryError instanceof Error ? queryError.message : '查询失败';
      }
    }
    
    // 构建响应
    const diagnosticResponse = {
      success: connectionTest && queryTest,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      netlifyContext: process.env.CONTEXT || 'unknown',
      system: systemInfo,
      tests: {
        envVars: envVars,
        connection: connectionTest,
        query: {
          success: queryTest,
          result: queryResult
        },
        tables: tablesTest
      },
      recommendations: []
    };
    
    // 添加建议
    if (!connectionTest) {
      diagnosticResponse.recommendations.push(
        '数据库连接失败。请检查数据库主机、用户名和密码是否正确。',
        '确认MySQL服务器允许从当前IP地址访问。',
        '检查服务器防火墙是否允许3306端口的外部访问。'
      );
    } else if (!queryTest) {
      diagnosticResponse.recommendations.push(
        '数据库连接成功但查询失败。可能是权限问题或SQL语法错误。',
        '确认用户对数据库有足够的权限。'
      );
    } else if (tablesTest && !tablesTest.success) {
      diagnosticResponse.recommendations.push(
        '无法访问数据库表。请检查用户权限和表是否存在。'
      );
    } else {
      diagnosticResponse.recommendations.push(
        '数据库连接和查询都正常。如果应用仍然有问题，请检查应用代码中的数据库调用。'
      );
    }
    
    console.log('=== 数据库诊断完成 ===');
    
    return NextResponse.json(diagnosticResponse);
    
  } catch (error) {
    console.error('数据库诊断失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '诊断失败',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 