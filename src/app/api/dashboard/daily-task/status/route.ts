import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 获取今日任务状态
 * GET /api/dashboard/daily-task/status
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. 获取今日已发布数量
    const [publishedResult] = await executeQuery(
      `SELECT COUNT(*) as count FROM daily_tasks 
       WHERE task_date = ? AND status = 'published'`,
      [today]
    );

    const publishedCount = Array.isArray(publishedResult) && publishedResult[0]
      ? Number(publishedResult[0].count) || 0
      : 0;

    // 2. 获取今日任务总数（pending + published）
    const [totalTaskResult] = await executeQuery(
      `SELECT COUNT(*) as count FROM daily_tasks 
       WHERE task_date = ? AND status IN ('pending', 'published')`,
      [today]
    );

    const totalTaskCount = Array.isArray(totalTaskResult) && totalTaskResult[0]
      ? Number(totalTaskResult[0].count) || 0
      : 0;

    return createSuccessResponse({
      publishedCount,
      totalCount: totalTaskCount,
      taskDate: today
    }, '获取任务状态成功');

  } catch (error) {
    console.error('获取任务状态失败:', error);
    return createErrorResponse('获取任务状态失败', 500);
  }
}
