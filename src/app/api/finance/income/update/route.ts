import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/income/update');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.id || !data.member_no || !data.payment_date || !data.amount) {
      return createErrorResponse('请填写必要的信息', 400);
    }

    // 更新收入记录
    await executeQuery(
      'UPDATE income_records SET member_no = ?, payment_date = ?, payment_method = ?, amount = ?, notes = ? WHERE id = ?',
      [
        data.member_no,
        data.payment_date,
        data.payment_method,
        parseFloat(data.amount),
        data.notes || null,
        data.id
      ]
    );

    return createSuccessResponse(null, '更新收入记录成功');
  } catch (error) {
    logger.error('更新收入记录失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('更新收入记录失败', 500);
  }
}