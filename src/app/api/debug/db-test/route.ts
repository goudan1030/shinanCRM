import { NextResponse } from 'next/server';
import { testNetlifyConnection, executeQuery } from '@/lib/database-netlify';

export async function GET() {
  try {
    console.log('=== 开始数据库连接诊断 ===');
    
    // 检查环境变量
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      hasPassword: !!process.env.DB_PASSWORD
    };
    
    console.log('环境变量检查:', envVars);
    
    // 测试连接
    const connectionTest = await testNetlifyConnection();
    
    let queryTest = false;
    let queryResult = null;
    
    if (connectionTest) {
      try {
        // 测试简单查询
        const [rows] = await executeQuery('SELECT 1 as test');
        queryTest = true;
        queryResult = rows;
        console.log('查询测试成功:', queryResult);
      } catch (queryError) {
        console.error('查询测试失败:', queryError);
        queryResult = queryError instanceof Error ? queryError.message : '查询失败';
      }
    }
    
    return NextResponse.json({
      success: connectionTest && queryTest,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      netlifyContext: process.env.CONTEXT || 'unknown',
      tests: {
        envVars: envVars,
        connection: connectionTest,
        query: queryTest,
        queryResult: queryResult
      }
    });
    
  } catch (error) {
    console.error('数据库诊断失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '诊断失败',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 