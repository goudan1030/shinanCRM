import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 标记会员是否找到
 * POST /api/members/[id]/mark-success
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    const body = await request.json();
    const { is_success } = body;

    if (is_success === undefined || (is_success !== 0 && is_success !== 1)) {
      return createErrorResponse('is_success参数必须为0或1', 400);
    }

    // 更新会员的is_success状态
    await executeQuery(
      `UPDATE members 
       SET is_success = ?, updated_at = NOW() 
       WHERE id = ?`,
      [is_success, memberId]
    );

    return createSuccessResponse({
      memberId,
      is_success
    }, is_success === 1 ? '已标记为找到' : '已取消标记');

  } catch (error) {
    console.error('标记找到失败:', error);
    return createErrorResponse('标记找到失败', 500);
  }
}
