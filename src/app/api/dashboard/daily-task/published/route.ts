import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 获取今日已发布的会员ID列表
 * GET /api/dashboard/daily-task/published
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 获取今日已发布的会员ID列表
    const [publishedResult] = await executeQuery(
      `SELECT DISTINCT member_id FROM daily_tasks 
       WHERE task_date = ? AND status IN ('published', 'completed')`,
      [today]
    );

    const memberIds: number[] = [];
    if (Array.isArray(publishedResult)) {
      publishedResult.forEach((row: any) => {
        if (row.member_id) {
          memberIds.push(Number(row.member_id));
        }
      });
    }

    return createSuccessResponse({
      memberIds
    }, '获取已发布列表成功');

  } catch (error) {
    console.error('获取已发布列表失败:', error);
    return createErrorResponse('获取已发布列表失败', 500);
  }
}
