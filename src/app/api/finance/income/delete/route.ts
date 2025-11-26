import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/income/delete');

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    // 验证必填字段
    if (!id) {
      return createErrorResponse('请提供记录ID', 400);
    }

    // 删除收入记录
    await executeQuery(
      'DELETE FROM income_records WHERE id = ?',
      [id]
    );

    return createSuccessResponse(null, '删除收入记录成功');
  } catch (error) {
    logger.error('删除收入记录失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('删除收入记录失败', 500);
  }
}