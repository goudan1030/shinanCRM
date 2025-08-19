import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { executeQuery } from '@/lib/database-netlify';
import { logger } from '@/lib/logger';
import { sendAnnouncementPush } from '@/lib/push-service';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    if (user.role < 3) { // 需要管理员权限
      return NextResponse.json(
        { success: false, message: '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, content, target_users } = body;

    // 验证必填字段
    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 记录推送日志
    const logQuery = `
      INSERT INTO push_logs (type, title, content, target_users, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const targetUsersJson = target_users ? JSON.stringify(target_users) : null;
    
    await executeQuery(logQuery, [
      'announcement',
      title,
      content,
      targetUsersJson,
      user.id
    ]);

    // 调用实际的推送服务
    const pushResult = await sendAnnouncementPush(target_users, title, content);

    logger.info('公告推送完成', {
      user_id: user.id,
      title,
      target_users: target_users || 'all',
      sent_count: pushResult.sentCount,
      failed_count: pushResult.failedCount
    });

    return NextResponse.json(pushResult, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    logger.error('公告推送失败', { error: error instanceof Error ? error.message : String(error) });
    
    return NextResponse.json(
      { success: false, message: '推送失败，请稍后重试' },
      { status: 500 }
    );
  }
}
