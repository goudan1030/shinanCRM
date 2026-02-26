import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/income');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.member_no || !data.payment_method || !data.amount) {
      return createErrorResponse('请填写必要的信息', 400);
    }

    // 插入收入记录
    const [result] = await executeQuery(
      'INSERT INTO income_records (member_no, payment_date, payment_method, amount, notes, operator_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.member_no,
        data.payment_date,
        data.payment_method,
        parseFloat(data.amount),
        data.notes || null,
        data.operator_id
      ]
    );

    interface InsertResult {
      insertId: number;
      affectedRows: number;
    }
    const recordId = result && typeof result === 'object' && 'insertId' in result
      ? (result as InsertResult).insertId
      : null;

    return createSuccessResponse({ id: recordId }, '创建收入记录成功');
  } catch (error) {
    logger.error('创建收入记录失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('创建收入记录失败', 500);
  }
}