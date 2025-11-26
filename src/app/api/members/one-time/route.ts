import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/members/one-time');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    
    logger.debug('一次性会员查询参数', { page, pageSize });

    // 计算分页参数
    const offset = (page - 1) * pageSize;
    
    // 获取总数
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM members WHERE type = ?', ['ONE_TIME']);
    interface CountResult {
      total: number;
    }
    const total = Array.isArray(countResult) && countResult[0] && typeof countResult[0] === 'object' && 'total' in countResult[0]
      ? Number((countResult[0] as CountResult).total) || 0
      : 0;
    
    // 查询数据
    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      ['ONE_TIME', pageSize, offset]
    );
    
    logger.debug('一次性会员API返回数据', { count: Array.isArray(rows) ? rows.length : 0, total });
    
    return createSuccessResponse({
      data: Array.isArray(rows) ? rows : [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '获取一次性会员列表成功');
  } catch (error) {
    logger.error('获取一次性会员列表失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('获取一次性会员列表失败', 500);
  }
}