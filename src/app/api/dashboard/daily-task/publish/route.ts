import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 标记女生已发布
 * POST /api/dashboard/daily-task/publish
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return createErrorResponse('会员ID不能为空', 400);
    }

    const today = new Date().toISOString().split('T')[0];

    // 更新任务状态为已发布
    await executeQuery(
      `UPDATE daily_tasks 
       SET status = 'published', published_at = NOW() 
       WHERE task_date = ? AND member_id = ?`,
      [today, memberId]
    );

    // 获取今日已发布数量
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as count FROM daily_tasks 
       WHERE task_date = ? AND status = 'published'`,
      [today]
    );

    const publishedCount = Array.isArray(countResult) && countResult[0]
      ? Number(countResult[0].count) || 0
      : 0;

    return createSuccessResponse({
      publishedCount
    }, '标记发布成功');

  } catch (error) {
    console.error('标记发布失败:', error);
    return createErrorResponse('标记发布失败', 500);
  }
}
