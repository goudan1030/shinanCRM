import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 标记今日任务完成
 * POST /api/dashboard/daily-task/complete
 */
export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. 获取今日已发布数量
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as count FROM daily_tasks 
       WHERE task_date = ? AND status = 'published'`,
      [today]
    );

    const totalPublished = Array.isArray(countResult) && countResult[0]
      ? Number(countResult[0].count) || 0
      : 0;

    // 2. 更新所有今日任务状态为已完成
    await executeQuery(
      `UPDATE daily_tasks 
       SET status = 'completed', completed_at = NOW() 
       WHERE task_date = ? AND status = 'published'`,
      [today]
    );

    // 3. 记录完成信息
    await executeQuery(
      `INSERT INTO daily_task_completions (task_date, completed_at, total_published)
       VALUES (?, NOW(), ?)
       ON DUPLICATE KEY UPDATE 
         completed_at = NOW(), 
         total_published = ?`,
      [today, totalPublished, totalPublished]
    );

    return createSuccessResponse({
      totalPublished,
      completedAt: new Date().toISOString()
    }, '今日任务完成');

  } catch (error) {
    console.error('标记任务完成失败:', error);
    return createErrorResponse('标记任务完成失败', 500);
  }
}
