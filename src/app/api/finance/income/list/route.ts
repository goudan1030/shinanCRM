import { NextResponse } from 'next/server';
import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const searchKeyword = searchParams.get('searchKeyword') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    const offset = (page - 1) * pageSize;

    // 构建基础查询 - 使用普通的COUNT查询替代SQL_CALC_FOUND_ROWS
    let query = 'SELECT * FROM income_records WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM income_records WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    // 添加搜索条件
    if (searchKeyword) {
      const searchCondition = ' AND (member_no LIKE ? OR notes LIKE ?)';
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
      countParams.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }

    // 添加支付方式筛选
    if (paymentMethod && paymentMethod !== 'all') {
      const paymentCondition = ' AND payment_method = ?';
      query += paymentCondition;
      countQuery += paymentCondition;
      params.push(paymentMethod);
      countParams.push(paymentMethod);
    }

    // 添加年月筛选
    if (year) {
      if (month && month !== 'all') {
        // 按年月筛选
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        const dateCondition = ' AND payment_date BETWEEN ? AND ?';
        query += dateCondition;
        countQuery += dateCondition;
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        params.push(startStr, endStr);
        countParams.push(startStr, endStr);
      } else {
        // 仅按年份筛选
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31);
        const dateCondition = ' AND payment_date BETWEEN ? AND ?';
        query += dateCondition;
        countQuery += dateCondition;
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        params.push(startStr, endStr);
        countParams.push(startStr, endStr);
      }
    }

    // 添加排序和分页到主查询
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    // 执行计数查询
    const [countResult] = await executeQuery(countQuery, countParams);
    const total = (countResult as any[])[0].total;

    // 执行主查询
    const [records] = await executeQuery(query, params);

    const response = NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });

    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('获取收入记录失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 特殊处理数据库连接错误
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check server configuration.',
            details: '数据库连接失败，请检查服务器配置'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: '获取收入记录失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
}