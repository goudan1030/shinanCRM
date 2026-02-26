import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/expense/list');

export async function GET(request: Request) {
  try {
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const searchKeyword = searchParams.get('searchKeyword') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    logger.debug('查询参数', { page, pageSize, searchKeyword, month, year });

    const offset = (page - 1) * pageSize;

    // 构建基础查询 - 使用普通的COUNT查询替代SQL_CALC_FOUND_ROWS
    let query = 'SELECT * FROM expense_records WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM expense_records WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    // 添加搜索条件
    if (searchKeyword) {
      const searchCondition = ' AND notes LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${searchKeyword}%`);
      countParams.push(`%${searchKeyword}%`);
    }

    // 添加年月筛选
    if (year && year !== 'all') {
      if (month && month !== 'all') {
        // 按年月筛选
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        const dateCondition = ' AND expense_date BETWEEN ? AND ?';
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
        const dateCondition = ' AND expense_date BETWEEN ? AND ?';
        query += dateCondition;
        countQuery += dateCondition;
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        params.push(startStr, endStr);
        countParams.push(startStr, endStr);
      }
    } else if (month && month !== 'all') {
      // 仅按月份筛选（所有年份的该月份）
      const dateCondition = ' AND MONTH(expense_date) = ?';
      query += dateCondition;
      countQuery += dateCondition;
      params.push(parseInt(month));
      countParams.push(parseInt(month));
    }

    // 添加排序和分页到主查询
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    // 执行计数查询
    const [countResult] = await executeQuery(countQuery, countParams);
    interface CountResult {
      total: number;
    }
    const total = Array.isArray(countResult) && countResult[0] && typeof countResult[0] === 'object' && 'total' in countResult[0]
      ? Number((countResult[0] as CountResult).total) || 0
      : 0;

    // 执行主查询
    const [records] = await executeQuery(query, params);
    logger.debug('查询完成', { total, recordCount: Array.isArray(records) ? records.length : 0 });

    return createSuccessResponse({
      records: Array.isArray(records) ? records : [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '获取支出记录成功');
  } catch (error) {
    logger.error('获取支出记录失败', error instanceof Error ? error : new Error(String(error)));
      
      // 特殊处理数据库连接错误
    if (error instanceof Error && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return createErrorResponse('数据库连接失败，请检查服务器配置', 503);
    }
    
    return createErrorResponse('获取支出记录失败', 500);
  }
}