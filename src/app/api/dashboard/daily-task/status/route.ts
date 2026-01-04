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

    // 1. 检查今日是否已完成
    const [completionResult] = await executeQuery(
      `SELECT * FROM daily_task_completions WHERE task_date = ?`,
      [today]
    );

    const isCompleted = Array.isArray(completionResult) && completionResult.length > 0;

    // 2. 获取今日已发布数量
    const [publishedResult] = await executeQuery(
      `SELECT COUNT(*) as count FROM daily_tasks 
       WHERE task_date = ? AND status IN ('published', 'completed')`,
      [today]
    );

    const publishedCount = Array.isArray(publishedResult) && publishedResult[0]
      ? Number(publishedResult[0].count) || 0
      : 0;

    // 3. 获取总女性会员数
    const [totalResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members 
       WHERE gender = 'female' AND status = 'ACTIVE' 
       AND (deleted IS NULL OR deleted = FALSE)`
    );

    const totalCount = Array.isArray(totalResult) && totalResult[0]
      ? Number(totalResult[0].total) || 0
      : 0;

    return createSuccessResponse({
      isCompleted,
      publishedCount,
      totalCount,
      taskDate: today
    }, '获取任务状态成功');

  } catch (error) {
    console.error('获取任务状态失败:', error);
    return createErrorResponse('获取任务状态失败', 500);
  }
}
